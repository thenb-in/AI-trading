'use strict';

/**
 * Method 1's swing-S/R breakout, read live — the trigger half of the
 * "prime call" (breakout AND Method 2 conviction agreeing), the highest
 * quality signal class this project has measured: PF 1.40, 50.9% win,
 * drawdown −28% over 4 years, at a third of the trade count.
 *
 * Same machinery as the chart backtest: swing highs/lows over the window,
 * clustered into levels; the nearest level beyond price arms a trigger
 * (res ×1.001 up / sup ×0.999 down); the last two bars crossing it = fired.
 */

function buildSwingLevels(candles, lookback = 3, maxLevels = 8, clusterTol = 0.002) {
  const highs = [], lows = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isHigh = true, isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) highs.push(c.high);
    if (isLow) lows.push(c.low);
  }
  const cluster = (pts, type) => {
    const out = [];
    for (const p of pts.sort((a, b) => a - b)) {
      const last = out[out.length - 1];
      if (last && Math.abs(p - last.price) / last.price < clusterTol) {
        last.price = (last.price * last.n + p) / (last.n + 1); last.n++;
      } else out.push({ price: p, n: 1, type });
    }
    return out.sort((a, b) => b.n - a.n).slice(0, maxLevels);
  };
  return [...cluster(highs, 'resistance'), ...cluster(lows, 'support')];
}

/** candles: oldest→newest bars (5-min, >=40). Returns the live breakout read. */
function breakoutState(candles) {
  if (!Array.isArray(candles) || candles.length < 40) return { sig: 0, ready: false };
  const live = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  // levels from the bars BEFORE the ones being tested — no self-confirmation
  const win = candles.slice(Math.max(0, candles.length - 102), candles.length - 2);
  const price = win[win.length - 1].close;
  const levels = buildSwingLevels(win);
  const res = levels.filter(l => l.type === 'resistance' && l.price > price).sort((a, b) => a.price - b.price)[0];
  const sup = levels.filter(l => l.type === 'support' && l.price < price).sort((a, b) => b.price - a.price)[0];
  const buyTrig = res ? +(res.price * 1.001).toFixed(2) : null;
  const sellTrig = sup ? +(sup.price * 0.999).toFixed(2) : null;
  let sig = 0;
  if (buyTrig != null && (live.high >= buyTrig || prev.high >= buyTrig)) sig = 1;
  else if (sellTrig != null && (live.low <= sellTrig || prev.low <= sellTrig)) sig = -1;
  return {
    sig, ready: true,
    buyTrig, sellTrig,
    nearestRes: res ? +res.price.toFixed(2) : null,
    nearestSup: sup ? +sup.price.toFixed(2) : null,
  };
}

/** 1-min candles → 5-min bars (IST bucketing), for the backtest signal. */
function resample5(oneMin) {
  const out = [];
  let cur = null;
  for (const c of oneMin) {
    const bucket = Math.floor((c.time + 19800) / 300);
    if (!cur || cur.bucket !== bucket) {
      if (cur) out.push(cur);
      cur = { bucket, time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
    } else {
      cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low); cur.close = c.close;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Backtest form of the breakout signal: for every 1-min candle, +1/-1 while a
 * swing-S/R breakout (5-min structure, 100-bar window) fired within the last
 * VALID_MIN minutes, else 0. This is the entry trigger Method 3 requires to
 * agree with Method 2's conviction.
 */
function buildBreakoutSignal(candles, VALID_MIN = 5, WINDOW = 100) {
  const bars = resample5(candles);
  const sig = new Int8Array(candles.length);
  let b = 0, buyTrig = null, sellTrig = null, lastFire = -1e9, lastDir = 0;
  for (let i = 0; i < candles.length; i++) {
    const t = candles[i].time;
    while (b + 1 < bars.length && bars[b + 1].time <= t) {
      b++;
      if (b >= WINDOW) {
        const win = bars.slice(b - WINDOW, b);
        const price = win[win.length - 1].close;
        const levels = buildSwingLevels(win);
        const res = levels.filter(l => l.type === 'resistance' && l.price > price).sort((a, c) => a.price - c.price)[0];
        const sup = levels.filter(l => l.type === 'support' && l.price < price).sort((a, c) => c.price - a.price)[0];
        buyTrig = res ? res.price * 1.001 : null;
        sellTrig = sup ? sup.price * 0.999 : null;
      }
    }
    if (buyTrig != null && candles[i].high >= buyTrig) { lastFire = t; lastDir = 1; buyTrig = null; }
    else if (sellTrig != null && candles[i].low <= sellTrig) { lastFire = t; lastDir = -1; sellTrig = null; }
    sig[i] = (t - lastFire) <= VALID_MIN * 60 ? lastDir : 0;
  }
  return sig;
}

module.exports = { breakoutState, buildSwingLevels, buildBreakoutSignal };
