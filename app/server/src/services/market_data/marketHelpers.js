'use strict';

const DEFAULT_RSI_DEAD_ZONE_POINTS = 2;
const DEFAULT_VWAP_DEAD_ZONE_PCT = 0.001;

function getNumericEnv(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue?.trim()) { return fallback; }
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function getRsiDeadZonePoints() {
  return getNumericEnv('SIGNAL_RSI_DEAD_ZONE_POINTS', DEFAULT_RSI_DEAD_ZONE_POINTS);
}

function getVwapDeadZonePct() {
  return getNumericEnv('SIGNAL_VWAP_DEAD_ZONE_PCT', DEFAULT_VWAP_DEAD_ZONE_PCT);
}

function evaluateRsiDeadZone(rsi) {
  const threshold = getRsiDeadZonePoints();
  if (rsi == null || Number.isNaN(rsi)) {
    return { direction: 'neutral', inDeadZone: true, threshold, delta: null };
  }
  const delta = rsi - 50;
  if (Math.abs(delta) <= threshold) {
    return { direction: 'neutral', inDeadZone: true, threshold, delta };
  }
  return { direction: delta > 0 ? 'bullish' : 'bearish', inDeadZone: false, threshold, delta };
}

function evaluateVwapDeadZone(price, vwap) {
  const thresholdPct = getVwapDeadZonePct();
  if (price == null || vwap == null || Number.isNaN(price) || Number.isNaN(vwap) || price <= 0) {
    return { direction: 'neutral', inDeadZone: true, threshold: thresholdPct, delta: null };
  }
  const thresholdPoints = price * thresholdPct;
  const delta = price - vwap;
  if (Math.abs(delta) <= thresholdPoints) {
    return { direction: 'neutral', inDeadZone: true, threshold: thresholdPoints, delta };
  }
  return { direction: delta > 0 ? 'bullish' : 'bearish', inDeadZone: false, threshold: thresholdPoints, delta };
}

function getBoolEnv(name, fallback) {
  const rawValue = process.env[name]?.trim().toLowerCase();
  if (!rawValue) return fallback;
  return rawValue !== 'false' && rawValue !== '0' && rawValue !== 'off' && rawValue !== 'no';
}

function toIst(date) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return { hours: istDate.getUTCHours(), minutes: istDate.getUTCMinutes(), dayOfWeek: istDate.getUTCDay() };
}

function istTimeInMinutes(hours, minutes) {
  return hours * 60 + minutes;
}

function evaluateMarketSession(now) {
  const currentTime = now ?? new Date();
  const { hours, minutes, dayOfWeek } = toIst(currentTime);
  const timeMin = istTimeInMinutes(hours, minutes);
  const blockOpening = getBoolEnv('SESSION_BLOCK_OPENING', true);
  const blockLunch = getBoolEnv('SESSION_BLOCK_LUNCH', true);
  const blockClosing = getBoolEnv('SESSION_BLOCK_CLOSING', true);
  const expiryDaySpecial = getBoolEnv('SESSION_EXPIRY_DAY_SPECIAL', true);
  // NIFTY weeklies expire on TUESDAY now (the Thursday assumption made this
  // flag lie on two days a week)
  const isExpiryDay = expiryDaySpecial && dayOfWeek === 2;
  const marketOpen = istTimeInMinutes(9, 15);
  const openingBlockEnd = istTimeInMinutes(9, 30);
  const lunchStart = istTimeInMinutes(12, 30);
  const lunchEnd = istTimeInMinutes(13, 30);
  const closingBlockStart = isExpiryDay ? istTimeInMinutes(15, 0) : istTimeInMinutes(15, 15);
  const marketClose = istTimeInMinutes(15, 30);
  if (timeMin < marketOpen) return { allowed: false, reason: 'Pre-market hours (before 9:15 AM IST)', session: 'pre-market', isExpiryDay };
  if (timeMin < openingBlockEnd && blockOpening) return { allowed: false, reason: 'Opening 15-min volatility trap (9:15-9:30 AM IST)', session: 'opening-block', isExpiryDay };
  if (timeMin >= marketClose) return { allowed: false, reason: 'Post-market hours (after 3:30 PM IST)', session: 'post-market', isExpiryDay };
  if (timeMin >= closingBlockStart && blockClosing) {
    const label = isExpiryDay ? 'Expiry day closing block (after 3:00 PM IST)' : 'Closing 15-min block (after 3:15 PM IST)';
    return { allowed: false, reason: label, session: 'closing-block', isExpiryDay };
  }
  if (timeMin >= lunchStart && timeMin < lunchEnd && blockLunch) return { allowed: false, reason: 'Lunch hour dead zone (12:30-1:30 PM IST)', session: 'lunch-block', isExpiryDay };
  if (timeMin < istTimeInMinutes(12, 30)) return { allowed: true, reason: 'Morning session active', session: 'morning', isExpiryDay };
  return { allowed: true, reason: 'Afternoon session active', session: 'afternoon', isExpiryDay };
}

module.exports = {
  getRsiDeadZonePoints,
  getVwapDeadZonePct,
  evaluateRsiDeadZone,
  evaluateVwapDeadZone,
  evaluateMarketSession,
};
