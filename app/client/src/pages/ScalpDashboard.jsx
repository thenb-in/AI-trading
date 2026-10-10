import { useState, useEffect, useCallback } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { Link } from 'react-router-dom';
import { scalpApi } from '@app/services/api';
import '@app/styles/ScalpDashboard.css';

const REFRESH_MS = 30000;

const rs = (v) => v == null ? '—'
  : `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
const pc = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;

// ── Daily P&L bars (inline SVG, real byDay data) ──────────────────────────
function DailyBars({ days, lotsScale = 1 }) {
  if (!days?.length) return null;
  const vals = days.map((d) => d.netRs * lotsScale);
  const max = Math.max(...vals.map(Math.abs), 1);
  const W = 320, H = 120, pad = 4;
  const bw = (W - pad * 2) / days.length;
  const zero = H / 2;
  return (
    <svg className="sc-bars" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label="Daily in-hand profit and loss">
      <line x1="0" y1={zero} x2={W} y2={zero} className="sc-bars__zero" />
      {days.map((d, i) => {
        const v = d.netRs * lotsScale;
        const h = Math.max(2, Math.abs(v) / max * (H / 2 - 8));
        return (
          <g key={d.date}>
            <rect
              x={pad + i * bw + bw * 0.18} width={bw * 0.64}
              y={v >= 0 ? zero - h : zero} height={h}
              className={v >= 0 ? 'sc-bars__win' : 'sc-bars__loss'} rx="2"
            />
            <title>{`${d.date}: ${rs(v)} (${d.wins}/${d.trades} trades)`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// ── Verdict band — the one answer this page exists to give ────────────────
function VerdictBand({ matrix, focus }) {
  const rows = matrix?.summary?.rows ?? [];
  const winners = rows.filter((r) => r.profitable).sort((a, b) => b.netRs - a.netRs);
  const best = winners[0];
  const lotsCells = best
    ? rows.filter((r) => r.strategy === best.strategy).sort((a, b) => a.lots - b.lots)
    : [];
  const win = matrix?.params?.window;

  return (
    <section className="sc-verdict">
      <div className="sc-verdict__main">
        {best ? (
          <>
            <p className="sc-verdict__lede">
              Best of {matrix.summary.cells} tested — {best.strategy}, {best.lots} lots
              {win ? `, ${win.from} to ${win.to}` : ''}
            </p>
            <div className="sc-verdict__figure">{rs(best.netRs)}</div>
            <p className="sc-verdict__sub">
              in hand after every charge · won {pc(best.winRate)} of {best.trades} trades,
              needed {pc(best.requiredWinRate)}
            </p>
            <div className="sc-verdict__lots">
              {lotsCells.map((c) => (
                <span key={c.lots}
                      className={`sc-lotchip ${c.profitable ? 'sc-lotchip--win' : 'sc-lotchip--loss'}`}>
                  {c.lots} lots {rs(c.netRs)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="sc-verdict__figure sc-verdict__figure--none">No edge yet</div>
            <p className="sc-verdict__sub">No configuration clears its required win rate on current data.</p>
          </>
        )}
      </div>
      {focus?.by_day?.length > 0 && (
        <div className="sc-verdict__chart">
          <DailyBars days={focus.by_day} lotsScale={best ? best.lots / 2 : 1} />
          <p className="sc-verdict__chartlabel">
            Each bar is one session at {best ? best.lots : 2} lots. Hover for the day.
          </p>
        </div>
      )}
    </section>
  );
}

// ── Status strip ──────────────────────────────────────────────────────────
function StatusStrip({ paper, archive, matrix }) {
  const sessions = matrix?.summary?.rows?.[0] ? null : null;
  const nifty = archive?.index?.NIFTY;
  return (
    <div className="sc-strip">
      <span>Recorder: <b>{paper?.params?.config ?? '—'}</b> at +{paper?.params?.targetPts}/−{paper?.params?.stopPts}</span>
      <span>Open positions: <b>{paper?.openPositions ?? '—'}</b></span>
      <span>Forward record: <b>{paper?.closed ?? 0}</b> closed, <b className={paper?.netRs >= 0 ? 'sc-good' : 'sc-bad'}>{rs(paper?.netRs ?? 0)}</b> in hand</span>
      {nifty && <span>Data through <b>{nifty.to}</b> ({Number(nifty.rows).toLocaleString('en-IN')} min-candles)</span>}
    </div>
  );
}

// ── Strategy × lots matrix ────────────────────────────────────────────────
function MatrixCard({ matrix, onRun, running }) {
  const rows = matrix?.summary?.rows ?? [];
  const lotsList = matrix?.params?.lots ?? [2, 4, 6];
  const byStrategy = {};
  for (const r of rows) (byStrategy[r.strategy] ??= {})[r.lots] = r;
  const strategies = matrix?.params?.strategies ?? Object.keys(byStrategy);
  return (
    <section className="sc-card">
      <div className="sc-card-head">
        <h3>Every strategy at every size</h3>
        <button className="sc-run sc-run--small" onClick={onRun} disabled={running}>
          {running ? 'Running…' : 'Re-run matrix'}
        </button>
      </div>
      <p className="sc-note">
        Same real-premium window for every cell; figures are what reaches the
        account. Brokerage is flat ₹40 a round trip, so larger lots keep more
        of gross — but they scale losses just as faithfully.
      </p>
      {rows.length === 0
        ? <div className="sc-empty">No matrix yet. Run it to fill this table.</div>
        : (
          <div className="sc-scroll">
            <table className="sc-table">
              <thead>
                <tr>
                  <th>Strategy</th><th>Trades</th><th>Win rate</th><th>Needs</th>
                  {lotsList.map((l) => <th key={l} className="sc-num">{l} lots</th>)}
                </tr>
              </thead>
              <tbody>
                {strategies.map((key) => {
                  const cells = byStrategy[key] ?? {};
                  const first = cells[lotsList[0]];
                  if (!first) return null;
                  const anyWin = Object.values(cells).some((c) => c.profitable);
                  return (
                    <tr key={key} className={anyWin ? 'sc-row--good' : ''}>
                      <td>{key}</td>
                      <td className="sc-num">{first.trades}</td>
                      <td className="sc-num">{pc(first.winRate)}</td>
                      <td className="sc-num">{pc(first.requiredWinRate)}</td>
                      {lotsList.map((l) => {
                        const c = cells[l];
                        return (
                          <td key={l} className={`sc-num sc-inhand ${c && c.netRs >= 0 ? 'sc-good' : 'sc-bad'}`}>
                            {c ? rs(c.netRs) : '—'}{c?.profitable ? ' ✓' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}

// ── Monthly projection ────────────────────────────────────────────────────
function ProjectionCard({ proj }) {
  if (!proj) return null;
  const sm = proj.summary;
  return (
    <section className="sc-card">
      <h3>If this month looks like the measured days</h3>
      <div className="sc-stats">
        <div><span>Sessions measured</span><b>{proj.params.sessionsMeasured}</b></div>
        <div><span>Avg per session</span><b className={sm.avgPerSessionRs >= 0 ? 'sc-good' : 'sc-bad'}>{rs(sm.avgPerSessionRs)}</b></div>
        <div><span>Daily swing</span><b>{rs(sm.stdPerSessionRs)}</b></div>
        <div><span>Projected month</span>
          <b className={`sc-inhand ${sm.projectedMonthRs >= 0 ? 'sc-good' : 'sc-bad'}`}>{rs(sm.projectedMonthRs)}</b></div>
        <div><span>Likely range</span><b>{rs(sm.rangeLowRs)} to {rs(sm.rangeHighRs)}</b></div>
      </div>
      <p className="sc-note">{sm.note}</p>
    </section>
  );
}

// ── Live paper recorder ───────────────────────────────────────────────────
function PaperCard({ paper }) {
  if (!paper) return null;
  return (
    <section className="sc-card">
      <h3>Forward test, running live</h3>
      <p className="sc-note">
        Every minute of the session the engine trades this config on paper
        against real quotes. This record — not the backtest — is what earns
        real money a green light.
      </p>
      <div className="sc-stats">
        <div><span>Open</span><b>{paper.openPositions}</b></div>
        <div><span>Closed</span><b>{paper.closed}</b></div>
        <div><span>Win rate</span><b>{pc(paper.winRate)}</b></div>
        <div><span>Needs</span><b>{pc(paper.requiredWinRate)}</b></div>
        <div><span>Gross</span><b>{rs(paper.grossRs)}</b></div>
        <div><span>Charges</span><b className="sc-bad">{rs(-(paper.chargesRs ?? 0))}</b></div>
        <div><span>In hand</span><b className={`sc-inhand ${paper.netRs >= 0 ? 'sc-good' : 'sc-bad'}`}>{rs(paper.netRs)}</b></div>
      </div>
      {paper.open?.map((t) => (
        <div key={t.id} className="sc-open-trade">
          Holding <span className="sc-num">{t.tradingsymbol}</span> from {t.premium_entry} —
          target {t.premium_target}, stop {t.premium_stop}
          (touched {t.premium_best} high, {t.premium_worst} low)
        </div>
      ))}
      {(paper.recent ?? []).slice(0, 8).map((t) => (
        <div key={t.id} className="sc-closed-trade">
          <span className={`sc-pill ${Number(t.net_rs) > 0 ? 'sc-pill--good' : 'sc-pill--bad'}`}>{t.status}</span>
          <span className="sc-num">{t.tradingsymbol}</span>
          <span className="sc-num">{t.premium_entry} → {t.premium_exit}</span>
          <b className={`sc-num ${Number(t.net_rs) > 0 ? 'sc-good' : 'sc-bad'}`}>{rs(Number(t.net_rs))}</b>
        </div>
      ))}
      {paper.closed === 0 && paper.openPositions === 0 && (
        <div className="sc-empty">No paper trades yet today — the recorder opens one when the regime and the option chain agree.</div>
      )}
    </section>
  );
}

// ── Detail tables (kept out of the way) ───────────────────────────────────
function ShapeTable({ title, note, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <details className="sc-details">
      <summary>{title}</summary>
      {note && <p className="sc-note">{note}</p>}
      <div className="sc-scroll">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Shape</th><th>Trades</th><th>Win rate</th><th>Needs</th>
              <th className="sc-num">Gross</th><th className="sc-num">Charges</th>
              <th className="sc-num">Slippage</th><th className="sc-num">In hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={r.summary.profitable ? 'sc-row--good' : ''}>
                <td>{r.label.replace(' real premiums', '').replace(' BS 1-min', '')}</td>
                <td className="sc-num">{r.summary.trades}</td>
                <td className="sc-num">{pc(r.summary.winRate)}</td>
                <td className="sc-num">{pc(r.summary.requiredWinRate)}</td>
                <td className="sc-num">{rs(r.summary.grossRs)}</td>
                <td className="sc-num sc-bad">{rs(-r.summary.chargesRs)}</td>
                <td className="sc-num sc-bad">{rs(-r.summary.slippageRs)}</td>
                <td className={`sc-num sc-inhand ${r.summary.netRs >= 0 ? 'sc-good' : 'sc-bad'}`}>{rs(r.summary.netRs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function ScalpDashboard() {
  const [reports, setReports] = useState([]);
  const [paper, setPaper] = useState(null);
  const [archive, setArchive] = useState(null);
  const [running, setRunning] = useState(false);
  const [matrixRunning, setMatrixRunning] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        scalpApi.getReports(),
        scalpApi.getPaperStats(),
        scalpApi.getHistoryStatus(),
      ]);
      setReports(Array.isArray(r1) ? r1 : []);
      setPaper(r2);
      setArchive(r3);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const post = (reqFn, setBusy) => async () => {
    setBusy(true); setError(null);
    try {
      await reqFn();
      await load();
    } catch (e) { setError(e.message || 'run failed'); }
    finally { setBusy(false); }
  };

  const newestByLabel = {};
  for (const r of reports) if (!newestByLabel[r.label]) newestByLabel[r.label] = r;
  const latest = Object.values(newestByLabel).map((r) => ({
    label: r.label, params: r.params, summary: r.summary, by_day: r.by_day,
  }));
  const real = latest.filter((r) => r.label.includes('real premiums') && !r.label.includes('L '))
                     .sort((a, b) => a.params.targetPts - b.params.targetPts);
  const bs   = latest.filter((r) => r.label.includes('BS')).sort((a, b) => a.params.targetPts - b.params.targetPts);
  const matrix = reports.find((r) => r.kind === 'matrix');
  const projection = reports.find((r) => r.kind === 'projection');
  const focus = latest.find((r) => r.label === '+3/-5 strict+OIflow real premiums');

  return (
    <div className="sc-dashboard">
      <MethodNav />

      {error && <div className="sc-error">{error}</div>}

      <VerdictBand matrix={matrix} focus={focus} />
      <StatusStrip paper={paper} archive={archive} matrix={matrix} />

      <MatrixCard matrix={matrix} onRun={post(scalpApi.runMatrix, setMatrixRunning)} running={matrixRunning} />

      <div className="sc-twocol">
        <ProjectionCard proj={projection ? { params: projection.params, summary: projection.summary } : null} />
        <PaperCard paper={paper} />
      </div>

      <div className="sc-detailhead">
        <h3>Full backtest detail</h3>
        <button className="sc-run sc-run--small" onClick={post(scalpApi.runShapeReport, setRunning)} disabled={running}>
          {running ? 'Running…' : 'Re-run shape reports'}
        </button>
      </div>
      <ShapeTable
        title="Real traded premiums, shape by shape"
        note="Regime from 1-min index candles; entries and exits on real option candles. Trade size 2 lots (130). Grows every day the harvest runs."
        rows={real}
      />
      <ShapeTable
        title="Modelled premiums (Black-Scholes, 30 days) for comparison"
        note="Longer window, coarser truth. Use for direction of change; trust the real-premium table for levels."
        rows={bs}
      />

      {archive?.index && (
        <p className="sc-footer">
          {Object.entries(archive.index)
            .filter(([, v]) => v.rows > 0)
            .map(([sym, v]) => `${sym} ${Number(v.rows).toLocaleString('en-IN')} min-candles (${v.from} to ${v.to})`)
            .join('  ·  ')}
          {archive.optionRows > 0 && `  ·  ${Number(archive.optionRows).toLocaleString('en-IN')} real option candles across ${archive.optionContracts} contracts`}
          {'  ·  all in Postgres'}
        </p>
      )}
    </div>
  );
}
