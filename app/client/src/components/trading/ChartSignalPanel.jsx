import PropTypes from 'prop-types';

function fmt(v) {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RR({ risk, reward }) {
  if (!risk || !reward) return null;
  const rr = (reward / risk).toFixed(1);
  return <span className="csp-rr">1:{rr} R/R</span>;
}

RR.propTypes = {
  risk: PropTypes.number,
  reward: PropTypes.number,
};

function ScenarioCard({ scenario }) {
  const isBuy = scenario.direction === 'BUY';
  const risk = scenario.entry != null && scenario.stopLoss != null
    ? Math.abs(scenario.entry - scenario.stopLoss) : null;
  const reward1 = scenario.target1 != null && scenario.entry != null
    ? Math.abs(scenario.target1 - scenario.entry) : null;

  return (
    <div className={`csp-card csp-card--${isBuy ? 'buy' : 'sell'}`}>
      <div className="csp-card__header">
        <span className="csp-card__dir">{isBuy ? '▲ BUY' : '▼ SELL'} BREAKOUT</span>
        <span className="csp-card__trigger">
          Trigger: <strong>{fmt(scenario.trigger)}</strong>
        </span>
        {risk && reward1 && <RR risk={risk} reward={reward1} />}
      </div>

      <div className="csp-card__levels">
        <div className="csp-level csp-level--entry">
          <span className="csp-level__label">Entry</span>
          <span className="csp-level__value">{fmt(scenario.entry)}</span>
          <span className="csp-level__note">{isBuy ? '0.1% above breakout' : '0.1% below breakdown'}</span>
        </div>
        <div className="csp-level csp-level--sl">
          <span className="csp-level__label">Stop Loss</span>
          <span className="csp-level__value">{fmt(scenario.stopLoss)}</span>
          <span className="csp-level__note">{isBuy ? 'nearest support' : 'nearest resistance'}</span>
        </div>
        <div className="csp-level csp-level--t1">
          <span className="csp-level__label">Target 1</span>
          <span className="csp-level__value">{fmt(scenario.target1)}</span>
          <span className="csp-level__note">1.5R</span>
        </div>
        <div className="csp-level csp-level--t2">
          <span className="csp-level__label">Target 2</span>
          <span className="csp-level__value">{fmt(scenario.target2)}</span>
          <span className="csp-level__note">2.5R</span>
        </div>
      </div>

      {scenario.notes?.length > 0 && (
        <ul className="csp-notes">
          {scenario.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

ScenarioCard.propTypes = {
  scenario: PropTypes.shape({
    direction: PropTypes.string,
    trigger: PropTypes.number,
    entry: PropTypes.number,
    stopLoss: PropTypes.number,
    target1: PropTypes.number,
    target2: PropTypes.number,
    notes: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

function ChartSignalPanel({ scenarios }) {
  if (!scenarios?.length) return null;
  return (
    <div className="csp-panel">
      <h4 className="csp-panel__title">Chart Breakout Scenarios</h4>
      <p className="csp-panel__subtitle">Based on visible S/R levels — updates as you pan the chart</p>
      <div className="csp-panel__cards">
        {scenarios.map((s, i) => <ScenarioCard key={i} scenario={s} />)}
      </div>
    </div>
  );
}

ChartSignalPanel.propTypes = {
  scenarios: PropTypes.arrayOf(PropTypes.object),
};

export { ChartSignalPanel };
