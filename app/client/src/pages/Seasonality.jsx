import { useEffect, useState } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { seasonalityApi } from '@app/services/api';
import '@app/styles/Seasonality.css';

const fmtPct = (v, dp = 1) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(dp)}%`;

// green/red cell shading scaled to ±6% monthly move
function cellStyle(v) {
  if (v == null) return {};
  const a = Math.min(Math.abs(v) / 6, 1) * 0.55;
  return { background: v >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})` };
}

export default function Seasonality() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tilt, setTilt] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    seasonalityApi.getTilt().then(t => setTilt(t)).catch(() => {});
  }, []);

  const toggleTilt = () => {
    if (!tilt || saving) return;
    setSaving(true);
    seasonalityApi.setTilt(!tilt.enabled)
      .then(t => setTilt(t)).catch(() => {}).finally(() => setSaving(false));
  };

  useEffect(() => {
    let dead = false;
    setLoading(true); setErr(null);
    seasonalityApi.getSeasonality(symbol)
      .then(payload => { if (!dead) { setData(payload); setLoading(false); } })
      .catch(e => { if (!dead) { setErr(String(e.message || e.error || e)); setLoading(false); } });
    return () => { dead = true; };
  }, [symbol]);

  return (
    <div className="ssn-page">
      <MethodNav />

      <header className="ssn-header">
        <h2>Seasonality — what repeats almost every financial year</h2>
        <div className="ssn-toggle">
          {['NIFTY', 'BANKNIFTY'].map(s => (
            <button key={s} className={s === symbol ? 'on' : ''} onClick={() => setSymbol(s)}>{s}</button>
          ))}
        </div>
      </header>

      {loading && <p className="ssn-note">Crunching {symbol} daily history…</p>}
      {err && <p className="ssn-err">Could not load: {err}</p>}

      {data && !loading && <>
        <p className="ssn-note">
          {data.range.tradingDays.toLocaleString('en-IN')} trading days, {data.range.from} → {data.range.to}.
          Financial years run Apr 1 → Mar 31. Every claim shows in how many years it held — that consistency,
          not the average, is what makes a pattern real.
        </p>

        <section className="ssn-cards">
          {data.findings.map((f, i) => (
            <div className="ssn-card" key={i}>
              <b>{f.title}</b>
              <span>{f.detail}</span>
              {f.theory && <span className="ssn-why"><i>Why (theory):</i> {f.theory}</span>}
            </div>
          ))}
        </section>

        <section className="ssn-switch">
          <div className="ssn-switch__row">
            <button className={`ssn-switch__btn ${tilt?.enabled ? 'on' : ''}`} onClick={toggleTilt} disabled={!tilt || saving}>
              <i />{tilt?.enabled ? 'TILT ON' : 'TILT OFF'}
            </button>
            <div className="ssn-switch__text">
              <b>Seasonal tilt on live Method 2</b>
              <span>
                When on, a qualifying month leans the live score by ±2 points (~1% of conviction) —
                a back-of-mind nudge, never a signal.
                {tilt && (tilt.currentTilt !== 0
                  ? ` This month (${tilt.currentMonth}) qualifies: ${tilt.currentTilt > 0 ? 'bullish, +2 toward calls' : 'bearish, +2 toward puts'}.`
                  : tilt ? ` This month (${tilt.currentMonth}) has no qualifying pattern — the tilt does nothing right now.` : '')}
              </span>
            </div>
          </div>
          {data.byMonth.some(m => m.qualifies) && (
            <p className="ssn-switch__months">
              Most beneficial months:&nbsp;
              {data.byMonth.filter(m => m.qualifies && m.tilt > 0)
                .sort((a, b) => b.avgPct - a.avgPct)
                .map(m => `${m.month} (up ${m.up}/${m.years}, avg +${m.avgPct}%)`).join(', ')}
              {' on the call side; '}
              {data.byMonth.filter(m => m.qualifies && m.tilt < 0)
                .map(m => `${m.month} (down ${m.years - m.up}/${m.years}, avg ${m.avgPct}%)`).join(', ')}
              {' favours puts.'}
            </p>
          )}
          <p className="ssn-switch__note">
            Measured effect at this size: +7.8% net on the last year's backtest, −0.9% across 4 years —
            it helps ranging years and costs a little in strong trends. A change to the switch reaches the
            live score from the next server reload (evenings).
          </p>
        </section>

        <h3>FY × month heatmap <small>(% change, close to close)</small></h3>
        <div className="ssn-scroll">
          <table className="ssn-table">
            <thead>
              <tr>
                <th>FY</th>
                {data.fyMonthOrder.map(m => <th key={m}>{m}</th>)}
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {data.matrix.map(r => {
                const partial = r.months.some(v => v == null);
                return (
                  <tr key={r.fy}>
                    <td className="ssn-fy">{r.fy}{partial ? '*' : ''}</td>
                    {r.months.map((v, i) => (
                      <td key={i} style={cellStyle(v)} className="ssn-cell">{v == null ? '·' : v.toFixed(1)}</td>
                    ))}
                    <td className={`ssn-total ${r.totalPct >= 0 ? 'up' : 'dn'}`}>{fmtPct(r.totalPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ssn-foot">* partial year (data starts/ends inside it) · cells are month-end close vs previous month-end close</p>

        <h3>Month-by-month consistency</h3>
        <div className="ssn-scroll">
          <table className="ssn-table ssn-months">
            <thead>
              <tr><th>Month</th><th>Years up</th><th>Hit rate</th><th>Average</th><th>Median</th><th>Worst</th><th>Best</th></tr>
            </thead>
            <tbody>
              {data.byMonth.map(m => (
                <tr key={m.month} className={m.qualifies ? (m.upPct >= 50 ? 'ssn-hot-up' : 'ssn-hot-dn') : ''}>
                  <td>{m.month}</td>
                  <td>{m.up}/{m.years}</td>
                  <td><div className="ssn-bar"><i style={{ width: `${m.upPct}%`, background: m.upPct >= 50 ? '#34d399' : '#f87171' }} />{m.upPct}%</div></td>
                  <td className={m.avgPct >= 0 ? 'up' : 'dn'}>{fmtPct(m.avgPct, 2)}</td>
                  <td className={m.medianPct >= 0 ? 'up' : 'dn'}>{fmtPct(m.medianPct, 2)}</td>
                  <td className="dn">{fmtPct(m.worstPct, 1)}</td>
                  <td className="up">{fmtPct(m.bestPct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ssn-grid">
          <div>
            <h3>Day of week</h3>
            <table className="ssn-table">
              <thead><tr><th>Day</th><th>Avg/day</th><th>Up days</th><th>Positive FYs</th></tr></thead>
              <tbody>
                {data.byDow.map(d => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td className={d.avgBps >= 0 ? 'up' : 'dn'}>{d.avgBps > 0 ? '+' : ''}{d.avgBps} bps</td>
                    <td>{d.upPct}%</td>
                    <td>{d.fyPositive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Time of day <small>(avg move per half hour)</small></h3>
            <table className="ssn-table">
              <thead><tr><th>From</th><th>Avg</th><th>Up</th></tr></thead>
              <tbody>
                {data.hourly.map(h => (
                  <tr key={h.window}>
                    <td>{h.window}</td>
                    <td className={h.avgBps >= 0 ? 'up' : 'dn'}>{h.avgBps > 0 ? '+' : ''}{h.avgBps} bps</td>
                    <td>{h.upPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <h3>Turn of month</h3>
        <p className="ssn-note">
          The last 2 + first 3 trading days of each month averaged <b className={data.turnOfMonth.tomAvgBps >= 0 ? 'up' : 'dn'}>
          {data.turnOfMonth.tomAvgBps > 0 ? '+' : ''}{data.turnOfMonth.tomAvgBps} bps/day</b> ({data.turnOfMonth.tomN} days)
          vs <b>{data.turnOfMonth.restAvgBps > 0 ? '+' : ''}{data.turnOfMonth.restAvgBps} bps</b> on all other days
          ({data.turnOfMonth.restN}); the effect was net-positive in {data.turnOfMonth.fyPositive} financial years.
        </p>

        <p className="ssn-foot">
          Seasonality is a tilt, not a signal — it says when the wind usually blows, not that it will today.
          The bar: a month counts as a pattern only if it closed the same colour in at least 7 of 10 analysed
          years (≥70%, minimum 6 years of history) — everything below that is treated as noise. The "why"
          notes are the flow/behaviour theories behind each pattern, kept in the back of the mind, never traded on their own.
          Data: {symbol} 1-min store collapsed to daily bars, updated by the nightly harvest.
        </p>
      </>}
    </div>
  );
}
