const { fetchTrackedHeadsFromExternalServer } = require('../../interfaces/wallet/activityInterface');
const logger = require('../../logger');
const { TRACKED_HEADS_TTL_MS } = require('../constants/activity');

// Which of this app's heads the wallet wants, remembered for a few minutes.
//
// Every logged CRUD action asks this question, so it cannot be an HTTP call
// each time — that would put a round trip to the wallet in front of every save
// in the application. The answer changes only when somebody prices or caps a
// head, which is a thing that happens on a Tuesday afternoon, not per request.
//
// One entry per company: the wallet's answer is per (app, company), because
// charges belong to an application and caps belong to a company.
const cache = new Map();

/** A cached answer that has not aged out. */
function fresh(companyId) {
  const entry = cache.get(companyId ?? null);
  return entry && Date.now() - entry.at < TRACKED_HEADS_TTL_MS ? entry.heads : null;
}

const walletHeadsService = {
  /**
   * The wallet's head list for a company, or null if it could not be had.
   *
   * Null is not an error to shout about. It means we do not currently know
   * what the wallet wants, and the caller's answer to that is to send
   * everything — see `shouldPush`.
   */
  async trackedHeadsFor(companyId = null) {
    const cached = fresh(companyId);
    if (cached) {
      return cached;
    }

    try {
      const heads = await fetchTrackedHeadsFromExternalServer(companyId);
      cache.set(companyId ?? null, { heads, at: Date.now() });
      logger.info(`Wallet tracks ${heads.length} head(s) for company ${companyId}: ${heads.join(', ')}`);
      return heads;
    } catch (error) {
      logger.warn(`Could not read the wallet's head list for company ${companyId}: ${error.message}`);
      return null;
    }
  },

  /**
   * Is this head worth sending?
   *
   * Fails OPEN on purpose. This filter saves a round trip for heads nobody
   * wants; it is not what decides whether usage is billed. The wallet drops an
   * untracked head itself and answers 200 either way, so an unreachable wallet
   * or a stale cache costs a wasted request, never a lost head. Deciding
   * the other way — silently not sending while we are unsure — would lose the
   * one head that is actually billed on the day the head endpoint is down.
   */
  async shouldPush(head, companyId = null) {
    const heads = await walletHeadsService.trackedHeadsFor(companyId);
    return heads === null || heads.includes(head);
  },

  /** Forget what we know, so the next question re-asks. For tests and for the headbase. */
  forget() {
    cache.clear();
  }
};

module.exports = walletHeadsService;
