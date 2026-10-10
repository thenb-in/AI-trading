'use strict';

/**
 * Shared option pricing + market-clock math.
 *
 * Extracted so the Method 2 backtest and the scalp engine price options with
 * ONE model. Two private copies of Black-Scholes is how two backtests end up
 * quietly disagreeing about the same trade.
 */

// ---------------------------------------------------------------------------
// IST helpers
// ---------------------------------------------------------------------------
const IST = 19800; // 5.5h in seconds

function istMinutes(unix) {
  return Math.floor(((unix + IST) % 86400) / 60);
}

function isMarketOpen(unix) {
  const m = istMinutes(unix);
  // NSE cash/F&O session: 9:15 to 15:30 IST. This is the hard data window —
  // feeds, recorders and evaluation run the WHOLE session. Entry cutoffs
  // (15:10/15:15) and the 15:20 no-carry force-close are separate, narrower
  // rules layered on top; they buffer exits before the bell, they do not
  // define the market.
  return m >= 9 * 60 + 15 && m < 15 * 60 + 30;
}

function isNearClose(unix) {
  return istMinutes(unix) >= 15 * 60 + 10; // force exit after 15:10
}

// ---------------------------------------------------------------------------
// Black-Scholes
// ---------------------------------------------------------------------------

// Cumulative normal distribution (Hart approximation)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}

function bsPrice(type, S, K, T, sigma, r = 0.065) {
  if (T <= 0) return Math.max(0, type === 'CE' ? S - K : K - S);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === 'CE') return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

/**
 * Implied volatility by bisection: the sigma at which bsPrice reproduces the
 * observed market premium. Returns null when no sigma in (1%, 300%) fits —
 * e.g. a price below intrinsic from a stale quote.
 */
function impliedVol(type, S, K, T, price, tol = 0.01) {
  if (!(price > 0) || !(S > 0) || !(T > 0)) return null;
  let lo = 0.01, hi = 3.0;
  if (bsPrice(type, S, K, T, lo) > price || bsPrice(type, S, K, T, hi) < price) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const p = bsPrice(type, S, K, T, mid);
    if (Math.abs(p - price) < tol) return mid;
    if (p > price) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Black-Scholes delta (CE in (0,1), PE in (-1,0)). */
function bsDelta(type, S, K, T, sigma, r = 0.065) {
  if (!(T > 0) || !(sigma > 0)) return null;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  return type === 'CE' ? normalCDF(d1) : normalCDF(d1) - 1;
}

// ---------------------------------------------------------------------------
// Expiry / strike / symbol helpers
// ---------------------------------------------------------------------------

/**
 * Fraction of a year until the option's expiry Thursday.
 * On Thursday (expiry day) a trader buys NEXT week's expiry — not today's
 * expiring series. On all other days, the nearest upcoming Thursday.
 */
function dteYears(unixTs, entryDayOfWeek) {
  const d   = new Date((unixTs + IST) * 1000);
  const day = entryDayOfWeek !== undefined ? entryDayOfWeek : d.getUTCDay();
  const daysToThur = day === 4 ? 7 : (4 - day + 7) % 7 || 7;
  const secsInDay  = (unixTs + IST) % 86400;
  const daysRemaining = daysToThur - secsInDay / 86400;
  return Math.max(daysRemaining, 0.25) / 365; // min 6 hours
}

/** Nearest-50 ATM strike */
function atmStrike(spot) { return Math.round(spot / 50) * 50; }

// Tradingsymbol matching NSE weekly option format: NIFTY25514XXXCE
// Weekly: NIFTY + YY + single-char-month-code + DD + strike + type
// Monthly (last Thursday of month): NIFTY + YY + MMM + strike + type
const WEEKLY_MON = ['1','2','3','4','5','6','7','8','9','O','N','D'];

function optSymbol(strike, type, unixTs) {
  const K   = strike;
  const d   = new Date((unixTs + IST) * 1000);
  const day = d.getUTCDay();
  const daysToThur = day === 4 ? 7 : (4 - day + 7) % 7 || 7;
  const expDate = new Date(d.getTime() + daysToThur * 86400000);
  const yy  = String(expDate.getUTCFullYear()).slice(2);
  const mon = expDate.getUTCMonth();
  const dd  = String(expDate.getUTCDate()).padStart(2, '0');
  const nextThurDate = new Date(expDate.getTime() + 7 * 86400000);
  const isMonthly = nextThurDate.getUTCMonth() !== mon;
  if (isMonthly) {
    const monStr = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][mon];
    return `NIFTY${yy}${monStr}${K}${type}`;
  }
  return `NIFTY${yy}${WEEKLY_MON[mon]}${dd}${K}${type}`;
}

module.exports = {
  IST,
  istMinutes,
  isMarketOpen,
  isNearClose,
  normalCDF,
  bsPrice,
  impliedVol,
  bsDelta,
  dteYears,
  atmStrike,
  optSymbol,
};
