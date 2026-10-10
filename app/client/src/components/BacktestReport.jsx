import PropTypes from 'prop-types';
import { rs, pc } from '@app/utils/money.js';
import '@app/styles/YearBacktest.css';

/**
 * Renders a one-year backtest result: the headline metric cards, the month-by-month
 * table, the outcome breakdown, and the latest-100 trade log — the shape every
 * backtest screen (Method 2 / 3 / 2-plus, YouTube techniques) shares. Pages keep their
 * own controls, header and scope copy above it and hand the finished run down here.
 *
 * Props carry only the real differences between screens:
 *  - report         the run envelope ({ summary, trades, ... }); null until a run exists
 *  - err            transport-level error string to surface instead of the report
 *  - months         month-by-month rows (each screen derives them from its own envelope)
 *  - outcomeLabels  map from outcome key to its human label (gate wording differs per screen)
 *  - outcomeNote    (summary) => node, the avg win/loss line under the outcome table
 *  - renderExtraPanel  optional (summary) => node, extra breakdown shown above "How trades ended"
 *  - showTrigger    include the per-trade Trigger column in the log (YT screen only)
 */
function BacktestReport({
  report,
  err,
  months = [],
  outcomeLabels = {},
  outcomeNote,
  renderExtraPanel,
  showTrigger = false,
}) {
  const s = report?.summary;
  const trades = report?.trades ?? [];

  return (
    <>
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
              {renderExtraPanel && renderExtraPanel(s)}
              <h3>How trades ended</h3>
              <table className="yb-table">
                <thead><tr><th>Resolution</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                  {Object.entries(s.byOutcome ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <tr key={k}>
                      <td>{outcomeLabels[k] ?? k}</td>
                      <td className="yb-num">{v}</td>
                      <td className="yb-num">{pc(v / s.trades * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outcomeNote && outcomeNote(s)}
            </section>
          </div>

          <section className="yb-panel">
            <h3>Trade log (latest 100 of {s.trades.toLocaleString('en-IN')} — full log in the Excel download)</h3>
            <div className="yb-scroll">
              <table className="yb-table yb-table--log">
                <thead><tr>
                  <th>Date</th><th>Time</th><th>Call</th>{showTrigger && <th>Trigger</th>}<th>Contract</th><th>Conf</th>
                  <th>Entry</th><th>Exit</th><th>Resolution</th><th>Held</th><th>In hand</th>
                </tr></thead>
                <tbody>
                  {trades.slice(-100).reverse().map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td><td>{t.time}</td><td>{t.dir}</td>
                      {showTrigger && <td>{t.trigger ?? '—'}</td>}
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
    </>
  );
}

BacktestReport.propTypes = {
  report: PropTypes.shape({
    summary: PropTypes.object,
    trades: PropTypes.array,
  }),
  err: PropTypes.string,
  months: PropTypes.array,
  outcomeLabels: PropTypes.object,
  outcomeNote: PropTypes.func,
  renderExtraPanel: PropTypes.func,
  showTrigger: PropTypes.bool,
};

export { BacktestReport };
