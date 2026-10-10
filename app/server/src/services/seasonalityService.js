'use strict';

/**
 * Financial-year seasonality: which calendar patterns repeat almost every year?
 *
 * Everything is computed from DAILY bars (SQL-collapsed from the 1-min store,
 * IST dates) and grouped by Indian financial year (Apr 1 → Mar 31). A pattern
 * is only interesting here if it held in MOST years, so every stat carries its
 * consistency (in how many FYs did it point the same way), not just averages —
 * an average one crazy year can fake, a 9-of-11-years hit rate cannot.
 *
 * Served cached: the underlying data changes once per trading day.
 */

const db = require('../models');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];   // Apr..Mar
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const cache = new Map();   // symbol -> { at, data }
const CACHE_MS = 60 * 60 * 1000;

// The consistency bar, per the desk rule: a month is a pattern only if it
// closed the same colour in at least 7 of 10 analysed years (70%), with a
// minimum of 6 years of history. Below that it is noise, not seasonality.
const PATTERN_PCT = 70;
const MIN_YEARS = 6;

// Back-of-mind theory: WHY money tends to behave this way in these months.
// These are the commonly offered flow/behaviour explanations, not proofs —
// the numbers earn the pattern, the story only makes it memorable.
const MONTH_THEORY = {
  1:  'FIIs book profits ahead of the Union Budget (Feb 1) and reset country allocations at the new calendar year; hedging demand rises into the event.',
  2:  'Budget event risk: positions stay hedged into Feb 1 and unwinds are sold into; historically the announcement disappoints more often than it delights.',
  3:  'FY-end: advance tax outflows drain liquidity and institutions window-dress books, but late-March sees fresh-FY pre-positioning start.',
  4:  'New financial year: fresh institutional allocations deploy, mutual-fund targets reset, and post-budget clarity lets sidelined money commit.',
  7:  'Q1 earnings season lands with monsoon visibility — two of the year\'s biggest uncertainties resolve at once, and FII flows have historically followed.',
  9:  'Advance-tax outflows again plus the global "September effect" — worldwide, it is equities\' statistically weakest month.',
  10: 'Festive-season demand (Diwali quarter) is India\'s strongest consumption window, and Q2 earnings usually confirm it.',
  12: 'The global "Santa rally": fund managers square shorts into year-end books, volumes thin, and drift turns upward.',
};

async function dailyBars(symbol) {
  const [rows] = await db.sequelize.query(`
    select (to_timestamp(time) at time zone 'Asia/Kolkata')::date as d,
           (array_agg(open  order by time))[1]      as open,
           max(high)                                 as high,
           min(low)                                  as low,
           (array_agg(close order by time desc))[1] as close,
           count(*)                                  as mins
    from index_candles
    where symbol = :symbol
    group by d
    having count(*) >= 60          -- guard against half-captured days
    order by d`, { replacements: { symbol } });
  return rows.map(r => ({
    date: String(r.d).slice(0, 10),
    open: +r.open, high: +r.high, low: +r.low, close: +r.close,
  }));
}

