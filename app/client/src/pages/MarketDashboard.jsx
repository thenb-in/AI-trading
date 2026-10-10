import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MethodNav } from '../components/MethodNav.jsx';
import { Link, useLocation } from 'react-router-dom';
import '@app/styles/MarketDashboard.css';
import { NiftyChart } from '../components/trading/NiftyChart.jsx';
import { ChartSignalPanel } from '../components/trading/ChartSignalPanel.jsx';
import { marketApi } from '@app/services/api';

function formatNum(value) {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

const hasValue = (item) => item.value !== undefined;

function IndicatorCard({ title, items, getColor }) {
  return (
    <div className="dashboard-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-grid">
        {items.map(({ label, value, interpretation }) => {
          const color = getColor ? getColor(interpretation, value) : null;
          return (
            <div key={label} className="card-item">
              <span className="card-label">{label}</span>
              <span className="card-value" style={color ? { color } : undefined}>
                {typeof value === 'number' ? formatNum(value) : value ?? '—'}
              </span>
              {interpretation && (
                <span className="card-interpretation" style={color ? { color } : undefined}>
                  {interpretation}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

IndicatorCard.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    interpretation: PropTypes.string,
  })).isRequired,
  getColor: PropTypes.func,
};

function rsiColor(interpretation) {
  if (!interpretation) return null;
  if (interpretation.toLowerCase().includes('bullish')) return 'var(--bullish)';
  if (interpretation.toLowerCase().includes('bearish')) return 'var(--bearish)';
  return null;
}

function pcrColor(interpretation) {
  if (!interpretation) return null;
  if (interpretation.toLowerCase().includes('bullish') || interpretation === 'mock data') return 'var(--bullish)';
  if (interpretation.toLowerCase().includes('bearish')) return 'var(--bearish)';
  return null;
}

function biasColor(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v.includes('bullish') || v === 'up' || v === 'long-buildup' || v === 'short-covering' || v === 'above-pdh' || v === 'strong-breakout') return 'var(--bullish)';
  if (v.includes('bearish') || v === 'down' || v === 'short-buildup' || v === 'long-unwinding' || v === 'below-pdl' || v === 'weak-move') return 'var(--bearish)';
  return null;
}

/** Same rules as backend: derive bias from price, ema20, ema50 so bar always matches visible data. */
function deriveBiasFromIndicators(nifty) {
  if (!nifty) return 'flat';
  const price = nifty.latestClosePrice;
  const ema20 = nifty.ema20;
  const ema50 = nifty.ema50;
  if (price == null || ema20 == null || typeof price !== 'number' || typeof ema20 !== 'number') return 'flat';
  if (Number.isNaN(price) || Number.isNaN(ema20)) return 'flat';
  if (price > ema20 && ema50 != null && !Number.isNaN(ema50) && ema20 > ema50) return 'extremely bullish';
  if (price > ema20) return 'bullish';
  if (price < ema20 && ema50 != null && !Number.isNaN(ema50) && ema20 < ema50) return 'extremely bearish';
  if (price < ema20) return 'bearish';
  return 'flat';
}

const SENTIMENT_LABELS = ['extremely bearish', 'bearish', 'flat', 'bullish', 'extremely bullish'];

function SentimentBar({ nifty }) {
  const current = deriveBiasFromIndicators(nifty);
  return (
    <div className="sentiment-bar" role="tablist" aria-label="Market sentiment">
      {SENTIMENT_LABELS.map((label) => (
        <div
          key={label}
          className={`sentiment-bar__item ${label === current ? 'sentiment-bar__item--active' : ''}`}
          data-sentiment={label}
          role="tab"
          aria-selected={label === current}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

SentimentBar.propTypes = {
  nifty: PropTypes.object,
};

function SessionBanner({ session }) {
  if (!session) return null;
  const allowed = session.allowed;
  return (
    <div className={`session-banner ${allowed ? 'session-banner--allowed' : 'session-banner--blocked'}`}>
      <span className="session-banner__status">{allowed ? 'TRADING ACTIVE' : 'TRADING BLOCKED'}</span>
      <span className="session-banner__reason">{session.reason}</span>
      {session.isExpiryDay && <span className="session-banner__expiry">EXPIRY DAY</span>}
    </div>
  );
}

SessionBanner.propTypes = {
  session: PropTypes.shape({
    allowed: PropTypes.bool,
    reason: PropTypes.string,
    isExpiryDay: PropTypes.bool,
  }),
};

function ConfidenceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const items = [
    { label: 'EMA', score: breakdown.emaScore, max: 15 },
    { label: 'RSI', score: breakdown.rsiScore, max: 10 },
    { label: 'VWAP', score: breakdown.vwapScore, max: 7 },
    { label: 'BANKNIFTY', score: breakdown.bankConfirmation, max: 10 },
    { label: 'PCR', score: breakdown.pcrScore, max: 8 },
    { label: 'VIX', score: breakdown.vixScore, max: 10 },
    { label: 'SuperTrend', score: breakdown.superTrendScore, max: 10 },
    { label: 'MACD', score: breakdown.macdScore, max: 8 },
    { label: 'OI Change', score: breakdown.oiChangeScore, max: 8 },
    { label: 'Volume', score: breakdown.volumeScore, max: 5 },
    { label: 'Max Pain', score: breakdown.maxPainScore, max: 5 },
    { label: 'PDH/PDL', score: breakdown.pdhPdlScore, max: 7 },
    { label: 'CPR', score: breakdown.cprScore, max: 5 },
    { label: 'OI S/R', score: breakdown.oiSrScore, max: 7 },
  ];

  return (
    <div className="confidence-breakdown">
      <h4 className="confidence-breakdown__title">Confidence Breakdown ({breakdown.normalizedConfidence}%)</h4>
      <div className="confidence-breakdown__bars">
        {items.map(({ label, score, max }) => (
          <div key={label} className="confidence-bar">
            <span className="confidence-bar__label">{label}</span>
            <div className="confidence-bar__track">
              <div
                className={`confidence-bar__fill ${score > 0 ? 'confidence-bar__fill--positive' : ''}`}
                style={{ width: `${max > 0 ? (score / max) * 100 : 0}%` }}
              />
            </div>
            <span className="confidence-bar__score">{score}/{max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

ConfidenceBreakdown.propTypes = {
  breakdown: PropTypes.object,
};

const REFRESH_MS = 5000;

// ---------- Master Signal Logic ----------

/**
 * Combines signal engine output (14 indicators) with chart breakout scenarios (S/R based).
 * Returns a single master signal with aligned levels and combined confidence.
 */
function computeMasterSignal(signalData, chartScenarios, priceData, chartSymbol) {
  if (!signalData) return null;

  const direction = signalData.signal; // 'BUY' | 'SELL' | 'NO_TRADE'
  const engineConfidence = signalData.normalizedConfidence ?? signalData.confidence ?? 0;

  // Find the chart scenario that matches the signal direction
  const matchingScenario = chartScenarios?.find(s => s.direction === direction) ?? null;
  const hasChartConflict = chartScenarios?.length > 0 &&
    !matchingScenario &&
    direction !== 'NO_TRADE';

  // Chart alignment: +10 if confirmed, -5 if conflicting, 0 if no chart signal
  const chartBonus = matchingScenario ? 10 : hasChartConflict ? -5 : 0;
  const masterConfidence = Math.min(100, Math.max(0, engineConfidence + chartBonus));

  // Use chart S/R-based levels when available (more precise) — fall back to ATR-based
  const entry    = matchingScenario?.entry    ?? signalData.entry;
  const stopLoss = matchingScenario?.stopLoss ?? signalData.stopLoss;
  const target1  = matchingScenario?.target1  ?? signalData.target1;
  const target2  = matchingScenario?.target2  ?? signalData.target2;
  const trigger  = matchingScenario?.trigger  ?? null;

  // Determine which option to buy
  const price = priceData?.lastPrice ?? entry;
  let optionTrade = null;
  if (direction !== 'NO_TRADE' && price != null) {
    const strikeInterval = chartSymbol === 'BANKNIFTY' ? 100 : 50;
    const atmStrike = Math.round(price / strikeInterval) * strikeInterval;
    const optionType = direction === 'BUY' ? 'CE' : 'PE';
    optionTrade = `${chartSymbol} ${atmStrike} ${optionType}`;
  }

  // Status label
  let status, statusClass;
  if (direction === 'NO_TRADE') {
    status = 'WAIT — No Trade';
    statusClass = 'wait';
  } else if (matchingScenario) {
    status = direction === 'BUY' ? 'CONFIRMED BUY' : 'CONFIRMED SELL';
    statusClass = direction === 'BUY' ? 'confirmed-buy' : 'confirmed-sell';
  } else if (hasChartConflict) {
    status = 'SIGNAL CONFLICT — Caution';
    statusClass = 'conflict';
  } else {
    status = direction === 'BUY' ? 'BUY (chart pending)' : 'SELL (chart pending)';
    statusClass = direction === 'BUY' ? 'buy-pending' : 'sell-pending';
  }

  const risk = entry != null && stopLoss != null ? Math.abs(entry - stopLoss) : null;

  return {
    direction,
    status,
    statusClass,
    masterConfidence,
    engineConfidence,
    chartBonus,
    chartAligned: !!matchingScenario,
    hasChartConflict,
    entry,
    stopLoss,
    target1,
    target2,
    trigger,
    risk,
    optionTrade,
    notes: matchingScenario?.notes ?? [],
    qualityLevel: signalData.qualityLevel,
    regime: signalData.regime,
    atr: signalData.atr,
    tradesToday: signalData.tradesToday,
  };
}

function MasterSignalCard({ master }) {
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = useCallback(() => setShowDetail(v => !v), []);
  if (!master) return null;

  const { direction, status, statusClass, masterConfidence, engineConfidence, chartBonus,
          entry, stopLoss, target1, target2, trigger, risk, optionTrade, notes,
          qualityLevel, regime, tradesToday, chartAligned, hasChartConflict } = master;

  const fmt = (v) => v != null ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const rr = risk && target1 != null && entry != null
    ? (Math.abs(target1 - entry) / risk).toFixed(1) : null;

  return (
    <div className={`master-signal master-signal--${statusClass}`}>
      <div className="master-signal__header">
        <div className="master-signal__status">
          <span className="master-signal__badge">{status}</span>
          {optionTrade && direction !== 'NO_TRADE' && (
            <span className="master-signal__option">Buy {optionTrade}</span>
          )}
        </div>
        <div className="master-signal__conf-block">
          <span className="master-signal__conf-label">Master Confidence</span>
          <span className="master-signal__conf-value">{masterConfidence.toFixed(0)}%</span>
          <div className="master-signal__conf-bar">
            <div className="master-signal__conf-fill" style={{ width: `${masterConfidence}%` }} />
          </div>
        </div>
      </div>

      <div className="master-signal__sources">
        <div className={`master-signal__source ${direction !== 'NO_TRADE' ? 'source--active' : ''}`}>
          <span className="source-label">Signal Engine</span>
          <span className="source-score">{engineConfidence.toFixed(0)}pts</span>
          <span className="source-detail">{qualityLevel ? qualityLevel.toUpperCase() : ''}{regime ? ` · ${regime}` : ''}</span>
        </div>
        <div className="master-signal__source-connector">+</div>
        <div className={`master-signal__source ${chartAligned ? 'source--active' : hasChartConflict ? 'source--conflict' : 'source--neutral'}`}>
          <span className="source-label">Chart S/R</span>
          <span className="source-score" style={{ color: chartBonus >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
            {chartBonus >= 0 ? '+' : ''}{chartBonus}pts
          </span>
          <span className="source-detail">
            {chartAligned ? 'Breakout confirmed' : hasChartConflict ? 'Opposite scenario' : 'No scenario yet'}
          </span>
        </div>
      </div>

      {direction !== 'NO_TRADE' && (
        <div className="master-signal__levels">
          {trigger && (
            <div className="master-signal__level master-signal__level--trigger">
              <span className="msl-label">Trigger</span>
              <span className="msl-value">{fmt(trigger)}</span>
              <span className="msl-note">Break this level to enter</span>
            </div>
          )}
          <div className="master-signal__level master-signal__level--entry">
            <span className="msl-label">Entry</span>
            <span className="msl-value">{fmt(entry)}</span>
            <span className="msl-note">{chartAligned ? 'S/R-based' : 'ATR-based'}</span>
          </div>
          <div className="master-signal__level master-signal__level--sl">
            <span className="msl-label">Stop Loss</span>
            <span className="msl-value">{fmt(stopLoss)}</span>
            {risk && <span className="msl-note">Risk: {fmt(risk)} pts</span>}
          </div>
          <div className="master-signal__level master-signal__level--t1">
            <span className="msl-label">Target 1</span>
            <span className="msl-value">{fmt(target1)}</span>
            <span className="msl-note">1.5R{rr ? ` (1:${rr} R/R)` : ''}</span>
          </div>
          <div className="master-signal__level master-signal__level--t2">
            <span className="msl-label">Target 2</span>
            <span className="msl-value">{fmt(target2)}</span>
            <span className="msl-note">2.5R</span>
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="master-signal__notes">
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}

      <div className="master-signal__footer">
        {tradesToday != null && <span className="master-footer-item">Trades today: {tradesToday}/3</span>}
        <button className="master-footer-detail" onClick={toggleDetail}>
          {showDetail ? 'Hide' : 'Show'} engine breakdown ↓
        </button>
      </div>

      {showDetail && (
        <div className="master-signal__detail-note">
          ↓ Full confidence breakdown available in the Trade Signal card below
        </div>
      )}
    </div>
  );
}

MasterSignalCard.propTypes = {
  master: PropTypes.shape({
    direction: PropTypes.string,
    status: PropTypes.string,
    statusClass: PropTypes.string,
    masterConfidence: PropTypes.number,
    engineConfidence: PropTypes.number,
    chartBonus: PropTypes.number,
    chartAligned: PropTypes.bool,
    hasChartConflict: PropTypes.bool,
    entry: PropTypes.number,
    stopLoss: PropTypes.number,
    target1: PropTypes.number,
    target2: PropTypes.number,
    trigger: PropTypes.number,
    risk: PropTypes.number,
    optionTrade: PropTypes.string,
    notes: PropTypes.arrayOf(PropTypes.string),
    qualityLevel: PropTypes.string,
    regime: PropTypes.string,
    tradesToday: PropTypes.number,
  }),
};

function TradeModeToggle({ mode, onChange }) {
  const isSelective = mode === 'selective';
  return (
    <div className="trade-mode-toggle">
      <span className="trade-mode-toggle__label">Trade Mode</span>
      <div className="trade-mode-toggle__options">
        <button
          className={`trade-mode-toggle__btn ${isSelective ? 'trade-mode-toggle__btn--active' : ''}`}
          onClick={() => onChange('selective')}
          title="4+ confirmations · ADX gate · SuperTrend · high precision"
        >
          Selective
        </button>
        <button
          className={`trade-mode-toggle__btn ${!isSelective ? 'trade-mode-toggle__btn--active' : ''}`}
          onClick={() => onChange('medium')}
          title="3+ confirmations · no ADX/SuperTrend gates · more trades"
        >
          Medium
        </button>
      </div>
      <span className="trade-mode-toggle__desc">
        {isSelective ? '4+ confirmations · ADX + SuperTrend gates' : '3+ confirmations · more frequent signals'}
      </span>
    </div>
  );
}

TradeModeToggle.propTypes = {
  mode: PropTypes.string,
  onChange: PropTypes.func,
};

function MarketDashboard() {
  const [priceData, setPriceData] = useState(null);
  const [indicatorData, setIndicatorData] = useState(null);
  const [bankniftyData, setBankniftyData] = useState(null);
  const [pcrData, setPcrData] = useState(null);
  const [signalData, setSignalData] = useState(null);
  const [vixData, setVixData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [tradeMode, setTradeModeState] = useState('selective');
  const [chartData, setChartData] = useState(null);
  const [chartSymbol, setChartSymbol] = useState('NIFTY');
  const [chartScenarios, setChartScenarios] = useState([]);

  const handleModeChange = useCallback(async (newMode) => {
    try {
      const data = await marketApi.setTradeMode(newMode);
      setTradeModeState(data.mode);
    } catch (err) {
      console.error('[TradeModeToggle] failed to switch mode:', err);
    }
  }, []);

  const fetchData = useCallback(async (symbol = chartSymbol) => {
    // Chart data is fetched independently — charts render even if other endpoints fail
    marketApi.getChartAnalysis(symbol)
      .then(res => { if (res?.candles?.length) setChartData(res); })
      .catch(() => {});

    // Required endpoints throw on failure; the rejected envelope carries
    // httpStatus (e.g. 502 on a Zerodha token error) and message,
    // which the token-expired detection below keys off exactly as before.
    const failed = (label, reason) => {
      const status = reason?.httpStatus;
      const message = reason?.message;
      let detail = `${status ?? ''}`;
      if (message) detail += ` — ${message}`;
      const err = new Error(`${label}: ${detail}`);
      err.httpStatus = status;
      throw err;
    };

    try {
      const [priceR, indicatorsR, bankIndicatorsR, pcrR, signalR, vixR, sessionR] = await Promise.allSettled([
        marketApi.getNifty(),
        marketApi.getNiftyIndicators(),
        marketApi.getBankNiftyIndicators(),
        marketApi.getNiftyPcr(),
        marketApi.getNiftySignal(),
        marketApi.getVix(),
        marketApi.getSession(),
      ]);

      if (priceR.status === 'rejected') failed('NIFTY price', priceR.reason);
      if (indicatorsR.status === 'rejected') failed('NIFTY indicators', indicatorsR.reason);
      if (bankIndicatorsR.status === 'rejected') failed('BANKNIFTY indicators', bankIndicatorsR.reason);
      if (pcrR.status === 'rejected') failed('PCR', pcrR.reason);
      if (signalR.status === 'rejected') failed('Signal', signalR.reason);

      setPriceData(priceR.value);
      setIndicatorData(indicatorsR.value);
      setBankniftyData(bankIndicatorsR.value);
      setPcrData(pcrR.value);
      setSignalData(signalR.value);

      if (vixR.status === 'fulfilled') setVixData(vixR.value);
      if (sessionR.status === 'fulfilled') setSessionData(sessionR.value);

      setError(null);
    } catch (err) {
      const message = err?.message || 'Failed to fetch market data';
      const isTokenError =
        err?.httpStatus === 502 ||
        /\btoken\b|\bexpired\b|\bunauthorized\b|TokenException|PermissionException|api_key|access_token|fallback tiers exhausted|Zerodha/i.test(message);
      setError(isTokenError ? `__TOKEN_EXPIRED__: ${message}` : message);
      console.error('[MarketDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [chartSymbol]);

  const handleSymbolChange = useCallback((sym) => {
    setChartSymbol(sym);
    fetchData(sym);
  }, [fetchData]);

  useEffect(() => {
    marketApi.getTradeMode()
      .then(r => setTradeModeState(r.mode))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasData = priceData ?? indicatorData ?? pcrData ?? signalData;
  if (loading && !hasData) {
    return (
      <div className="dashboard">
        <MethodNav />
        <h1>Market Dashboard</h1>
        <p className="dashboard-loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <MethodNav />
      <header className="dashboard-header">
        <div className="dashboard-header__top">
          <div>
            <h1>Market Dashboard</h1>
            <p className="dashboard-subtitle">Auto-refresh every 5s</p>
          </div>
          <TradeModeToggle mode={tradeMode} onChange={handleModeChange} />
        </div>
        {error && (
          error.startsWith('__TOKEN_EXPIRED__') ? (
            <div className="zerodha-token-banner">
              <span>Zerodha token expired — data unavailable.</span>
              <a
                href="/api/v1/auth/zerodha/login"
                target="_blank"
                rel="noopener noreferrer"
                className="zerodha-token-banner__link"
              >
                Login to Zerodha →
              </a>
            </div>
          ) : (
            <p className="dashboard-error">{error}</p>
          )
        )}
      </header>

      <SessionBanner session={sessionData} />
      <SentimentBar nifty={indicatorData} />
      <MasterSignalCard
        master={computeMasterSignal(signalData, chartScenarios, priceData, chartSymbol)}
      />
      <NiftyChart
        chartData={chartData}
        symbol={chartSymbol}
        onSymbolChange={handleSymbolChange}
        onScenariosUpdate={setChartScenarios}
      />
      <ChartSignalPanel scenarios={chartScenarios} />

      {signalData && (
        <div className={`signal-card signal-card--${String(signalData.signal).replace(/\s+/g, '').toLowerCase()}`}>
          <h3 className="signal-card__title">Trade Signal</h3>
          <div className="signal-card__main">
            <span className="signal-card__label">{signalData.trade || signalData.signal}</span>
            <span className="signal-card__confidence">
              {signalData.qualityLevel ? `${signalData.qualityLevel.toUpperCase()} quality` : `Confidence: ${formatNum(signalData.confidence)}%`}
              {signalData.regime && <span style={{ marginLeft: '0.75rem', opacity: 0.7 }}>Regime: {signalData.regime}</span>}
              {signalData.tradesToday != null && <span style={{ marginLeft: '0.75rem', opacity: 0.7 }}>Trade {signalData.tradesToday}/3</span>}
            </span>
          </div>
          <div className="signal-card__levels">
            {signalData.rawConfidence != null && (
              <div className="signal-card__level">
                <span className="signal-card__level-label">Raw confidence</span>
                <span className="signal-card__level-value">{formatNum(signalData.rawConfidence)}%</span>
              </div>
            )}
            <div className="signal-card__level">
              <span className="signal-card__level-label">Entry</span>
              <span className="signal-card__level-value">{formatNum(signalData.entry)}</span>
            </div>
            <div className="signal-card__level">
              <span className="signal-card__level-label">Stop loss</span>
              <span className="signal-card__level-value">{formatNum(signalData.stopLoss)}</span>
            </div>
            <div className="signal-card__level">
              <span className="signal-card__level-label">Target 1</span>
              <span className="signal-card__level-value">{formatNum(signalData.target1)}</span>
            </div>
            <div className="signal-card__level">
              <span className="signal-card__level-label">Target 2</span>
              <span className="signal-card__level-value">{formatNum(signalData.target2)}</span>
            </div>
            {signalData.pcrWeight != null && (
              <div className="signal-card__level">
                <span className="signal-card__level-label">PCR weight</span>
                <span className="signal-card__level-value">{formatNum(signalData.pcrWeight)}</span>
              </div>
            )}
            {signalData.atr != null && (
              <div className="signal-card__level">
                <span className="signal-card__level-label">ATR</span>
                <span className="signal-card__level-value">{formatNum(signalData.atr)}</span>
              </div>
            )}
          </div>

          {signalData.breakdown && (
            <div className="signal-card__breakdown-toggle">
              <button className="breakdown-toggle-btn" onClick={() => setShowBreakdown(!showBreakdown)}>
                {showBreakdown ? 'Hide' : 'Show'} Confidence Breakdown
              </button>
              {showBreakdown && <ConfidenceBreakdown breakdown={signalData.breakdown} />}
            </div>
          )}

          {signalData.reason && (
            <p className="signal-card__reason">{signalData.reason}</p>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        {(indicatorData || priceData) && (
          <IndicatorCard
            title="NIFTY 50"
            items={[
              {
                label: 'NIFTY price',
                value: priceData?.lastPrice != null ? priceData.lastPrice : indicatorData?.latestClosePrice,
              },
              { label: 'EMA 20', value: indicatorData?.ema20 },
              { label: 'EMA 50', value: indicatorData?.ema50 },
              { label: 'VWAP', value: indicatorData?.vwap },
              {
                label: 'RSI',
                value: indicatorData?.rsi,
                interpretation: indicatorData?.rsiInterpretation,
              },
            ].filter(hasValue)}
            getColor={rsiColor}
          />
        )}

        {bankniftyData && (
          <IndicatorCard
            title="BANK NIFTY"
            items={[
              { label: 'Price', value: bankniftyData.latestClosePrice },
              { label: 'EMA 20', value: bankniftyData.ema20 },
              { label: 'EMA 50', value: bankniftyData.ema50 },
              { label: 'VWAP', value: bankniftyData.vwap },
              {
                label: 'RSI',
                value: bankniftyData.rsi,
                interpretation: bankniftyData.rsiInterpretation,
              },
            ].filter(hasValue)}
            getColor={rsiColor}
          />
        )}

        {pcrData && (
          <div className="dashboard-card">
            <h3 className="card-title">Put/Call Ratio (NIFTY)</h3>
            <div className="card-grid">
              <div className="card-item">
                <span className="card-label">CE OI</span>
                <span className="card-value">{formatNum(pcrData.totalCE_OI)}</span>
              </div>
              <div className="card-item">
                <span className="card-label">PE OI</span>
                <span className="card-value">{formatNum(pcrData.totalPE_OI)}</span>
              </div>
              <div className="card-item">
                <span className="card-label">PCR</span>
                <span
                  className="card-value"
                  style={{ color: pcrColor(pcrData.interpretation) || undefined }}
                >
                  {formatNum(pcrData.pcr)}
                </span>
              </div>
              <div className="card-item full-width">
                <span
                  className="card-interpretation"
                  style={{ color: pcrColor(pcrData.interpretation) || undefined }}
                >
                  {pcrData.interpretation}
                </span>
              </div>
            </div>
          </div>
        )}

        {vixData && (
          <div className={`dashboard-card vix-card vix-card--${vixData.vixZone}`}>
            <h3 className="card-title">India VIX</h3>
            <div className="card-grid">
              <div className="card-item">
                <span className="card-label">VIX</span>
                <span className="card-value">{formatNum(vixData.vixValue)}</span>
              </div>
              <div className="card-item">
                <span className="card-label">Zone</span>
                <span className="card-value" style={{ color: vixData.vixZone === 'normal' ? 'var(--bullish)' : 'var(--bearish)' }}>
                  {vixData.vixZone}
                </span>
              </div>
              <div className="card-item">
                <span className="card-label">Trading</span>
                <span className="card-value" style={{ color: vixData.tradingAllowed ? 'var(--bullish)' : 'var(--bearish)' }}>
                  {vixData.tradingAllowed ? 'Allowed' : 'Blocked'}
                </span>
              </div>
              <div className="card-item">
                <span className="card-label">SL Factor</span>
                <span className="card-value">{formatNum(vixData.slAdjustmentFactor)}</span>
              </div>
            </div>
          </div>
        )}

        {signalData && (signalData.superTrendDirection || signalData.macdCrossover || signalData.volumeConfirmation) && (
          <IndicatorCard
            title="Momentum Indicators"
            items={[
              signalData.superTrendDirection && {
                label: 'SuperTrend',
                value: signalData.superTrendDirection,
                interpretation: signalData.superTrendDirection === 'UP' ? 'bullish' : 'bearish',
              },
              signalData.macdCrossover && {
                label: 'MACD',
                value: signalData.macdCrossover,
                interpretation: signalData.macdCrossover === 'bullish' ? 'bullish' : signalData.macdCrossover === 'bearish' ? 'bearish' : null,
              },
              signalData.volumeConfirmation && {
                label: 'Volume',
                value: signalData.volumeConfirmation,
                interpretation: signalData.volumeConfirmation === 'strong-breakout' ? 'bullish' : signalData.volumeConfirmation === 'weak-move' ? 'bearish' : null,
              },
            ].filter(Boolean)}
            getColor={biasColor}
          />
        )}

        {signalData && (signalData.oiChangeBias || signalData.maxPainStrike || signalData.oiSupport) && (
          <IndicatorCard
            title="OI Analysis"
            items={[
              signalData.oiChangeBias && {
                label: 'OI Change Bias',
                value: signalData.oiChangeBias,
                interpretation: signalData.oiChangeBias,
              },
              signalData.maxPainStrike && {
                label: 'Max Pain',
                value: signalData.maxPainStrike,
                interpretation: signalData.maxPainDirection,
              },
              signalData.oiSupport && {
                label: 'OI Support',
                value: signalData.oiSupport,
              },
              signalData.oiResistance && {
                label: 'OI Resistance',
                value: signalData.oiResistance,
              },
            ].filter(Boolean)}
            getColor={biasColor}
          />
        )}

        {signalData && (signalData.pdh || signalData.cprDayType) && (
          <IndicatorCard
            title="Price Levels"
            items={[
              signalData.pdh != null && { label: 'PDH', value: signalData.pdh },
              signalData.pdl != null && { label: 'PDL', value: signalData.pdl },
              signalData.pdc != null && { label: 'PDC', value: signalData.pdc },
              signalData.cprPivot != null && { label: 'CPR Pivot', value: signalData.cprPivot },
              signalData.cprDayType && {
                label: 'Day Type',
                value: signalData.cprDayType,
                interpretation: signalData.cprDayType === 'trending' ? 'bullish' : null,
              },
            ].filter(Boolean)}
            getColor={biasColor}
          />
        )}
      </div>
    </div>
  );
}

export { MarketDashboard };
