import { useEffect, useState } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { liveTradingApi } from '@app/services/api';
import '@app/styles/LiveTrading.css';

const inr = (v) => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;
const t2 = (v) => v == null ? '—' : Number(v).toFixed(2);
const hhmm = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const MODE_TEXT = {
  off: 'Execution is OFF — the system signals and paper-trades only.',
  dry: 'DRY-RUN — every order it would place is recorded below, nothing reaches the broker. Compare against paper for a few days before arming LIVE.',
  live: 'LIVE — real orders on the linked Zerodha account. 2 lots hard cap, stop resting on the exchange, MIS auto square-off as the last net.',
};

export default function LiveTrading() {
  const [d, setD] = useState(null);
  const [book, setBook] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dead = false;
    const pullBook = () => liveTradingApi.getDaybook()
      .then(x => { if (!dead && x) setBook(x); }).catch(() => {});
    pullBook();
    const id = setInterval(pullBook, 60000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  const pull = () => liveTradingApi.getAutotradeState()
    .then(x => { setD(x); setErr(null); })
    .catch(e => setErr(String(e.message || e.error || e)));

  useEffect(() => {
    pull();
    const id = setInterval(pull, 2000);
    return () => clearInterval(id);
  }, []);

  const setMode = (mode) => {
    if (busy || !d || mode === d.mode) return;
    if (mode === 'live' && !window.confirm(
      'ARM LIVE AUTO-TRADING?\n\nReal orders on your Zerodha account: BUY 130 qty (2 lots) MIS per Method 2 call, stop resting on the exchange, max 10 trades a day.\n\nRun Dry-run for a few days first if you have not.')) return;
    setBusy(true);
    liveTradingApi.setAutotradeMode(mode)
      .then(() => pull()).catch(() => pull()).finally(() => setBusy(false));
  };

  const applyGtt = (p, { sl, target }) => {
    if (busy) return;
    if (!window.confirm(`Update your GTT on ${p.tradingsymbol}?\n\nSL ₹${p.gtt?.sl ?? '—'} → ₹${sl.toFixed(2)}\nTarget ₹${p.gtt?.target ?? '—'} → ₹${target.toFixed(2)}\n\n(${p.suggest?.basis ?? 'system levels'})`)) return;
    setBusy(true);
    liveTradingApi.modifyGtt({ tradingsymbol: p.tradingsymbol, sl, target })
      .then(() => pull())
      .catch(e => window.alert('GTT update failed: ' + (e.message || e.error || e)))
      .finally(() => setBusy(false));
  };

  const active = d?.trades?.find(t => t.live);

  return (
    <div className="lt-page">
      <MethodNav />

      <h2 className="lt-title">Live Trading — auto-execution desk</h2>
      {err && <p className="lt-err">Could not load: {err}</p>}

      {d && <>
        <section className="lt-mode">
          <div className="lt-mode__switch">
            {['off', 'dry', 'live'].map(m => (
              <button key={m} disabled={busy}
                      className={`lt-mode__btn lt-mode__btn--${m} ${d.mode === m ? 'on' : ''}`}
                      onClick={() => setMode(m)}>
                {m === 'dry' ? 'DRY-RUN' : m.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="lt-mode__text">{MODE_TEXT[d.mode]}</p>
          {d.blocked && <p className="lt-blocked">⛔ New entries blocked: {d.blocked}</p>}
        </section>

        <section className="lt-cards">
          <div className="lt-card">
            <em>Trades today</em>
            <b>{d.tradesToday}<small>/{d.maxTradesDay}</small></b>
            <span>executed entries (hard cap)</span>
          </div>
          <div className="lt-card">
            <em>Stops today</em>
            <b>{d.stopsToday}<small>/{d.maxStopsDay}</small></b>
            <span>circuit breaker threshold</span>
          </div>
          <div className={`lt-card ${d.dayNetRs >= 0 ? 'lt-card--up' : 'lt-card--dn'}`}>
            <em>Day P&amp;L (closed)</em>
            <b>{inr(d.dayNetRs)}</b>
            <span>in hand after charges, 2 lots</span>
          </div>
          <div className="lt-card">
            <em>Position size</em>
            <b>{d.qty}<small> qty</small></b>
            <span>2 lots — fixed in code</span>
          </div>
        </section>

        <h3>Your Zerodha account <small>(read back live from the broker)</small></h3>
        {d.account && (
          <div className={`lt-acct lt-acct--${d.account.sync}`}>
            <span className="lt-acct__badge">{{
              'in-sync': '✓ IN SYNC — the account holds exactly what the system is trading',
              'qty-mismatch': '⚠ QTY MISMATCH — same contract, different size than 130',
              'paper-only': '⚠ PAPER ONLY — the system’s trade is NOT in the account (entry was refused or predates going live)',
              'different-position': '⚠ DIFFERENT POSITION — the account holds something else than the system’s trade',
              'account-only': '⚠ ACCOUNT ONLY — a position exists that the system is not managing',
              'flat': '— account flat, no system trade: in sync',
              'unknown': `? could not read the account: ${d.account.error ?? ''}`,
            }[d.account.sync]}</span>
            {d.account.sync === 'paper-only' && active && (
              <button className="lt-catchup" disabled={busy} onClick={() => {
                if (!window.confirm(
                  `ENTER THIS TRADE FOR REAL?\n\nBUY 130 qty ${active.tradingsymbol} @ MARKET (now ~₹${t2(active.exit)})\nSystem stop ₹${t2(active.trailSl)} will rest on the exchange.\n\nRefused automatically if the premium has run past entry + 0.5R.`)) return;
                setBusy(true);
                liveTradingApi.catchUpEntry()
                  .then(() => pull())
                  .catch(e => window.alert('Catch-up refused: ' + (e.message || e.error || e)))
                  .finally(() => setBusy(false));
              }}>
                ⚡ Enter this trade now — BUY 130 {active.tradingsymbol} @ market
              </button>
            )}
            {d.account.positions?.length > 0 && (
              <table className="lt-table lt-acct__table">
                <thead><tr><th>Contract</th><th>Qty</th><th>Avg</th><th>Last</th><th>P&amp;L</th><th>SL (GTT)</th><th>Target (GTT)</th><th>Product</th></tr></thead>
                <tbody>
                  {d.account.positions.map(p => (
                    <tr key={p.tradingsymbol}>
                      <td>{p.tradingsymbol}</td><td>{p.qty}</td><td>{t2(p.avgPrice)}</td>
                      <td>{t2(p.lastPrice)}{p.live ? <i className="lt-livedot" title="streaming from our websocket" /> : ''}</td>
                      <td className={p.pnl >= 0 ? 'up' : 'dn'}>{inr(p.pnl)}</td>
                      <td className="dn">
                        {p.gtt?.sl != null ? t2(p.gtt.sl) : '—'}
                        {/* stops only ever tighten: never suggest loosening a stop the user set */}
                        {p.gtt && p.suggest && p.suggest.sl > (p.gtt.sl ?? 0) + 0.5 && (
                          <button className="lt-suggest" disabled={busy}
                                  title={`System suggests SL ₹${t2(p.suggest.sl)} (${p.suggest.basis}) — click to update your GTT`}
                                  onClick={() => applyGtt(p, { sl: p.suggest.sl, target: p.gtt.target ?? p.suggest.target })}>
                            → {t2(p.suggest.sl)}
                          </button>
                        )}
                      </td>
                      <td className="up">
                        {p.gtt?.target != null ? t2(p.gtt.target) : '—'}
                        {p.gtt && p.suggest && Math.abs(p.suggest.target - (p.gtt.target ?? 0)) > 0.5 && (
                          <button className="lt-suggest" disabled={busy}
                                  title={`System suggests target ₹${t2(p.suggest.target)} (${p.suggest.basis}) — click to update your GTT`}
                                  onClick={() => applyGtt(p, { sl: p.gtt.sl ?? p.suggest.sl, target: p.suggest.target })}>
                            → {t2(p.suggest.target)}
                          </button>
                        )}
                      </td>
                      <td>{p.product}{p.gtt ? ` · GTT ${p.gtt.type}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <h3>Current situation</h3>
        {active ? (
          <div className="lt-active">
            <b>{active.direction} {active.tradingsymbol}</b> · entered {hhmm(active.entryTime)} @ ₹{t2(active.entry)}
            · now ₹{t2(active.exit)} · stop ₹{t2(active.trailSl)}
            {active.targetsHit > 0 ? ` · T${active.targetsHit} hit` : ''}
            <span className={active.netRs >= 0 ? 'up' : 'dn'}> {active.netRs >= 0 ? '+' : ''}{inr(active.netRs)} open</span>
          </div>
        ) : (
          <p className="lt-none">No open position — the system is watching for a 70%+ setup.</p>
        )}

        <h3>Today's trades</h3>
        {d.trades.length === 0 ? <p className="lt-none">No trades yet today.</p> : (
          <div className="lt-scroll">
            <table className="lt-table">
              <thead><tr><th>In</th><th>Out</th><th>Call</th><th>Contract</th><th>Entry</th><th>Exit</th><th>Resolution</th><th>Net</th></tr></thead>
              <tbody>
                {d.trades.map(t => (
                  <tr key={t.id} className={t.live ? 'lt-row--live' : ''}>
                    <td>{hhmm(t.entryTime)}</td>
                    <td>{t.live ? '—' : hhmm(t.exitTime)}</td>
                    <td>{t.direction}</td>
                    <td>{t.tradingsymbol}</td>
                    <td>{t2(t.entry)}</td>
                    <td>{t2(t.exit)}{t.live ? ' (live)' : ''}</td>
                    <td>{t.live ? 'ACTIVE' : t.status}</td>
                    <td className={t.netRs >= 0 ? 'up' : 'dn'}>{inr(t.netRs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Day book <small>(closed P&amp;L in hand, every trading day)</small></h3>
        {(!book || book.days.length === 0) ? <p className="lt-none">No closed trades yet.</p> : (
          <div className="lt-scroll">
            <table className="lt-table">
              <thead><tr><th>Date</th><th>Trades</th><th>Wins</th><th>Win %</th><th>Net (₹)</th><th></th></tr></thead>
              <tbody>
                {book.days.map(r => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.trades}</td>
                    <td>{r.wins}</td>
                    <td>{Math.round(100 * r.wins / r.trades)}%</td>
                    <td className={r.netRs >= 0 ? 'up' : 'dn'}>{inr(r.netRs)}</td>
                    <td><i className="lt-daybar" style={{
                      width: `${Math.min(100, Math.abs(r.netRs) / 100)}px`,
                      background: r.netRs >= 0 ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)' }} /></td>
                  </tr>
                ))}
                <tr className="lt-daytotal">
                  <td>ALL DAYS</td>
                  <td>{book.days.reduce((a, r) => a + r.trades, 0)}</td>
                  <td>{book.days.reduce((a, r) => a + r.wins, 0)}</td>
                  <td>—</td>
                  <td className={book.totalRs >= 0 ? 'up' : 'dn'}>{inr(book.totalRs)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <h3>Execution audit <small>(every order action, {d.mode === 'off' ? 'empty while OFF' : d.mode})</small></h3>
        {(!d.orders || d.orders.length === 0) ? <p className="lt-none">No execution actions recorded yet.</p> : (
          <div className="lt-scroll">
            <table className="lt-table">
              <thead><tr><th>When</th><th>Trade</th><th>Contract</th><th>Action</th><th>Mode</th><th>Side</th><th>Qty</th><th>Type</th><th>Trigger</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {d.orders.map(o => (
                  <tr key={o.id} className={o.status === 'error' ? 'lt-row--err' : ''}>
                    <td>{hhmm(o.created_at ?? o.createdAt)}</td>
                    <td>#{o.trade_id}</td>
                    <td>{o.tradingsymbol}</td>
                    <td>{o.kind}</td>
                    <td>{o.mode}</td>
                    <td>{o.transaction}</td>
                    <td>{o.qty}</td>
                    <td>{o.order_type}</td>
                    <td>{o.trigger_price != null ? t2(o.trigger_price) : '—'}</td>
                    <td>{o.status}</td>
                    <td className="lt-detail">{o.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="lt-foot">
          Hard limits, all in code: 2 lots (130 qty) per trade · max 10 executed trades a day · 3 stops = circuit breaker ·
          one position at a time · entries 9:15–15:15 only · stop rests on the exchange and lifts with every ratchet ·
          MIS product so the broker square-offs if this machine dies. Execution failures are logged, never hidden.
        </p>
      </>}
    </div>
  );
}
