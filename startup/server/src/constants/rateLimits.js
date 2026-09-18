/**
 * How often the endpoints anyone can reach without signing in will answer.
 *
 * Only failures count. Someone signing in correctly all day is not the problem;
 * someone guessing is, and they learn nothing from a wrong password except that
 * it was wrong — so the budget is spent on wrong answers alone, and a right one
 * leaves the account's budget untouched.
 *
 * The numbers are set so a person who has genuinely forgotten which password
 * they used can keep trying for a while, while a script working through a word
 * list is stopped in the first few seconds of its run.
 */
const MINUTE_MS = 60 * 1000;

// Signing in: per account, so one account under attack cannot lock out the
// office it shares an address with, and per source, so a script cannot work
// through a list of accounts from one place.
const LOGIN_WINDOW_MS = 15 * MINUTE_MS;
const LOGIN_MAX_FAILURES_PER_ACCOUNT = 10;
const LOGIN_MAX_FAILURES_PER_SOURCE = 50;

// Resetting a password and confirming an authenticator code both prove
// something, so they are guessable in the same way — a 6-digit code especially.
const RESET_WINDOW_MS = 15 * MINUTE_MS;
const RESET_MAX_FAILURES = 10;
const TOTP_WINDOW_MS = 15 * MINUTE_MS;
const TOTP_MAX_FAILURES = 10;

// Signing up and the "is this name taken?" check are how a stranger maps who
// banks here. Generous for someone filling in a form, useless for enumeration.
const SIGNUP_WINDOW_MS = 60 * MINUTE_MS;
const SIGNUP_MAX_FAILURES = 20;
const AVAILABILITY_WINDOW_MS = MINUTE_MS;
const AVAILABILITY_MAX_REQUESTS = 60;

// How many keys may pile up before expired ones are swept, and how often that
// sweep is worth doing. Sweeping on every request past the threshold is what
// looks careful and is not: inside a 15-minute window nothing has expired yet,
// so each sweep walks the whole map and deletes nothing, and the cost of a
// request grows with the number of keys already taken.
const RATE_LIMIT_SWEEP_THRESHOLD = 5000;
const RATE_LIMIT_SWEEP_INTERVAL_MS = 30 * 1000;

// The ceiling on what one process will ever track. A key is whatever the
// caller typed in the username box, so the number of them is the caller's
// choice, not ours — without a ceiling a flood of made-up names is a flood of
// map entries. Past it the oldest entries go; they are the ones closest to
// expiring anyway, since a limiter's windows are all the same length and an
// entry is never re-inserted.
const RATE_LIMIT_MAX_KEYS = 50000;

// A key is built before any validator has seen the request, so the length of
// it is the caller's choice too. Long enough for any real username or address.
const RATE_LIMIT_MAX_KEY_LENGTH = 120;

module.exports = {
  RATE_LIMIT_SWEEP_THRESHOLD,
  RATE_LIMIT_SWEEP_INTERVAL_MS,
  RATE_LIMIT_MAX_KEYS,
  RATE_LIMIT_MAX_KEY_LENGTH,
  LOGIN_WINDOW_MS,
  LOGIN_MAX_FAILURES_PER_ACCOUNT,
  LOGIN_MAX_FAILURES_PER_SOURCE,
  RESET_WINDOW_MS,
  RESET_MAX_FAILURES,
  TOTP_WINDOW_MS,
  TOTP_MAX_FAILURES,
  SIGNUP_WINDOW_MS,
  SIGNUP_MAX_FAILURES,
  AVAILABILITY_WINDOW_MS,
  AVAILABILITY_MAX_REQUESTS
};
