'use strict';

/**
 * The chain benchmark — the gate every OI-analysis change must pass.
 *
 * Scores chain-derived signals against actual forward NIFTY moves on the
 * harvested per-minute data, always the same way, and persists each run to
 * scalp_reports (kind 'chain-study'). The standing rule: no change to
 * Method 2's OI logic ships unless it beats the incumbent here on data it
 * was not tuned on.
 */

const { loadOptionContractsFromDb, getIndexCandles } = require('./candleStoreService');
const { ScalpReport } = require('../models');

const IST = 19800;
const istMin = t => Math.floor(((t + IST) % 86400) / 60);
const HORIZONS = [5, 15, 30, 60];
const STRIDE = 5 * 60;
const LOOK = 10 * 60;

async function runChainBenchmark() {
  const contracts = await loadOptionContractsFromDb();
  if (contracts.length === 0) {
    throw new Error(`No harvested option candles in DB`);
  }
  const tMin = Math.min(...contracts.map(c => c.first));
  const idx = await getIndexCandles('NIFTY', tMin - 3600, Math.floor(Date.now() / 1000));
  const spotAt = new Map(idx.map(c => [c.time, c.close]));

  const names = ['pcrLevel', 'pcrTrend5', 'pcrTrend10', 'pcrTrend15', 'oiFlow', 'votes', 'votesVolume'];
  const score = {};
  for (const n of names) {
    score[n] = {}; for (const h of HORIZONS) {
      score[n][h] = { hit: 0, miss: 0 };
    }
  }
  let samples = 0;

  const pcrAt = (t) => {
    let ce = 0, pe = 0, seen = 0;
    for (const c of contracts) {
      const p = c.byTime.get(t);
      if (!p?.oi) {
        continue;
      }
      seen++;
      if (c.type === 'CE') {
        ce += p.oi;
      } else {
        pe += p.oi;
      }
    }
    return seen >= 20 && ce > 0 ? pe / ce : null;
  };

  for (const c0 of idx) {
    const t = c0.time, m = istMin(t);
    if (m < 9 * 60 + 30 || m > 14 * 60) {
      continue;
    }
    if ((t % STRIDE) !== idx[0].time % STRIDE) {
      continue;
    }
    const spot = c0.close;

    let peBelow = 0, ceAbove = 0, bull = 0, bear = 0, bullV = 0, bearV = 0, seen = 0;
    for (const c of contracts) {
      const now = c.byTime.get(t), then = c.byTime.get(t - LOOK);
      if (!now?.oi || !then?.oi) {
        continue;
      }
      seen++;
      const dOI = now.oi - then.oi, dP = now.close - then.close;
      const dVol = (now.volume ?? 0) - (then.volume ?? 0);
      if (c.type === 'PE' && c.strike <= spot) {
        peBelow += dOI;
      }
      if (c.type === 'CE' && c.strike >= spot) {
        ceAbove += dOI;
      }
      const oiUp = dOI > 0, pUp = dP > 0;
      const interp = oiUp ? (pUp ? 'lb' : 'sb') : (pUp ? 'sc' : 'lu');
      const bullish = c.type === 'CE' ? (interp === 'lb' || interp === 'sc') : (interp === 'sb' || interp === 'sc');
      if (bullish) {
        bull++;
      } else {
        bear++;
      }
      if (dVol > 0) {
        if (bullish) {
          bullV++;
        } else {
          bearV++;
        }
      }
    }
    if (seen < 20) {
      continue;
    }
    samples++;

    const pcr = pcrAt(t);
    const sig = {
      pcrLevel: pcr == null ? 0 : pcr >= 1.0 ? 1 : pcr < 0.85 ? -1 : 0,
      oiFlow: (peBelow > 0 && peBelow > Math.abs(ceAbove)) ? 1 : (ceAbove > 0 && ceAbove > Math.abs(peBelow)) ? -1 : 0,
      votes: bull > bear + 2 ? 1 : bear > bull + 2 ? -1 : 0,
      votesVolume: bullV > bearV + 2 ? 1 : bearV > bullV + 2 ? -1 : 0
    };
    for (const w of [5, 10, 15]) {
      const prev = pcrAt(t - w * 60);
      sig[`pcrTrend${w}`] = (pcr == null || prev == null) ? 0 : (pcr - prev > 0.01 ? 1 : pcr - prev < -0.01 ? -1 : 0);
    }

    for (const n of names) {
      if (!sig[n]) {
        continue;
      }
      for (const h of HORIZONS) {
        const fwd = spotAt.get(t + h * 60);
        if (fwd == null || fwd === spot) {
          continue;
        }
        score[n][h][Math.sign(fwd - spot) === sig[n] ? 'hit' : 'miss']++;
      }
    }
  }

  const table = {};
  for (const n of names) {
    table[n] = {};
    for (const h of HORIZONS) {
      const { hit, miss } = score[n][h];
      table[n][`m${h}`] = hit + miss ? { accPct: Number((100 * hit / (hit + miss)).toFixed(1)), n: hit + miss } : null;
    }
  }

  const report = {
    kind: 'chain-study',
    label: 'Chain benchmark',
    params: {
      samples, strideMin: 5, lookbackMin: 10, horizonsMin: HORIZONS,
      window: {
        from: new Date(tMin * 1000).toISOString().slice(0, 10),
        to: new Date(idx[idx.length - 1].time * 1000).toISOString().slice(0, 10)
      },
      rule: 'no OI-logic change ships unless it beats the incumbent here on unseen data'
    },
    summary: { signals: table }
  };
  const row = await ScalpReport.create({ kind: report.kind, label: report.label, params: report.params, summary: report.summary, by_day: null, trades: null });
  return { id: row.id, ...report };
}

module.exports = { runChainBenchmark };
