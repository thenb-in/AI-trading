import { useState, useEffect, useCallback } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { useLocation } from 'react-router-dom';
import { method2Api } from '@app/services/api';
import './YearBacktest.css';

const rs = (v) => v == null ? '—' : `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
const pc = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;

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
      const { data } = await method2Api.getBacktest(METHODS[m].ep);
      setReport(data);
    } catch (e) {
      // 404 = no run yet; surface anything else
      if (e?.response?.status !== 404) setErr(e.message);
    }
  }, [method]);
  useEffect(() => { load(method); }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      await method2Api.runBacktest(METHODS[method].ep, { from: '2025-09-24', to: '2026-09-25' });
      await load();
    } catch (e) { setErr(e.response?.data?.message || e.message || 'run failed'); }
    finally { setRunning(false); }
  };

  const s = report?.summary;
  const months = report?.by_day ?? report?.byDay ?? report?.summary?.monthly ?? [];
  const trades = report?.trades ?? [];

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

      {err && <div className="yb-err">{err}</div>}
      {!report && !err && <div className="yb-empty">No run yet — press “Re-run backtest”.</div>}

      {s && (
        <>
          <section className="yb-cards">
            <div className="yb-card"><span>Trades</span><b>{s.trades.toLocaleString('en-IN')}</b></div>
            <div className="yb-card"><span>Win rate</span><b>{pc(s.winRate)}</b><i>needs {pc(s.requiredWinRate)}</i></div>
            <div className="yb-card"><span>Gross</span><b>{rs(s.grossRs)}</b></div>
            <div className="yb-card"><span>Charges</span><b className="yb-bad">{rs(-s.chargesRs)}</b></div>
            <div className="yb-card"><span>Slippage</span><b className="yb-bad">{rs(-s.slippageRs)}</b></div>
            <div className="yb-card yb-card--hero"><span>In hand</span>
              <b className={s.netRs >= 0 ? 'yb-good' : 'yb-bad'}>{rs(s.netRs)}</b>
              <i>PF {s.profitFactor} · max DD {rs(s.maxDrawdownRs)}</i></div>
          </section>

          <div className="yb-cols">
            <section className="yb-panel">
              <h3>Month by month</h3>
              <table className="yb-table">
                <thead><tr><th>Month</th><th>Trades</th><th>Wins</th><th>In hand</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td><td className="yb-num">{m.trades}</td>
                      <td className="yb-num">{m.wins}</td>
                      <td className={`yb-num yb-strong ${m.netRs >= 0 ? 'yb-good' : 'yb-bad'}`}>{rs(m.netRs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="yb-panel">
              <h3>How trades ended</h3>
              <table className="yb-table">
                <thead><tr><th>Resolution</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                  {Object.entries(s.byOutcome ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <tr key={k}>
                      <td>{OUTCOME_LABEL[k] ?? k}</td>
                      <td className="yb-num">{v}</td>
                      <td className="yb-num">{pc(v / s.trades * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="yb-note">
                Avg win {rs(s.avgWinRs)} vs avg loss {rs(-s.avgLossRs)} — the
                lifecycle's trailing stops and fast invalidation keep losses
                smaller than wins, which is how a {pc(s.winRate)} win rate
                stays net positive. Avg hold {s.avgHoldMins} min.
              </p>
            </section>
          </div>

          <section className="yb-panel">
            <h3>Trade log (latest 100 of {s.trades.toLocaleString('en-IN')} — full log in the Excel download)</h3>
            <div className="yb-scroll">
              <table className="yb-table yb-table--log">
                <thead><tr>
                  <th>Date</th><th>Time</th><th>Call</th><th>Contract</th><th>Conf</th>
                  <th>Entry</th><th>Exit</th><th>Resolution</th><th>Held</th><th>In hand</th>
                </tr></thead>
                <tbody>
                  {trades.slice(-100).reverse().map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td><td>{t.time}</td><td>{t.dir}</td>
                      <td className="yb-sym">{t.sym}</td><td className="yb-num">{t.conf}%</td>
                      <td className="yb-num">₹{t.entry}</td><td className="yb-num">₹{t.exit}</td>
                      <td>{t.outcome}{t.targetsHit > 0 ? ` (T${t.targetsHit}✓)` : ''}</td>
                      <td className="yb-num">{t.heldMins}m</td>
                      <td className={`yb-num yb-strong ${t.netRs >= 0 ? 'yb-good' : 'yb-bad'}`}>{rs(t.netRs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
