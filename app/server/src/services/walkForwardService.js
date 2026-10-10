'use strict';

/**
 * Walk-forward validation — the answer to "your weights are hand-made and
 * your sample is small".
 *
 * Rolling scheme: train on 3 months, pick the best parameter set from a
 * bounded grid, then trade the NEXT month with it — a month the search never
 * saw. Roll forward month by month and concatenate only the out-of-sample
 * months. The result is the honest estimate of what parameter-picking is
 * worth: if adaptive weights beat the fixed manual config here, they earn
 * trust; if they don't, the manual config keeps its job and we have learned
 * that the edge does not live in the weights.
 *
 * Guards against self-deception:
 *   - the grid is small and pre-declared (4 knobs, 81 combos) — no free-form
 *     search that can memorise noise
 *   - a training window must produce >= 25 trades or the default config is
 *     used for its test month (thin evidence is not evidence)
 *   - the baseline (manual config) is evaluated on the SAME test months for
 *     a like-for-like comparison
 */

const { getIndexCandles } = require('./candleStoreService');
const { precompute, simulateRange, summarize, DEFAULT_PARAMS } = require('./method2BacktestService');
const { ScalpReport } = require('../models');
const { IST } = require('../utils/optionMath');

// Grid v2: measured factor correlations (EMA×RSI 0.82, ST×RSI 0.67,
// ST×EMA 0.63) say the trend factors triple-count one opinion — so the grid
// may now ZERO the redundant ones and let validation decide.
const GRID = [];
for (const gate of [65, 70, 75]) {
  for (const wEma of [10, 15, 20]) {
    for (const wMacd of [5, 10, 15]) {
      for (const wRsi of [0, 10]) {
        for (const wSt of [0, 5]) {
          GRID.push({ gate, wEma, wMacd, wRsi, wSt, wAdx: 5 });
        }
      }
    }
  }
}

const MIN_TRAIN_TRADES = 25;

function monthOf(unix) {
  return new Date((unix + IST) * 1000).toISOString().slice(0, 7);
}

async function runWalkForward({ from = '2025-09-24', to = '2026-09-25', trainMonths = 3, slip } = {}) {
  const fromUnix = Math.floor(new Date(`${from}T00:00:00+05:30`).getTime() / 1000);
  const toUnix = Math.floor(new Date(`${to}T23:59:59+05:30`).getTime() / 1000);
  const candles = await getIndexCandles('NIFTY', fromUnix, toUnix);
  if (candles.length < 5000) {
    throw new Error(`Not enough candles`);
  }
  const pre = precompute(candles);

  // month → [startIdx, endIdx)
  const monthIdx = new Map();
  for (let i = 0; i < candles.length; i++) {
    const m = monthOf(candles[i].time);
    if (!monthIdx.has(m)) {
      monthIdx.set(m, [i, i + 1]);
    } else {
      monthIdx.get(m)[1] = i + 1;
    }
  }
  const months = [...monthIdx.keys()].sort();

  const windows = [];
  let oosTrades = [], baseTrades = [];
  for (let k = 0; k + trainMonths < months.length; k++) {
    const trainStart = monthIdx.get(months[k])[0];
    const trainEnd = monthIdx.get(months[k + trainMonths - 1])[1];
    const testMonth = months[k + trainMonths];
    const [testStart, testEnd] = monthIdx.get(testMonth);

    // grid search on the train window
    let best = null;
    for (const g0 of GRID) {
      const g = slip != null ? { ...g0, slip } : g0;
      const tr = simulateRange(pre, g, trainStart, trainEnd);
      if (tr.length < MIN_TRAIN_TRADES) {
        continue;
      }
      const sm = summarize(tr);
      if (!best || sm.netRs > best.trainNet) {
        best = { params: g, trainNet: sm.netRs, trainTrades: sm.trades };
      }
    }
    const chosen = best?.params ?? (slip != null ? { ...DEFAULT_PARAMS, slip } : DEFAULT_PARAMS);

    const testTrades = simulateRange(pre, chosen, testStart, testEnd);
    const baseline = simulateRange(pre, slip != null ? { ...DEFAULT_PARAMS, slip } : DEFAULT_PARAMS, testStart, testEnd);
    oosTrades = oosTrades.concat(testTrades);
    baseTrades = baseTrades.concat(baseline);

    windows.push({
      testMonth,
      chosen, chosenWasDefault: !best,
      trainNet: best?.trainNet ?? null, trainTrades: best?.trainTrades ?? null,
      oos: summarize(testTrades),
      baselineOos: summarize(baseline)
    });
  }

  const report = {
    kind: 'walk-forward',
    label: `Walk-forward ${from} → ${to} (train ${trainMonths}m, test 1m)`,
    params: {
      from, to, trainMonths, slip: slip ?? 'engine default', gridSize: GRID.length, minTrainTrades: MIN_TRAIN_TRADES,
      defaults: DEFAULT_PARAMS,
      note: 'out-of-sample months only; baseline = manual config on the same months'
    },
    summary: {
      testMonths: windows.length,
      walkForwardOos: summarize(oosTrades),
      baselineOos: summarize(baseTrades),
      verdict: null   // filled below
    },
    byDay: windows.map(w => ({
      month: w.testMonth,
      chosen: `g${w.chosen.gate}/e${w.chosen.wEma}/m${w.chosen.wMacd}/r${w.chosen.wRsi}/s${w.chosen.wSt}${w.chosenWasDefault ? ' (default)' : ''}`,
      wfNetRs: w.oos.netRs, wfTrades: w.oos.trades,
      baseNetRs: w.baselineOos.netRs, baseTrades: w.baselineOos.trades
    })),
    trades: null
  };
  const wf = report.summary.walkForwardOos.netRs, bl = report.summary.baselineOos.netRs;
  report.summary.verdict = wf > bl
    ? `walk-forward beats manual by Rs.${(wf - bl).toLocaleString('en-IN')} out of sample`
    : `manual config beats walk-forward by Rs.${(bl - wf).toLocaleString('en-IN')} out of sample — the edge does not live in the weights`;

  const row = await ScalpReport.create({
    kind: report.kind, label: report.label, params: report.params,
    summary: report.summary, by_day: report.byDay, trades: null
  });
  return { id: row.id, ...report };
}

module.exports = { runWalkForward, GRID };
