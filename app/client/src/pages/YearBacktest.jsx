import { useState, useEffect, useCallback } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { useLocation } from 'react-router-dom';
import { method2Api } from '@app/services/api';
import BacktestReport from '../components/BacktestReport.jsx';
import { rs, pc } from '@app/utils/money.js';
import '@app/styles/YearBacktest.css';

const OUTCOME_LABEL = {
  target: 'T3 target completed',
  'trail-stop': 'Trailing stop (profit banked after T1/T2)',
  stopped: 'Stop loss',
  invalidated: 'Thesis reversed (opposite side ≥65%)',
  eod: 'Day close 15:20',
};

const METHODS = {
  m2: { ep: 'method2', title: 'Method 2 — one-year backtest', tag: 'conviction alone (the live earner)', btn: 'Method 2' },
  m2p: { ep: 'method2plus', title: 'Method 2 + discipline — one-year backtest', tag: 'live Method 2 plus the rules that held up on the 3 prior years too (Oct-2026 sweep)', btn: 'Method 2 + discipline' },
  m3: { ep: 'method3', title: 'Method 3 "prime" — one-year backtest', tag: 'breakout × conviction — fewer, higher-grade trades', btn: 'Method 3 ★ prime' },
};
const PLUS_LABEL = {
  expiryLastEntryMin: (v) => `expiry day: no entries after ${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`,
  expiryExitMin: (v) => `expiry day: force-close ${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`,
  entryFromMin: (v) => `entries from ${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`,
  lastEntryMin: (v) => `last entry ${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`,
  maxTradesDay: (v) => `max ${v} trades/day`, cooldownMin: (v) => `${v}-min cooldown`, cooldownLossOnly: (v) => (v ? 'cooldown after losses only' : null),
  trailR: (v) => `${v}R profit trail`, trailAfterT2: (v) => (v ? 'trail armed after T2' : null), invGate: (v) => `invalidation at ${v}%`,
  adxMin: (v) => `ADX ≥ ${v}`, gate: (v) => `gate ${v}%`,
};

export default function YearBacktest() {
  const { search } = useLocation();
  const pick = (q) => (q.includes('m=m3') ? 'm3' : q.includes('m=m2p') ? 'm2p' : 'm2');
  const [method, setMethod] = useState(pick(search));
  useEffect(() => { setMethod(pick(search)); }, [search]);
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async (m = method) => {
    try {
      setReport(null);
      const data = await method2Api.getBacktest(METHODS[m].ep);
      setReport(data);
    } catch (e) {
      // 404 = no run yet; surface anything else
      if (e?.httpStatus !== 404) setErr(e.message);
    }
  }, [method]);
  useEffect(() => { load(method); }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      await method2Api.runBacktest(METHODS[method].ep, { from: '2025-09-24', to: '2026-09-25' });
      await load();
    } catch (e) { setErr(e.message || 'run failed'); }
    finally { setRunning(false); }
  };

  const months = report?.by_day ?? report?.byDay ?? report?.summary?.monthly ?? [];

  return (
    <div className="yb-page">
      <MethodNav />

      <div className="yb-method">
        {Object.entries(METHODS).map(([k, m]) => (
          <button key={k} className={`yb-method__btn ${method === k ? 'on' : ''}`} onClick={() => setMethod(k)}>
            {m.btn}
          </button>
        ))}
        <span className="yb-method__tag">{METHODS[method].tag}</span>
      </div>

      <header className="yb-header">
        <div>
          <h2>{METHODS[method].title}</h2>
          <p className="yb-note">
            24 Sep 2025 → 25 Sep 2026 · 2 lots (130 qty) · full lifecycle rules
            (trailing stops, invalidation, 15:20 close) · every figure in hand
            after charges and slippage.
          </p>
          {report?.params && (
            <p className="yb-note">
              This run: gate {report.params.gate}% · weights EMA {report.params.weights?.wEma ?? '—'} /
              MACD {report.params.weights?.wMacd ?? '—'} / RSI {report.params.weights?.wRsi ?? '—'} ·
              slippage {report.params.slippagePts}/side{report.params.slippagePts <= 0.15 ? ' (measured)' : ' (assumed)'} ·
              {' '}{method === 'm2p' ? 'live Method 2 plus:' : 'the configuration live Method 2 trades today.'}
              {method === 'm2p' && report.plusParams && (
                <b> {Object.entries(report.plusParams).map(([k, v]) => PLUS_LABEL[k] ? PLUS_LABEL[k](v) : null).filter(Boolean).join(' · ')}</b>
              )}
            </p>
          )}
        </div>
        <div className="yb-actions">
          <a className="yb-btn yb-btn--dl" href={method2Api.backtestCsvUrl(METHODS[method].ep)}>
            Download Excel (CSV)
          </a>
          <button className="yb-btn" onClick={run} disabled={running}>
            {running ? 'Running… (takes a minute)' : 'Re-run backtest'}
          </button>
        </div>
      </header>

      <div className="yb-scope">
        <b>Scope, honestly:</b> real option-chain history begins 2026-08-31 —
        Zerodha purges option data at expiry, so the chain factors (±40 pts)
        and chain-based exits cannot be reconstructed for earlier months. This
        test therefore measures the <b>price side</b> of Method 2 (EMA, MACD,
        RSI, SuperTrend, ADX — the exact weights and gate of the run's label) with
        Black-Scholes-modelled premiums and the live exit rules of Sep 29:
        targets capped at +50% a step (T1 ≤ 1.5× … T3 ≤ 2.5× entry), the 1R
        breakeven ratchet, trailing after targets, invalidation, 15:20 close.
        Live chain-based targets always sit inside this tested envelope. The
        chain-augmented results, on real premiums, live on the Scalp page and grow daily.
      </div>

      <BacktestReport
        report={report}
        err={err}
        months={months}
        outcomeLabels={OUTCOME_LABEL}
        outcomeNote={(s) => (
          <p className="yb-note">
            Avg win {rs(s.avgWinRs)} vs avg loss {rs(-s.avgLossRs)} — the
            lifecycle's trailing stops and fast invalidation keep losses
            smaller than wins, which is how a {pc(s.winRate)} win rate
            stays net positive. Avg hold {s.avgHoldMins} min.
          </p>
        )}
      />
    </div>
  );
}
