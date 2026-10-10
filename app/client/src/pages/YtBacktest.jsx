import { useState, useEffect, useCallback } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { backtestApi } from '@app/services/api';
import './YearBacktest.css';
import './YtBacktest.css';

const rs = (v) => v == null ? '—' : `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
const pc = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;

const OUTCOME_LABEL = {
  target: 'T3 target completed',
  'trail-stop': 'Trailing stop (profit banked after T1/T2)',
  stopped: 'Stop loss',
  invalidated: 'Thesis reversed (opposite side ≥ gate)',
  eod: 'Day close 15:20',
  'expiry-exit': 'Expiry-day force-close 13:30 (our rule)',
};
const TRIGGER_LABEL = {
  ORB: 'Opening-range break, confirmed next bar',
  PDH: 'Previous-day high (bodies), confirmed',
  PDL: 'Previous-day low (bodies), confirmed',
  GAP: 'Gap + indecisive first bar, faded',
  CPR: 'Narrow-CPR breakout (pivot traders)',
  CAM: 'Camarilla H3/L3 rejection or H4/L4 break',
  '2PM': '14:00 day-extreme breakout (forum)',
  other: 'Unclassified',
};

const TRIGGERS = {
  yt:  { label: 'YT triggers (29 videos)', tag: 'opening range · previous-day bodies · gap fade' },
  all: { label: 'YT + other platforms', tag: '+ CPR narrow breakout · Camarilla H3/L3 & H4/L4 · 14:00 day-extreme (forums, TradingView, algo sites)' },
};
const PRICING = {
  project:    { label: 'Same premiums as our backtests', tag: 'project model — compares 1:1 with Method 2 / Method 3' },
  calibrated: { label: 'Calibrated premiums', tag: 'IV measured on the real chain, expiry-day honest (−₹500/trade vs project model)' },
};

export default function YtBacktest() {
  const [pricing, setPricing] = useState('project');
  const [triggerSet, setTriggerSet] = useState('yt');
  const [expiryRule, setExpiryRule] = useState(false);
  const [report, setReport] = useState(null);
  const [peers, setPeers] = useState({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setReport(null);
      const res = await backtestApi.getYtReport({ pricing, triggerSet, expiryRule });
      setReport(res.data);
    } catch (e) {
      // HTTP error (e.g. 404 — no run yet) leaves the report empty, like before;
      // only a network/transport failure surfaces as an error banner.
      if (e?.response) setReport(null);
      else setErr(e.message);
    }
  }, [pricing, triggerSet, expiryRule]);
  useEffect(() => { load(); }, [pricing, triggerSet, expiryRule]); // eslint-disable-line react-hooks/exhaustive-deps

  // the two existing year backtests, for the like-for-like strip
  useEffect(() => {
    (async () => {
      const out = {};
      for (const [k, ep] of [['m2', 'method2'], ['m3', 'method3']]) {
        try { const res = await backtestApi.getPeerYearReport(ep); out[k] = res.data; } catch { /* optional */ }
      }
      setPeers(out);
    })();
  }, []);

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      await backtestApi.runYtBacktest({ from: '2025-09-24', to: '2026-09-25', pricing, triggerSet, expiryRule });
      await load();
    } catch (e) { setErr(e?.response?.data?.message || e.message || 'run failed'); }
    finally { setRunning(false); }
  };

  const s = report?.summary;
  const months = s?.monthly ?? [];
  const trades = report?.trades ?? [];
  const strip = [
    { k: 'm2', name: 'Method 2 (ours)', r: peers.m2 },
    { k: 'm3', name: 'Method 3 ★ prime (ours)', r: peers.m3 },
    { k: 'yt', name: 'YT × ours (this screen)', r: report },
  ];

  return (
    <div className="yb-page">
      <MethodNav />

      <div className="yb-method">
        {Object.entries(TRIGGERS).map(([k, m]) => (
          <button key={k} className={`yb-method__btn ${triggerSet === k ? 'on' : ''}`} onClick={() => setTriggerSet(k)}>{m.label}</button>
        ))}
        <button className={`yb-method__btn ${expiryRule ? 'on' : ''}`} onClick={() => setExpiryRule(v => !v)} title="Ours, data-derived: on expiry day no entries after 13:00, force-close 13:30">
          {expiryRule ? '✓ ' : ''}expiry-day rule
        </button>
        <span className="yb-method__tag">{TRIGGERS[triggerSet].tag}</span>
      </div>
      <div className="yb-method">
        {Object.entries(PRICING).map(([k, m]) => (
          <button key={k} className={`yb-method__btn ${pricing === k ? 'on' : ''}`} onClick={() => setPricing(k)}>{m.label}</button>
        ))}
        <span className="yb-method__tag">{PRICING[pricing].tag}</span>
      </div>

      <header className="yb-header">
        <div>
          <h2>YT techniques × our system — one-year backtest</h2>
          <p className="yb-note">
            24 Sep 2025 → 25 Sep 2026 · same engine, window, costs and 2 lots as the
            Method 2 / Method 3 screens · every figure in hand after charges and slippage.
          </p>
          {report?.params && (
            <p className="yb-note">
              This run: gate {report.params.gate}% · weights EMA {report.params.weights?.wEma} /
              MACD {report.params.weights?.wMacd} / RSI {report.params.weights?.wRsi} ·
              slippage {report.params.slippagePts}/side · {report.params.pricing} premiums ·
              {' '}{s?.triggersFired ?? '—'} YT triggers fired, {s?.trades ?? '—'} passed our conviction gate.
            </p>
          )}
        </div>
        <div className="yb-actions">
          <a className="yb-btn yb-btn--dl" href={backtestApi.ytCsvUrl({ pricing, triggerSet, expiryRule })}>Download Excel (CSV)</a>
          <button className="yb-btn" onClick={run} disabled={running}>{running ? 'Running… (under a minute)' : 'Re-run backtest'}</button>
        </div>
      </header>

      <div className="yb-scope yt-scope">
        <div>
          <b>Their good points</b> — the entry trigger, distilled from 29 YouTube
          videos with 20k+ likes each (the second trigger set adds what forums,
          TradingView and algo sites repeat most: narrow-CPR breakout, Camarilla
          H3/L3 rejection and H4/L4 breakout, the 14:00 day-extreme break): opening range (09:15–09:30) must be broken on
          a close and <i>confirmed by the next bar</i>; previous-day high/low drawn
          from candle bodies, break + confirm; gap with an indecisive first bar is
          faded toward the gap; the trigger bar's wick against the trade ≤ 25% of its
          range; EMA 9 above 15 and price above the session VWAP for longs (mirror
          for shorts); entries 09:30–14:00, at most two a day.
        </div>
        <div>
          <b>Our good points</b> — the filter and the management, exactly as live:
          Method 2 conviction must reach the gate within 5 minutes of the trigger;
          MACD contradiction veto; ADX chop gate; ATM option; 1R breakeven ratchet;
          1.5R profit trail; targets capped +50% a step; opposite-side invalidation;
          15:20 close; full Zerodha charges and measured slippage. OI-flow
          confirmation (our other good point) cannot be rebuilt before 2026-08-31 —
          Zerodha purges option history at expiry — so it is not in this test.
          The optional <b>expiry-day rule</b> is ours, from the data: the expiring ATM
          decays to near-intrinsic by the close, so no entries after 13:00 and a
          13:30 force-close on expiry day.
        </div>
      </div>

      <section className="yt-strip">
        {strip.map(({ k, name, r }) => {
          const ss = r?.summary;
          return (
            <div key={k} className={`yt-strip__card ${k === 'yt' ? 'yt-strip__card--me' : ''}`}>
              <span>{name}</span>
              {ss ? (
                <>
                  <b className={ss.netRs >= 0 ? 'yb-good' : 'yb-bad'}>{rs(ss.netRs)}</b>
                  <i>{ss.trades} trades · {pc(ss.winRate)} win · PF {ss.profitFactor ?? '—'} · DD {rs(ss.maxDrawdownRs)}</i>
                </>
              ) : <i>no run on record</i>}
            </div>
          );
        })}
      </section>

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
                      <td>{m.month}</td><td className="yb-num">{m.trades}</td><td className="yb-num">{m.wins}</td>
                      <td className={`yb-num yb-strong ${m.netRs >= 0 ? 'yb-good' : 'yb-bad'}`}>{rs(m.netRs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="yb-panel">
              <h3>Which of their triggers paid</h3>
              <table className="yb-table">
                <thead><tr><th>Trigger</th><th>Trades</th><th>Win</th><th>In hand</th></tr></thead>
                <tbody>
                  {Object.entries(s.byTrigger ?? {}).sort((a, b) => b[1].netRs - a[1].netRs).map(([k, v]) => (
                    <tr key={k}>
                      <td>{TRIGGER_LABEL[k] ?? k}</td><td className="yb-num">{v.trades}</td>
                      <td className="yb-num">{pc(v.trades ? v.wins / v.trades * 100 : 0)}</td>
                      <td className={`yb-num yb-strong ${v.netRs >= 0 ? 'yb-good' : 'yb-bad'}`}>{rs(v.netRs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>How trades ended</h3>
              <table className="yb-table">
                <thead><tr><th>Resolution</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                  {Object.entries(s.byOutcome ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <tr key={k}><td>{OUTCOME_LABEL[k] ?? k}</td><td className="yb-num">{v}</td><td className="yb-num">{pc(v / s.trades * 100)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="yb-note">Avg win {rs(s.avgWinRs)} vs avg loss {rs(-s.avgLossRs)} · avg hold {s.avgHoldMins} min.</p>
            </section>
          </div>

          <section className="yb-panel">
            <h3>Trade log (latest 100 of {s.trades.toLocaleString('en-IN')} — full log in the Excel download)</h3>
            <div className="yb-scroll">
              <table className="yb-table yb-table--log">
                <thead><tr>
                  <th>Date</th><th>Time</th><th>Call</th><th>Trigger</th><th>Contract</th><th>Conf</th>
                  <th>Entry</th><th>Exit</th><th>Resolution</th><th>Held</th><th>In hand</th>
                </tr></thead>
                <tbody>
                  {trades.slice(-100).reverse().map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td><td>{t.time}</td><td>{t.dir}</td><td>{t.trigger ?? '—'}</td>
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
