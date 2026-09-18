const logger = require('../../logger');
const { HTTP_STATUS_TOO_MANY_REQUESTS } = require('../constants/http');
const {
  RATE_LIMIT_SWEEP_THRESHOLD,
  RATE_LIMIT_SWEEP_INTERVAL_MS,
  RATE_LIMIT_MAX_KEYS,
  RATE_LIMIT_MAX_KEY_LENGTH
} = require('../constants/rateLimits');
const { sendError } = require('../utils/response');

/**
 * A budget of attempts per key per window, for the endpoints anyone can reach
 * without signing in.
 *
 * Counting happens after the response, so a limiter can spend the budget on
 * failures alone (`countWhen`) — signing in correctly should never bring
 * someone closer to being locked out, and a wrong password is the only thing
 * that tells a guesser anything.
 *
 * The counts live in this process. On a single-process install — which is what
 * this framework deploys — that is the whole picture; behind several processes
 * each holds its own budget, so the effective limit multiplies by the number of
 * them. That is a weaker guarantee, not a broken one: a guesser still meets a
 * ceiling, and the alternative (a shared store) is a dependency this does not
 * otherwise need.
 *
 * What it must never do is grow without end. A key is built from what the
 * caller sent, so how many keys there are and how long each one is are the
 * caller's choice; both are capped here, and past the cap the oldest entries
 * are dropped. Dropping one forgives whatever it had counted, which is the
 * price of not letting a flood of invented usernames become a flood of memory.
 */
const buckets = new Map();
let lastSweepAt = 0;
let lastCeilingLogAt = 0;

/**
 * Everything that has run out, dropped in one pass over the map.
 *
 * That pass costs what the map is big, so it happens on a timer rather than on
 * a size: inside a 15-minute window nothing has expired yet, and sweeping on
 * every request past a size would walk the whole map to delete nothing, making
 * each request cost more than the last.
 */
const sweepExpired = (now) => {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
};

/**
 * The oldest entries, dropped until the map is back under its ceiling.
 *
 * Entries go in when first spent and are never re-inserted, so the front of
 * the map is the oldest and — every window of one limiter being the same
 * length — the closest to expiring. Deleting from the front costs what is
 * deleted, not what is stored, so this can run on every request that needs it.
 *
 * Dropping an entry forgives what it had counted. That is the deliberate
 * trade: a flood of invented keys loses us some counting, rather than losing
 * us the process.
 */
const evictOldest = () => {
  if (buckets.size <= RATE_LIMIT_MAX_KEYS) {
    return;
  }

  const before = buckets.size;
  for (const key of buckets.keys()) {
    if (buckets.size <= RATE_LIMIT_MAX_KEYS) {
      break;
    }
    buckets.delete(key);
  }
  if (Date.now() - lastCeilingLogAt >= RATE_LIMIT_SWEEP_INTERVAL_MS) {
    lastCeilingLogAt = Date.now();
    logger.warn(`Rate limit map hit its ceiling of ${RATE_LIMIT_MAX_KEYS} keys (was ${before}) — dropping the oldest, so some counting is being forgiven`);
  }
};

/** Expiry on a timer; the ceiling the moment it is crossed. */
const sweepIfDue = (now) => {
  if (buckets.size > RATE_LIMIT_SWEEP_THRESHOLD && now - lastSweepAt >= RATE_LIMIT_SWEEP_INTERVAL_MS) {
    lastSweepAt = now;
    sweepExpired(now);
  }
  evictOldest();
};

const spend = (key, windowMs) => {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs, logged: false });
    return;
  }
  bucket.count += 1;
};

/** Where the request came from, as far as the proxy in front of us reports it. */
const sourceOf = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

/**
 * @param {object} options
 * @param {string} options.name          what is being limited, for the key and the log
 * @param {number} options.windowMs      how long a budget lasts
 * @param {number} options.max           attempts allowed in that window
 * @param {function} options.keyOf       what to count against: an account, an address
 * @param {function} [options.countWhen] which responses spend the budget (default: all)
 * @param {string} options.subject       what the caller is told they did too much of
 */
const rateLimit = ({ name, windowMs, max, keyOf, countWhen = null, subject }) => (req, res, next) => {
  // Truncated because the caller chose it: this runs before any validator, so
  // a megabyte of username would otherwise be a megabyte of map key.
  const key = `${name}:${String(keyOf(req)).slice(0, RATE_LIMIT_MAX_KEY_LENGTH)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (bucket && bucket.resetAt > now && bucket.count >= max) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    res.set('Retry-After', String(seconds));
    // Once per budget, not once per refusal. Someone being refused is someone
    // sending a lot of requests, and a line each would let them write our logs.
    if (!bucket.logged) {
      bucket.logged = true;
      logger.warn(`Rate limit reached for ${key} from ${sourceOf(req)}: ${bucket.count} of ${max} in ${windowMs}ms — refusing until it resets`);
    }
    return sendError(res, {
      statusCode: HTTP_STATUS_TOO_MANY_REQUESTS,
      message: `Too many ${subject}. Try again in ${seconds} seconds.`
    });
  }

  sweepIfDue(now);

  // After the answer, so the outcome decides whether it counts.
  res.on('finish', () => {
    if (!countWhen || countWhen(res.statusCode)) {
      spend(key, windowMs);
    }
  });

  return next();
};

/** A refusal: the credentials were wrong, or the request was malformed. */
const isFailure = (statusCode) => statusCode >= 400;

/** Everything this process is currently counting — for tests and support. */
const rateLimitState = () => ({ keys: buckets.size, ceiling: RATE_LIMIT_MAX_KEYS });

/** Forget every budget. Only for tests; nothing in the app calls it. */
const resetRateLimits = () => {
  buckets.clear();
  lastSweepAt = 0;
  lastCeilingLogAt = 0;
};

module.exports = { rateLimit, isFailure, sourceOf, rateLimitState, resetRateLimits };