function fyOf(dateStr) {
  const y = +dateStr.slice(0, 4), m = +dateStr.slice(5, 7);
  const start = m >= 4 ? y : y - 1;
  return `FY${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

const pct = (x, dp = 2) => +(x * 100).toFixed(dp);

function computeFromDaily(days) {
  // daily close-to-close returns (index 0 has none)
  for (let i = 1; i < days.length; i++) days[i].ret = days[i].close / days[i - 1].close - 1;
  const ret = days.slice(1);

  // ── FY × month matrix (month return = last close vs previous month's last close)
  const monthLast = new Map();   // 'YYYY-MM' -> last close
  const monthKeys = [];
  for (const d of days) {
    const k = d.date.slice(0, 7);
    if (!monthLast.has(k)) monthKeys.push(k);
    monthLast.set(k, d.close);
  }
  const monthRet = new Map();    // 'YYYY-MM' -> return
  for (let i = 1; i < monthKeys.length; i++) {
    monthRet.set(monthKeys[i], monthLast.get(monthKeys[i]) / monthLast.get(monthKeys[i - 1]) - 1);
  }
  const fyRows = new Map();      // fy -> { fy, months: {4: r, ...}, total }
  for (const [k, r] of monthRet) {
    const m = +k.slice(5, 7);
    const fy = fyOf(`${k}-15`);
    let row = fyRows.get(fy);
    if (!row) { row = { fy, months: {}, total: 1 }; fyRows.set(fy, row); }
    row.months[m] = pct(r);
    row.total *= 1 + r;
  }
  const matrix = [...fyRows.values()].map(r => ({
    fy: r.fy,
    months: FY_MONTH_ORDER.map(m => r.months[m] ?? null),
    totalPct: pct(r.total - 1, 1),
  }));

  // ── calendar-month consistency across years
  const byMonth = FY_MONTH_ORDER.map(m => {
    const rets = [];
    for (const [k, r] of monthRet) if (+k.slice(5, 7) === m) rets.push(r);
    const up = rets.filter(r => r > 0).length;
    const avg = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
    const sorted = [...rets].sort((a, b) => a - b);
    const upPct = rets.length ? Math.round(100 * up / rets.length) : null;
    const qualifies = rets.length >= MIN_YEARS && (upPct >= PATTERN_PCT || upPct <= 100 - PATTERN_PCT);
    return {
      month: MONTH_NAMES[m - 1], m,
      years: rets.length, up, upPct,
      avgPct: pct(avg), medianPct: rets.length ? pct(sorted[Math.floor(sorted.length / 2)]) : null,
      bestPct: rets.length ? pct(Math.max(...rets)) : null,
      worstPct: rets.length ? pct(Math.min(...rets)) : null,
      qualifies,
      tilt: qualifies ? (upPct >= PATTERN_PCT ? 1 : -1) : 0,
      theory: qualifies ? (MONTH_THEORY[m] ?? null) : null,
    };
  });

  // ── day-of-week: overall + per-FY consistency
  const dowAll = new Map(), dowFy = new Map();
  for (const d of ret) {
    const dow = new Date(d.date + 'T00:00:00Z').getUTCDay();
    (dowAll.get(dow) ?? dowAll.set(dow, []).get(dow)).push(d.ret);
    const fk = `${fyOf(d.date)}|${dow}`;
    dowFy.set(fk, (dowFy.get(fk) ?? 0) + d.ret);
  }
  const fyList = [...fyRows.keys()];
  const byDow = [1, 2, 3, 4, 5].map(dow => {
    const rets = dowAll.get(dow) ?? [];
    const avg = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
    const up = rets.filter(r => r > 0).length;
    const fyPos = fyList.filter(fy => (dowFy.get(`${fy}|${dow}`) ?? 0) > 0).length;
    return {
      day: DOW_NAMES[dow], n: rets.length,
      avgBps: +(avg * 10000).toFixed(1),
      upPct: rets.length ? Math.round(100 * up / rets.length) : null,
      fyPositive: `${fyPos}/${fyList.length}`,
    };
  });

  // ── turn-of-month (last 2 + first 3 trading days) vs the rest
  const tomSet = new Set();
  for (let i = 1; i < days.length; i++) {
    const cm = days[i].date.slice(0, 7);
    const prevM = days[i - 1].date.slice(0, 7);
    if (cm !== prevM) { // first day of a month
      for (let k = 0; k < 3 && i + k < days.length && days[i + k].date.slice(0, 7) === cm; k++) tomSet.add(days[i + k].date);
      for (let k = 1; k <= 2 && i - k >= 1; k++) tomSet.add(days[i - k].date);
    }
  }
  const tom = ret.filter(d => tomSet.has(d.date)), rest = ret.filter(d => !tomSet.has(d.date));
  const avgOf = (a) => a.length ? a.reduce((x, d) => x + d.ret, 0) / a.length : 0;
  const fyTomPos = fyList.filter(fy => tom.filter(d => fyOf(d.date) === fy).reduce((a, d) => a + d.ret, 0) > 0).length;
  const turnOfMonth = {
    tomAvgBps: +(avgOf(tom) * 10000).toFixed(1), tomN: tom.length,
    tomUpPct: tom.length ? Math.round(100 * tom.filter(d => d.ret > 0).length / tom.length) : null,
    restAvgBps: +(avgOf(rest) * 10000).toFixed(1), restN: rest.length,
    restUpPct: rest.length ? Math.round(100 * rest.filter(d => d.ret > 0).length / rest.length) : null,
    fyPositive: `${fyTomPos}/${fyList.length}`,
  };

  // ── FY halves (Apr–Sep vs Oct–Mar)
  const halves = [...fyRows.values()].map(r => {
    const h1 = FY_MONTH_ORDER.slice(0, 6).reduce((a, m) => r.months[m] != null ? a * (1 + r.months[m] / 100) : a, 1);
    const h2 = FY_MONTH_ORDER.slice(6).reduce((a, m) => r.months[m] != null ? a * (1 + r.months[m] / 100) : a, 1);
    return { fy: r.fy, h1Pct: pct(h1 - 1, 1), h2Pct: pct(h2 - 1, 1) };
  });

  // ── auto-detected repeating patterns, strongest first
  const findings = [];
  for (const m of byMonth) {
    if (m.qualifies) {
      const dirUp = m.upPct >= 50;
      findings.push({
        strength: Math.abs(m.upPct - 50) + Math.min(Math.abs(m.avgPct) * 8, 20),
        title: `${m.month} is ${dirUp ? 'bullish' : 'bearish'} ${dirUp ? m.up : m.years - m.up} of ${m.years} years`,
        detail: `Average ${m.avgPct > 0 ? '+' : ''}${m.avgPct}% (median ${m.medianPct > 0 ? '+' : ''}${m.medianPct}%), worst ${m.worstPct}%, best +${m.bestPct}%.`,
        theory: m.theory,
      });
    }
  }
  const bestDow = [...byDow].sort((a, b) => b.avgBps - a.avgBps)[0];
  const worstDow = [...byDow].sort((a, b) => a.avgBps - b.avgBps)[0];
  const dowFyN = (d) => +d.fyPositive.split('/')[0];
  if (bestDow && dowFyN(bestDow) >= fyList.length * 0.7) {
    findings.push({
      strength: 25,
      title: `${bestDow.day} is the strongest day (positive in ${bestDow.fyPositive} FYs)`,
      detail: `Averages ${bestDow.avgBps > 0 ? '+' : ''}${bestDow.avgBps} bps/day across ${bestDow.n} sessions, ${bestDow.upPct}% up days.`,
    });
  }
  if (worstDow && fyList.length - dowFyN(worstDow) >= fyList.length * 0.7) {
    findings.push({
      strength: 25,
      title: `${worstDow.day} is the weakest day (negative in ${fyList.length - dowFyN(worstDow)}/${fyList.length} FYs)`,
      detail: `Averages ${worstDow.avgBps} bps/day across ${worstDow.n} sessions, ${worstDow.upPct}% up days.`,
    });
  }
  if (turnOfMonth.tomAvgBps > 2 * Math.max(turnOfMonth.restAvgBps, 0.1)) {
    findings.push({
      strength: 20 + Math.min(turnOfMonth.tomAvgBps, 20),
      title: `Turn-of-month drift (positive in ${turnOfMonth.fyPositive} FYs)`,
      detail: `Last 2 + first 3 trading days of a month average +${turnOfMonth.tomAvgBps} bps/day vs ${turnOfMonth.restAvgBps > 0 ? '+' : ''}${turnOfMonth.restAvgBps} bps on all other days.`,
    });
  }
  findings.sort((a, b) => b.strength - a.strength);

  // month -> +1 / -1 for the months that clear the bar (the tradeable tilt)
  const seasonalTilt = {};
  for (const m of byMonth) if (m.tilt) seasonalTilt[m.m] = m.tilt;

  return {
    range: { from: days[0].date, to: days[days.length - 1].date, tradingDays: days.length },
    fyMonthOrder: FY_MONTH_ORDER.map(m => MONTH_NAMES[m - 1]),
    matrix, byMonth, byDow, turnOfMonth, halves, seasonalTilt,
    patternBar: { pct: PATTERN_PCT, minYears: MIN_YEARS },
    findings: findings.slice(0, 8),
  };
}

/**
 * Lookahead-free tilt map: which months cleared the bar using ONLY data
 * strictly before `beforeDate`. This is what a backtest starting at
 * `beforeDate` is allowed to have known on its first day.
 */
async function getSeasonalTilt(symbol = 'NIFTY', beforeDate = null) {
  let days = await dailyBars(symbol);
  if (beforeDate) days = days.filter(d => d.date < beforeDate);
  if (days.length < 200) return {};
  return computeFromDaily(days).seasonalTilt;
}

async function hourlyPattern(symbol) {
  // per half-hour bucket: average of per-day compounded bucket returns + up-rate
  const [rows] = await db.sequelize.query(`
    with m as (
      select (to_timestamp(time) at time zone 'Asia/Kolkata')::date as d,
             floor((extract(hour from to_timestamp(time) at time zone 'Asia/Kolkata') * 60
                  + extract(minute from to_timestamp(time) at time zone 'Asia/Kolkata') - 555) / 30) as bucket,
             ln(close / open) as lr
      from index_candles where symbol = :symbol and close > 0 and open > 0
    ), daily as (
      select d, bucket, sum(lr) as blr from m where bucket between 0 and 12 group by d, bucket
    )
    select bucket, count(*) as n, avg(blr) as avg_lr,
           avg(case when blr > 0 then 1.0 else 0.0 end) as up
    from daily group by bucket order by bucket`, { replacements: { symbol } });
  return rows.map(r => {
    const startMin = 555 + r.bucket * 30;
    const label = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
    return { window: label, n: +r.n, avgBps: +((Math.exp(+r.avg_lr) - 1) * 10000).toFixed(1), upPct: Math.round(100 * +r.up) };
  });
}

async function getSeasonality(symbol = 'NIFTY') {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const days = await dailyBars(symbol);
  if (days.length < 200) throw new Error(`Only ${days.length} daily bars for ${symbol} — backfill index candles first`);
  const data = computeFromDaily(days);
  data.symbol = symbol;
  data.hourly = await hourlyPattern(symbol);
  cache.set(symbol, { at: Date.now(), data });
  return data;
}

// ── Live switch: apply the tilt to Method 2's running score ────────────────
// Persisted in app_settings; OFF by default. When on, qualifying months nudge
// the live net score by W_SEASON points (~1% of conviction on the ±95 scale) —
// a back-of-mind lean, never a signal.
const SWITCH_KEY = 'seasonal_tilt_enabled';
const W_SEASON = 2;
let liveTiltCache = null;   // { at, state }

async function liveTiltState(symbol = 'NIFTY') {
  if (liveTiltCache && Date.now() - liveTiltCache.at < 10 * 60 * 1000) return liveTiltCache.state;
  const { AppSetting } = require('../models');
  const row = await AppSetting.findByPk(SWITCH_KEY);
  const enabled = row?.value?.enabled === true;
  const months = await getSeasonalTilt(symbol);
  const m = new Date(Date.now() + 19800 * 1000).getUTCMonth() + 1;
  const state = {
    enabled, wSeason: W_SEASON, months,
    currentMonth: MONTH_NAMES[m - 1],
    currentTilt: months[m] ?? 0,
    nudge: enabled ? (months[m] ?? 0) * W_SEASON : 0,
  };
  liveTiltCache = { at: Date.now(), state };
  return state;
}

async function setTiltEnabled(enabled) {
  const { AppSetting } = require('../models');
  await AppSetting.upsert({ key: SWITCH_KEY, value: { enabled: enabled === true } });
  liveTiltCache = null;
  return liveTiltState();
}

module.exports = { getSeasonality, getSeasonalTilt, liveTiltState, setTiltEnabled };
