'use strict';

// Pure option-chain OI analytics — grouping, trend, bias, wall detection and
// the Phase-2 options intelligence pipeline. No model access lives here: every
// function is a pure transform over already-loaded snapshot rows, so it was
// split out of optionSnapshotService to keep that module under the line limit
// while leaving OptionSnapshot model access in exactly one place. The public
// surface is unchanged — optionSnapshotService re-exports all of these.

const logger = require('@startup/logger');

// ============================================================================
// Snapshot grouping utility
// ============================================================================

/**
 * Groups flat snapshot rows by timestamp. Timestamps are sorted ASC numerically.
 */
function groupSnapshotsByTimestamp(snapshots) {
  if (snapshots.length === 0) return { timestamps: [], data: {} };

  const data = {};

  for (const row of snapshots) {
    if (row.timestamp == null) continue;
    const ts = String(row.timestamp);
    if (!data[ts]) data[ts] = [];
    data[ts].push(row);
  }

  const timestamps = Object.keys(data).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  return { timestamps, data };
}

/**
 * Converts a snapshot row array into a Map keyed by `${strike}_${type}` for O(1) lookup.
 */
function createStrikeMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.strike}_${row.type}`;
    if (map.has(key)) {
      logger.warn(`[createStrikeMap] Duplicate key "${key}" at timestamp ${row.timestamp} — overwriting`);
    }
    map.set(key, row);
  }
  return map;
}

/**
 * Calculates OI trend (totalDelta, avgDelta, direction) across the last N snapshots.
 */
function calculateOITrend(groupedData, n = 5) {
  const { timestamps, data } = groupedData;
  if (timestamps.length < 2) return {};

  const window = timestamps.slice(-Math.max(2, n));
  const snapshots = window.map(ts => data[ts]);

  const maps = snapshots.map(rows => createStrikeMap(rows));

  const baseKeys = Array.from(maps[0].keys()).filter(key =>
    maps.every(m => m.has(key)),
  );

  const FLAT_THRESHOLD = 0.005;
  const result = {};

  for (const key of baseKeys) {
    const deltas = [];
    for (let i = 1; i < maps.length; i++) {
      deltas.push(maps[i].get(key).oi - maps[i - 1].get(key).oi);
    }

    const totalDelta = deltas.reduce((sum, d) => sum + d, 0);
    const avgDelta   = totalDelta / deltas.length;
    const startOI    = maps[0].get(key).oi;
    const currRow    = maps[maps.length - 1].get(key);

    let direction;
    if (startOI === 0) {
      direction = totalDelta > 0 ? 'INCREASING' : totalDelta < 0 ? 'DECREASING' : 'FLAT';
    } else {
      const relativeChange = totalDelta / startOI;
      if (relativeChange > FLAT_THRESHOLD)        direction = 'INCREASING';
      else if (relativeChange < -FLAT_THRESHOLD)  direction = 'DECREASING';
      else                                         direction = 'FLAT';
    }

    result[key] = {
      totalDelta,
      avgDelta:   parseFloat(avgDelta.toFixed(2)),
      direction,
      currOI:     currRow.oi,
      ltp:        currRow.ltp,
      snapshots:  deltas.length,
    };
  }

  return result;
}

/**
 * Derives market bias from OI trend data.
 */
function deriveOIBias(trendData, noiseThreshold = 50_000) {
  let totalCE = 0;
  let totalPE = 0;

  for (const [key, entry] of Object.entries(trendData)) {
    if (key.endsWith('_CE')) totalCE += entry.totalDelta;
    else                     totalPE += entry.totalDelta;
  }

  const effectiveCE = Math.abs(totalCE) >= noiseThreshold ? totalCE : 0;
  const effectivePE = Math.abs(totalPE) >= noiseThreshold ? totalPE : 0;

  let bias;

  if (effectiveCE === 0 && effectivePE === 0) {
    bias = 'NEUTRAL';
  } else if (effectiveCE < 0 && effectivePE > 0) {
    bias = 'BULLISH';
  } else if (effectiveCE > 0 && effectivePE < 0) {
    bias = 'BEARISH';
  } else {
    bias = 'NEUTRAL';
  }

  return { totalCE, totalPE, bias };
}

/**
 * Calculates OI delta for each strike+type between two snapshots.
 */
function calculateOIDeltas(prevRows, currRows) {
  const prevMap = createStrikeMap(prevRows);
  const result = {};

  for (const curr of currRows) {
    const key = `${curr.strike}_${curr.type}`;
    const prev = prevMap.get(key);
    if (!prev) continue;

    result[key] = {
      deltaOI: curr.oi - prev.oi,
      currOI:  curr.oi,
      prevOI:  prev.oi,
      ltp:     curr.ltp,
    };
  }

  return result;
}

/**
 * Returns the last two snapshots (prev, curr) from grouped data.
 */
function getLastTwoSnapshots(groupedData) {
  const { timestamps, data } = groupedData;

  if (timestamps.length === 0) return null;
  if (timestamps.length === 1) {
    return { prev: [], curr: data[timestamps[0]] };
  }

  const curr = data[timestamps[timestamps.length - 1]];
  const prev = data[timestamps[timestamps.length - 2]];

  return { prev, curr };
}

// ============================================================================
// OI Wall Detection
// ============================================================================

/**
 * Detects OI-based support (PE wall) and resistance (CE wall) levels.
 */
function detectOIWalls(rows, spotPrice, options = {}) {
  const { strikeRangePct = 0.03, topN = 3 } = options;

  const empty = { resistance: [], support: [] };
  if (!rows.length || spotPrice <= 0) return empty;

  const lower = spotPrice * (1 - strikeRangePct);
  const upper = spotPrice * (1 + strikeRangePct);

  const ceOI = new Map();
  const peOI = new Map();

  for (const row of rows) {
    if (row.strike == null || row.oi == null || row.oi <= 0) continue;
    if (row.strike < lower || row.strike > upper) continue;

    if (row.type === 'CE') {
      ceOI.set(row.strike, (ceOI.get(row.strike) ?? 0) + row.oi);
    } else if (row.type === 'PE') {
      peOI.set(row.strike, (peOI.get(row.strike) ?? 0) + row.oi);
    }
  }

  if (ceOI.size === 0 && peOI.size === 0) return empty;

  function buildLevels(oiMap, n) {
    if (oiMap.size === 0) return [];

    const entries = Array.from(oiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);

    const totalOI = Array.from(oiMap.values()).reduce((s, v) => s + v, 0);

    return entries.map(([strike, oi]) => ({
      strike,
      oi,
      strength: totalOI > 0 ? parseFloat((oi / totalOI).toFixed(4)) : 0,
    }));
  }

  return {
    resistance: buildLevels(ceOI, topN),
    support:    buildLevels(peOI, topN),
  };
}

// ============================================================================
// Phase 2 — Options Intelligence Engine
// ============================================================================

const DEFAULT_CONFIG = {
  lookback:       5,
  strikeRangePct: 0.03,
  oiThreshold:    0.0005,
  minOI:          1000,
  topN:           3,
};

function resolveConfig(config = {}) {
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Enhanced OI bias with normalization and strength score.
 */
function deriveOIBiasV2(oiTrend, spotPrice, config = {}) {
  const { strikeRangePct, oiThreshold, minOI } = resolveConfig(config);

  const lower = spotPrice * (1 - strikeRangePct);
  const upper = spotPrice * (1 + strikeRangePct);

  let totalCE = 0, totalCE_OI = 0;
  let totalPE = 0, totalPE_OI = 0;

  for (const [key, entry] of Object.entries(oiTrend)) {
    const underscoreIdx = key.lastIndexOf('_');
    const strike = Number(key.slice(0, underscoreIdx));
    const type   = key.slice(underscoreIdx + 1);

    if (isNaN(strike)) continue;
    if (strike < lower || strike > upper) continue;
    if (entry.currOI < minOI) continue;

    if (entry.currOI > 0) {
      const relChange = Math.abs(entry.totalDelta) / entry.currOI;
      if (relChange < oiThreshold) continue;
    }

    if (type === 'CE') {
      totalCE    += entry.totalDelta;
      totalCE_OI += entry.currOI;
    } else {
      totalPE    += entry.totalDelta;
      totalPE_OI += entry.currOI;
    }
  }

  const ceStrength = totalCE_OI > 0 ? parseFloat((totalCE / totalCE_OI).toFixed(6)) : 0;
  const peStrength = totalPE_OI > 0 ? parseFloat((totalPE / totalPE_OI).toFixed(6)) : 0;

  const strength = parseFloat(Math.min(1, Math.abs(ceStrength - peStrength)).toFixed(4));

  let bias;
  if (ceStrength < 0 && peStrength > 0)      bias = 'BULLISH';
  else if (ceStrength > 0 && peStrength < 0) bias = 'BEARISH';
  else                                        bias = 'NEUTRAL';

  return { bias, strength, ceStrength, peStrength, totalCE, totalPE };
}

/**
 * Enhanced OI wall detection with distance, nearest levels, and pressure ratio.
 */
function detectOIWallsV2(rows, spotPrice, config = {}) {
  const { strikeRangePct, minOI, topN } = resolveConfig(config);

  const empty = {
    resistance: [], support: [],
    nearestResistance: null, nearestSupport: null,
    pressure: 0.5,
  };

  if (!rows.length || spotPrice <= 0) return empty;

  const lower = spotPrice * (1 - strikeRangePct);
  const upper = spotPrice * (1 + strikeRangePct);

  const ceOI = new Map();
  const peOI = new Map();

  for (const row of rows) {
    if (row.strike == null || row.oi == null || row.oi < minOI) continue;
    if (row.strike < lower || row.strike > upper) continue;

    if (row.type === 'CE') {
      ceOI.set(row.strike, (ceOI.get(row.strike) ?? 0) + row.oi);
    } else if (row.type === 'PE') {
      peOI.set(row.strike, (peOI.get(row.strike) ?? 0) + row.oi);
    }
  }

  if (ceOI.size === 0 && peOI.size === 0) return empty;

  const totalCE_OI = Array.from(ceOI.values()).reduce((s, v) => s + v, 0);
  const totalPE_OI = Array.from(peOI.values()).reduce((s, v) => s + v, 0);
  const totalAll   = totalCE_OI + totalPE_OI;
  const pressure   = totalAll > 0 ? parseFloat((totalCE_OI / totalAll).toFixed(4)) : 0.5;

  function buildLevels(oiMap, totalOI, n) {
    if (oiMap.size === 0) return [];
    return Array.from(oiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([strike, oi]) => ({
        strike,
        oi,
        strength: totalOI > 0 ? parseFloat((oi / totalOI).toFixed(4)) : 0,
        distance: parseFloat(((strike - spotPrice) / spotPrice).toFixed(6)),
      }));
  }

  const resistance = buildLevels(ceOI, totalCE_OI, topN);
  const support    = buildLevels(peOI, totalPE_OI, topN);

  const nearestResistance = resistance.length > 0
    ? resistance.reduce((closest, lvl) =>
        Math.abs(lvl.distance) < Math.abs(closest.distance) ? lvl : closest)
    : null;

  const nearestSupport = support.length > 0
    ? support.reduce((closest, lvl) =>
        Math.abs(lvl.distance) < Math.abs(closest.distance) ? lvl : closest)
    : null;

  return { resistance, support, nearestResistance, nearestSupport, pressure };
}

/**
 * Identifies institutional / big player activity from OI trend data.
 */
function detectBigPlayers(oiTrend, spotPrice, config = {}) {
  const { strikeRangePct, minOI, topN } = resolveConfig(config);

  const lower = spotPrice * (1 - strikeRangePct);
  const upper = spotPrice * (1 + strikeRangePct);

  const ceEntries = [];
  const peEntries = [];

  for (const [key, entry] of Object.entries(oiTrend)) {
    const underscoreIdx = key.lastIndexOf('_');
    const strike = Number(key.slice(0, underscoreIdx));
    const type   = key.slice(underscoreIdx + 1);

    if (isNaN(strike)) continue;
    if (strike < lower || strike > upper) continue;
    if (entry.currOI < minOI) continue;
    if (entry.totalDelta <= 0) continue;

    const item = { strike, delta: entry.totalDelta, oi: entry.currOI };
    if (type === 'CE') ceEntries.push(item);
    else               peEntries.push(item);
  }

  const sortByDeltaDesc = (a, b) => b.delta - a.delta;

  return {
    bearishStrikes: ceEntries.sort(sortByDeltaDesc).slice(0, topN),
    bullishStrikes: peEntries.sort(sortByDeltaDesc).slice(0, topN),
  };
}

/**
 * Master options intelligence pipeline.
 */
function buildOptionsIntel(groupedData, spotPrice, config = {}) {
  const { timestamps, data } = groupedData;

  if (timestamps.length < 2) return null;

  const cfg = resolveConfig(config);

  const oiTrend = calculateOITrend(groupedData, cfg.lookback);
  const bias = deriveOIBiasV2(oiTrend, spotPrice, cfg);

  const latestTimestamp = timestamps[timestamps.length - 1];
  const latestRows      = data[latestTimestamp] ?? [];
  const walls           = detectOIWallsV2(latestRows, spotPrice, cfg);

  const bigPlayers = detectBigPlayers(oiTrend, spotPrice, cfg);

  return { bias, walls, bigPlayers, latestTimestamp };
}

module.exports = {
  groupSnapshotsByTimestamp,
  createStrikeMap,
  calculateOITrend,
  deriveOIBias,
  calculateOIDeltas,
  getLastTwoSnapshots,
  detectOIWalls,
  deriveOIBiasV2,
  detectOIWallsV2,
  detectBigPlayers,
  buildOptionsIntel,
};
