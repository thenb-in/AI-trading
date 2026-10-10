import { useState, useEffect, useCallback } from 'react';
import { MethodNav } from '../components/MethodNav.jsx';
import { backtestApi } from '@app/services/api';
import { BacktestReport } from '../components/BacktestReport.jsx';
import { rs, pc } from '@app/utils/money.js';
import '@app/styles/YearBacktest.css';
import '@app/styles/YtBacktest.css';

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

function YtBacktest() {
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
      setReport(res);
    } catch (e) {
      // HTTP error (e.g. 404 — no run yet) leaves the report empty, like before;
      // only a network/transport failure surfaces as an error banner.
      if (e?.httpStatus) setReport(null);
      else setErr(e.message);
    }
  }, [pricing, triggerSet, expiryRule]);
  useEffect(() => { load(); }, [pricing, triggerSet, expiryRule]); // eslint-disable-line react-hooks/exhaustive-deps

  // the two existing year backtests, for the like-for-like strip
  useEffect(() => {
    (async () => {
      const out = {};
      for (const [k, ep] of [['m2', 'method2'], ['m3', 'method3']]) {
        try { const res = await backtestApi.getPeerYearReport(ep); out[k] = res; } catch { /* optional */ }
      }
      setPeers(out);
    })();
  }, []);

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      await backtestApi.runYtBacktest({ from: '2025-09-24', to: '2026-09-25', pricing, triggerSet, expiryRule });
      await load();
    } catch (e) { setErr(e.message || 'run failed'); }
    finally { setRunning(false); }
  };

  const s = report?.summary;
  const months = s?.monthly ?? [];
  const strip = [
    { k: 'm2', name: 'Method 2 (ours)', r: peers.m2 },
    { k: 'm3', name: 'Method 3 ★ prime (ours)', r: peers.m3 },
    { k: 'yt', name: 'YT × ours (this screen)', r: report },
  ];

  const toggleExpiryRule = () => setExpiryRule(v => !v);

  const renderTriggerPanel = (summary) => (
    <>
      <h3>Which of their triggers paid</h3>
      <table className="yb-table">
        <thead><tr><th>Trigger</th><th>Trades</th><th>Win</th><th>In hand</th></tr></thead>
        <tbody>
          {Object.entries(summary.byTrigger ?? {}).sort((a, b) => b[1].netRs - a[1].netRs).map(([k, v]) => (
            <tr key={k}>
              <td>{TRIGGER_LABEL[k] ?? k}</td><td className="yb-num">{v.trades}</td>
              <td className="yb-num">{pc(v.trades ? v.wins / v.trades * 100 : 0)}</td>
              <td className={`yb-num yb-strong ${v.netRs >= 0 ? 'yb-good' : 'yb-bad'}`}>{rs(v.netRs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderOutcomeNote = (summary) => (
    <p className="yb-note">Avg win {rs(summary.avgWinRs)} vs avg loss {rs(-summary.avgLossRs)} · avg hold {summary.avgHoldMins} min.</p>
  );

  return (
    <div className="yb-page">
      <MethodNav />

      <div className="yb-method">
        {Object.entries(TRIGGERS).map(([k, m]) => (
          <button key={k} className={`yb-method__btn ${triggerSet === k ? 'on' : ''}`} onClick={() => setTriggerSet(k)}>{m.label}</button>
        ))}
        <button className={`yb-method__btn ${expiryRule ? 'on' : ''}`} onClick={toggleExpiryRule} title="Ours, data-derived: on expiry day no entries after 13:00, force-close 13:30">
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

      <BacktestReport
        report={report}
        err={err}
        months={months}
        outcomeLabels={OUTCOME_LABEL}
        showTrigger
        renderExtraPanel={renderTriggerPanel}
        outcomeNote={renderOutcomeNote}
      />
    </div>
  );
}

export { YtBacktest };
