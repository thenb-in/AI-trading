import { useState, useEffect, useCallback } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { Link } from 'react-router-dom';
import { method2Api, mailerApi } from '@app/services/api';
import './Method2Dashboard.css';

const REFRESH_MS = 1000;

function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pct(v) {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
}

// ── Direction chip ─────────────────────────────────────────────────────────
function DirectionChip({ direction }) {
  const cls = direction === 'BUY' ? 'chip--bull' : direction === 'SELL' ? 'chip--bear' : 'chip--neutral';
  return <span className={`chip ${cls}`}>{direction}</span>;
}

// ── Confidence bar ─────────────────────────────────────────────────────────
function ConfBar({ bull, bear }) {
  return (
    <div className="conf-bar">
      <div className="conf-bar__bull" style={{ width: `${bull}%` }}>
        {bull >= 20 && <span>{bull}% Bull</span>}
      </div>
      <div className="conf-bar__bear" style={{ width: `${bear}%` }}>
        {bear >= 20 && <span>{bear}% Bear</span>}
      </div>
    </div>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────
// ── Active trade — the call that stands until ITS levels resolve it ───────
// Enter-now meter: 1 = do not enter fresh, 10 = the system would take this
// trade right now. Score is the distance from coin-flip (50%) to the 70%
// entry gate on the trade's own side, from the same live poll the dashboard
// already gets every 5s. A hard MACD contradiction caps it at 3 — the live
// entry gate would veto regardless of conviction.
function enterNowScore(trade, bullPct, bearPct, macd) {
  if (bullPct == null || bearPct == null) return null;
  const sidePct = trade.direction === 'BUY' ? bullPct : bearPct;
  let score = Math.round(1 + 9 * Math.min(1, Math.max(0, (sidePct - 50) / 20)));
  const contradicts = (trade.direction === 'BUY' && macd?.crossover === 'bearish')
                   || (trade.direction === 'SELL' && macd?.crossover === 'bullish');
  if (contradicts) score = Math.min(score, 3);
  return { score, sidePct, contradicts };
}

function EnterMeter({ trade, bullPct, bearPct, macd }) {
  const m = enterNowScore(trade, bullPct, bearPct, macd);
  if (!m) return null;
  const color = m.score >= 8 ? '#34d399' : m.score >= 5 ? '#fbbf24' : '#f87171';
  return (
    <div className="m2-meter">
      <div className="m2-meter__scale">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < m.score ? 'lit' : ''}
             style={i < m.score ? { background: color } : undefined} />
        ))}
      </div>
      <span className="m2-meter__label">
        Enter now? <b style={{ color }}>{m.score}/10</b>
        {' · '}{trade.direction} side at {m.sidePct}% (gate 70%)
        {m.contradicts ? ' · MACD contradicts — vetoed' : m.score === 10 ? ' · system would enter fresh' : ''}
      </span>
    </div>
  );
}

// Auto-execution switch: Off (default) / Dry-run / LIVE. Dry-run records the
// orders it would place into the audit table; LIVE places real 2-lot MIS
// orders with the stop resting on the exchange. LIVE asks for confirmation.
function AutoTradeSwitch() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    method2Api.getAutotrade().then(({ data }) => setState(data)).catch(() => {});
  }, []);
  const setMode = (mode) => {
    if (busy || !state || mode === state.mode) return;
    if (mode === 'live' && !window.confirm(
      'ARM LIVE AUTO-TRADING?\n\nReal orders on your Zerodha account: BUY 130 qty (2 lots) MIS per Method 2 call, stop resting on the exchange.\n\nRun Dry-run for a few days first if you have not.')) return;
    setBusy(true);
    method2Api.setAutotrade(mode)
      .then(({ data: d }) => setState(s => ({ ...s, mode: d.mode ?? s.mode })))
      .catch(() => {}).finally(() => setBusy(false));
  };
  if (!state) return null;
  return (
    <span className={`m2-auto ${state.mode === 'live' ? 'm2-auto--live' : state.mode === 'dry' ? 'm2-auto--dry' : ''}`}
          title="Auto-execution of Method 2 calls on the linked Zerodha account (2-lot hard cap)">
      <em>AUTO</em>
      {['off', 'dry', 'live'].map(m => (
        <button key={m} disabled={busy} className={state.mode === m ? 'on' : ''} onClick={() => setMode(m)}>
          {m === 'dry' ? 'DRY-RUN' : m.toUpperCase()}
        </button>
      ))}
    </span>
  );
}


function ActiveTradeCard({ trade, bullPct, bearPct, macd }) {
  if (!trade) return null;
  const st = trade.statusInfo || {};
  const isActive = trade.status === 'active';
  const pnl = st.pnlPerUnit ?? 0;
  return (
    <div className={`m2-active ${isActive ? 'm2-active--live' : 'm2-active--done'}`}>
      <div className="m2-active__head">
        <span className={`m2-active__state ${isActive ? (pnl >= 0 ? 'st--profit' : 'st--drawdown') : 'st--done'}`}>
          {isActive ? `ACTIVE · ${st.substate ?? ''}` : (st.state ?? trade.status).toUpperCase()}
        </span>
        <span className="m2-active__sym">
          {trade.direction} {trade.tradingsymbol}
          {trade.confidenceAtEntry ? ` · called at ${trade.confidenceAtEntry}%` : ''}
        </span>
        <span className={`m2-active__pnl ${pnl >= 0 ? 'st--profit' : 'st--drawdown'}`}>
          {pnl >= 0 ? '+' : '−'}₹{Math.abs(pnl).toFixed(2)}/unit
        </span>
      </div>
      <div className="m2-active__levels">
        <span>Entry <b>₹{fmt(trade.entryPremium)}</b></span>
        <span>Now <b>₹{fmt(trade.lastPremium)}</b></span>
        <span>Stop <b>₹{fmt(trade.trailSl)}</b>{trade.trailSl > trade.slPremium ? ' (trailed)' : ''}</span>
        <span>T1 <b>₹{fmt(trade.t1)}</b>{trade.targetsHit >= 1 ? ' ✓' : ''}</span>
        <span>T2 <b>₹{fmt(trade.t2)}</b>{trade.targetsHit >= 2 ? ' ✓' : ''}</span>
        <span>T3 <b>₹{fmt(trade.t3)}</b></span>
        {trade.ulLevels?.sl != null && <span>Wall <b>{fmt(trade.ulLevels.sl, 0)}</b></span>}
      </div>
      {isActive && <EnterMeter trade={trade} bullPct={bullPct} bearPct={bearPct} macd={macd} />}
      <p className="m2-active__line">{st.line}</p>
    </div>
  );
}

function RecommendationCard({ rec, direction, confidence, noTradeReason }) {
  if (direction === 'NEUTRAL' || !rec) {
    return (
      <div className="m2-rec m2-rec--neutral">
        <div className="m2-rec__label">WAIT — No Clear Setup</div>
        <p className="m2-rec__sub">
          {noTradeReason || 'OI flow and indicators are conflicted. Stand aside and wait for a decisive signal.'}
        </p>
      </div>
    );
  }

  const isBuy   = direction === 'BUY';
  const isPreview = confidence < 75;   // 50–74% — shown on UI, no email
  const riskAmt = rec.premiumEntry - rec.premiumSL;
  const rrT1    = riskAmt > 0 ? ((rec.premiumT1 - rec.premiumEntry) / riskAmt).toFixed(1) : '—';
  const rrT2    = riskAmt > 0 ? ((rec.premiumT2 - rec.premiumEntry) / riskAmt).toFixed(1) : '—';
  const rrT3    = riskAmt > 0 ? ((rec.premiumT3 - rec.premiumEntry) / riskAmt).toFixed(1) : '—';

  return (
    <div className={`m2-rec ${isBuy ? 'm2-rec--buy' : 'm2-rec--sell'}${isPreview ? ' m2-rec--preview' : ''}`}>

      {isPreview && (
        <div className="m2-rec__preview-banner" style={{
          background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 6,
          fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'inline-block',
        }}>
          PREVIEW · Confidence {confidence}% — not yet emailed (threshold 75%)
        </div>
      )}

      {/* ── Trade call ── */}
      <div className="m2-rec__top">
        <div>
          <div className="m2-rec__action">{rec.action}</div>
          <div className="m2-rec__meta">{rec.tradingsymbol} · Exp {rec.expiry} · Spot {fmt(rec.spotPrice, 0)}</div>
        </div>
        <div className="m2-rec__conf">
          <span className="m2-rec__conf-num">{confidence}%</span>
          <span className="m2-rec__conf-label">confidence</span>
        </div>
      </div>

      {/* ── Premium levels ── */}
      <div className="m2-levels">
        <div className="m2-level m2-level--entry">
          <span className="m2-level__label">Entry</span>
          <span className="m2-level__value">₹{fmt(rec.premiumEntry)}</span>
          <span className="m2-level__note">Buy at market / LTP</span>
        </div>
        <div className="m2-level m2-level--sl">
          <span className="m2-level__label">Stop Loss</span>
          <span className="m2-level__value">₹{fmt(rec.premiumSL)}</span>
          <span className="m2-level__note">−{fmt(rec.premiumEntry - rec.premiumSL)} · Exit if breached</span>
        </div>
      </div>

      <div className="m2-targets">
        <div className="m2-targets__label">Targets</div>
        <div className="m2-targets__row">
          <div className="m2-target m2-target--t1">
            <span className="m2-target__tag">{rec.exitBasis === 'option-chain' && rec.ulT1 != null ? `T1 → ${Number(rec.ulT1).toLocaleString('en-IN')}` : 'T1 +30%'}</span>
            <span className="m2-target__price">₹{fmt(rec.premiumT1)}</span>
            <span className="m2-target__rr">R:R {rrT1}</span>
          </div>
          <div className="m2-target m2-target--t2">
            <span className="m2-target__tag">{rec.exitBasis === 'option-chain' && rec.ulT2 != null ? `T2 → ${Number(rec.ulT2).toLocaleString('en-IN')}` : 'T2 +60%'}</span>
            <span className="m2-target__price">₹{fmt(rec.premiumT2)}</span>
            <span className="m2-target__rr">R:R {rrT2}</span>
          </div>
          <div className="m2-target m2-target--t3">
            <span className="m2-target__tag">{rec.exitBasis === 'option-chain' && rec.ulT3 != null ? `T3 → ${Number(rec.ulT3).toLocaleString('en-IN')}` : 'T3 +100%'}</span>
            <span className="m2-target__price">₹{fmt(rec.premiumT3)}</span>
            <span className="m2-target__rr">R:R {rrT3}</span>
          </div>
        </div>
      </div>

      {/* ── Underlying levels ── */}
      <div className="m2-ul-levels">
        <div className="m2-ul-levels__title">Underlying NIFTY levels</div>
        <div className="m2-ul-levels__row">
          {rec.ulSl != null && (
            <div className="m2-ul m2-ul--sl">
              <span className="m2-ul__tag">SL if {isBuy ? 'below' : 'above'}</span>
              <span className="m2-ul__price">{fmt(rec.ulSl, 0)}</span>
            </div>
          )}
          {rec.ulT1 != null && (
            <div className="m2-ul m2-ul--t1">
              <span className="m2-ul__tag">T1</span>
              <span className="m2-ul__price">{fmt(rec.ulT1, 0)}</span>
            </div>
          )}
          {rec.ulT2 != null && (
            <div className="m2-ul m2-ul--t2">
              <span className="m2-ul__tag">T2 OI {isBuy ? 'Res' : 'Sup'}</span>
              <span className="m2-ul__price">{fmt(rec.ulT2, 0)}</span>
            </div>
          )}
          {rec.ulT3 != null && (
            <div className="m2-ul m2-ul--t3">
              <span className="m2-ul__tag">Max Pain</span>
              <span className="m2-ul__price">{fmt(rec.ulT3, 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Reasoning ── */}
      {rec.reasons?.length > 0 && (
        <div className="m2-reasons">
          <div className="m2-reasons__title">Why this trade</div>
          <ul className="m2-reasons__list">
            {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── OI flow panel ──────────────────────────────────────────────────────────
function OiFlowPanel({ oiChange }) {
  if (!oiChange) return <div className="m2-card m2-card--empty">OI data unavailable</div>;

  const { summary, strikes } = oiChange;
  const patterns = [
    { key: 'longBuildup',   label: 'Long Buildup',   color: '#0d9488', desc: 'Price↑ OI↑ → Bulls adding' },
    { key: 'shortBuildup',  label: 'Short Buildup',  color: '#dc2626', desc: 'Price↓ OI↑ → Bears adding' },
    { key: 'shortCovering', label: 'Short Covering', color: '#34d399', desc: 'Price↑ OI↓ → Bears exiting' },
    { key: 'longUnwinding', label: 'Long Unwinding', color: '#f87171', desc: 'Price↓ OI↓ → Bulls exiting' },
  ];
  const total = Object.values(summary || {}).reduce((s, v) => s + (v || 0), 0) || 1;

  return (
    <div className="m2-card">
      <h3 className="m2-card__title">OI Flow — Order Book Interpretation</h3>
      <div className="m2-flow-grid">
        {patterns.map(p => {
          const count = summary?.[p.key] || 0;
          const w = Math.round(count / total * 100);
          return (
            <div key={p.key} className="m2-flow-item">
              <div className="m2-flow-item__header">
                <span className="m2-flow-item__label" style={{ color: p.color }}>{p.label}</span>
                <span className="m2-flow-item__count">{count} strikes</span>
              </div>
              <div className="m2-flow-bar">
                <div className="m2-flow-bar__fill" style={{ width: `${w}%`, background: p.color }} />
              </div>
              <div className="m2-flow-item__desc">{p.desc}</div>
            </div>
          );
        })}
      </div>

      {strikes?.length > 0 && (
        <div className="m2-strikes">
          <div className="m2-strikes__head">
            <span>Strike</span><span>Type</span><span>Pattern</span><span>OI Δ</span><span>LTP Δ</span>
          </div>
          {strikes.slice(0, 8).map((s, i) => (
            <div key={i} className={`m2-strike-row m2-strike-row--${s.interpretation?.replace(/[^a-z]/g, '-') || 'neutral'}`}>
              <span className="m2-strike__price">{s.strike}</span>
              <span className={`m2-strike__type ${s.type === 'CE' ? 'type--ce' : 'type--pe'}`}>{s.type}</span>
              <span className="m2-strike__interp">{s.interpretation?.replace(/-/g, ' ')}</span>
              <span className="m2-strike__oichg" style={{ color: s.oiChange > 0 ? '#0d9488' : '#dc2626' }}>
                {s.oiChange > 0 ? '+' : ''}{s.oiChange?.toLocaleString('en-IN')}
              </span>
              <span className="m2-strike__ltpchg" style={{ color: s.ltpChange > 0 ? '#0d9488' : '#dc2626' }}>
                {s.ltpChange > 0 ? '+' : ''}{fmt(s.ltpChange)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Key levels panel ───────────────────────────────────────────────────────
function KeyLevelsPanel({ oiSr, maxPain, price, pcr }) {
  return (
    <div className="m2-card">
      <h3 className="m2-card__title">Key Levels</h3>

      <div className="m2-kl-grid">
        {oiSr?.resistance?.strike && (
          <div className="m2-kl m2-kl--resistance">
            <span className="m2-kl__badge">OI Resistance</span>
            <span className="m2-kl__price">{fmt(oiSr.resistance.strike, 0)}</span>
            <span className="m2-kl__note">Max CE OI — institutional wall</span>
            <span className="m2-kl__oi">OI: {oiSr.resistance.ceOi?.toLocaleString('en-IN')}</span>
          </div>
        )}
        {oiSr?.support?.strike && (
          <div className="m2-kl m2-kl--support">
            <span className="m2-kl__badge">OI Support</span>
            <span className="m2-kl__price">{fmt(oiSr.support.strike, 0)}</span>
            <span className="m2-kl__note">Max PE OI — institutional floor</span>
            <span className="m2-kl__oi">OI: {oiSr.support.peOi?.toLocaleString('en-IN')}</span>
          </div>
        )}
        {maxPain?.maxPainStrike && (
          <div className="m2-kl m2-kl--maxpain">
            <span className="m2-kl__badge">Max Pain</span>
            <span className="m2-kl__price">{fmt(maxPain.maxPainStrike, 0)}</span>
            <span className="m2-kl__note">Option writers' target at expiry</span>
          </div>
        )}
        {price && (
          <div className="m2-kl m2-kl--spot">
            <span className="m2-kl__badge">Spot</span>
            <span className="m2-kl__price">{fmt(price, 0)}</span>
            <span className="m2-kl__note">{oiSr?.priceRelation?.replace(/-/g, ' ') || ''}</span>
          </div>
        )}
      </div>

      {pcr && (
        <div className="m2-pcr">
          <span className="m2-pcr__label">PCR</span>
          <span className={`m2-pcr__value ${pcr.pcr > 1.1 ? 'pcr--bull' : pcr.pcr < 0.9 ? 'pcr--bear' : 'pcr--neutral'}`}>
            {fmt(pcr.pcr)}
          </span>
          <span className="m2-pcr__interp">{pcr.interpretation}</span>
          <span className="m2-pcr__detail">CE OI {pcr.totalCE_OI?.toLocaleString('en-IN')} · PE OI {pcr.totalPE_OI?.toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
}

// ── Indicators / macro panel ───────────────────────────────────────────────
function MacroPanel({ indicators, vix, session, ceQuote, peQuote, adx, macd, supertrend }) {
  const ind = indicators;
  return (
    <div className="m2-card">
      <h3 className="m2-card__title">Market Context</h3>

      <div className="m2-macro-grid">
        {ind && (
          <>
            <div className="m2-macro-item">
              <span className="m2-macro__label">EMA 20</span>
              <span className="m2-macro__value">{fmt(ind.ema20, 0)}</span>
            </div>
            <div className="m2-macro-item">
              <span className="m2-macro__label">EMA 50</span>
              <span className="m2-macro__value">{fmt(ind.ema50, 0)}</span>
            </div>
            <div className="m2-macro-item">
              <span className="m2-macro__label">VWAP</span>
              <span className="m2-macro__value">{fmt(ind.vwap, 0)}</span>
            </div>
            <div className="m2-macro-item">
              <span className="m2-macro__label">RSI (14)</span>
              <span className="m2-macro__value" style={{ color: ind.rsi > 60 ? '#dc2626' : ind.rsi < 40 ? '#0d9488' : 'inherit' }}>
                {fmt(ind.rsi, 1)}
              </span>
            </div>
          </>
        )}
        {adx?.adx != null && (
          <div className="m2-macro-item">
            <span className="m2-macro__label">ADX (14)</span>
            <span className="m2-macro__value" style={{ color: adx.adx >= 28 ? '#0d9488' : adx.adx < 20 ? '#dc2626' : '#f59e0b' }}>
              {adx.adx.toFixed(1)}
              <span style={{ fontSize: '0.7em', marginLeft: 4, opacity: 0.7 }}>
                {adx.adx >= 28 ? 'strong' : adx.adx < 20 ? 'chop' : 'mod'}
              </span>
            </span>
          </div>
        )}
        {macd && (
          <div className="m2-macro-item">
            <span className="m2-macro__label">MACD</span>
            <span className="m2-macro__value" style={{
              color: macd.crossover === 'bullish' ? '#0d9488' : macd.crossover === 'bearish' ? '#dc2626'
                   : macd.histogram === 'rising' ? '#0d9488' : macd.histogram === 'falling' ? '#dc2626' : 'inherit'
            }}>
              {macd.crossover !== 'none' ? macd.crossover.toUpperCase() + ' ✕' : macd.histogram}
            </span>
          </div>
        )}
        {supertrend && (
          <div className="m2-macro-item">
            <span className="m2-macro__label">SuperTrend</span>
            <span className="m2-macro__value" style={{ color: supertrend === 'UP' ? '#0d9488' : '#dc2626' }}>
              {supertrend}
            </span>
          </div>
        )}
        {vix?.value != null && (
          <div className="m2-macro-item">
            <span className="m2-macro__label">India VIX</span>
            <span className="m2-macro__value" style={{ color: vix.value >= 22 ? '#dc2626' : vix.value >= 18 ? '#f59e0b' : '#0d9488' }}>
              {fmt(vix.value, 2)}
            </span>
          </div>
        )}
        {session && (
          <div className="m2-macro-item">
            <span className="m2-macro__label">Session</span>
            <span className="m2-macro__value" style={{ color: session.allowed ? '#0d9488' : '#dc2626' }}>
              {session.allowed ? 'ACTIVE' : 'BLOCKED'}
            </span>
          </div>
        )}
      </div>

      {(ceQuote || peQuote) && (
        <div className="m2-atm">
          <div className="m2-atm__title">ATM Option Premiums</div>
          <div className="m2-atm-row">
            {ceQuote && (
              <div className="m2-atm-item m2-atm-item--ce">
                <span className="m2-atm__strike">{ceQuote.strike} CE</span>
                <span className="m2-atm__prem">₹{fmt(ceQuote.premium)}</span>
              </div>
            )}
            {peQuote && (
              <div className="m2-atm-item m2-atm-item--pe">
                <span className="m2-atm__strike">{peQuote.strike} PE</span>
                <span className="m2-atm__prem">₹{fmt(peQuote.premium)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recommendation history table ───────────────────────────────────────────
function HistoryTable({ history, livePremiums = {} }) {
  const [expanded, setExpanded] = useState(null);
  if (!history?.length) return null;

  return (
    <div className="m2-hist">
      <div className="m2-hist__header">
        <h3 className="m2-hist__title">Signal Log — What the system suggested</h3>
        <span className="m2-hist__count">{history.length} signals in the last 7 days</span>
      </div>

      <div className="m2-hist__wrap">
        <table className="m2-hist__table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Call</th>
              <th>Spot</th>
              <th>Entry ₹</th>
              <th>Current ₹</th>
              <th>SL ₹</th>
              <th>T1 ₹</th>
              <th>T2 ₹</th>
              <th>T3 ₹</th>
              <th>Conf</th>
              <th>EMA20</th>
              <th>EMA50</th>
              <th>RSI</th>
              <th>PCR</th>
              <th>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => {
              const t   = new Date(h.timestamp);
              const ist = new Date(t.getTime() + 5.5 * 60 * 60 * 1000);
              const timeStr = ist.toISOString().slice(11, 16);
              const dateStr = ist.toISOString().slice(5, 10).replace('-', '/');
              const isCE  = h.optionType === 'CE';
              const isExp = expanded === i;
              return (
                <tr key={i} className={isExp ? 'm2-hist__row--open' : ''}>
                  <td className="m2-hist__td-time">{dateStr} {timeStr}</td>
                  <td>
                    <span className={`m2-hist__badge ${isCE ? 'm2-hist__badge--ce' : 'm2-hist__badge--pe'}`}>
                      {h.action}
                    </span>
                  </td>
                  <td className="m2-hist__num">{fmt(h.spotPrice, 0)}</td>
                  <td className="m2-hist__num m2-hist__entry">₹{fmt(h.premiumEntry)}</td>
                  <td className="m2-hist__num m2-hist__current">
                    {(() => {
                      const cur = livePremiums[h.tradingsymbol];
                      if (cur == null) return <span style={{ color: '#475569' }}>—</span>;
                      const diff = cur - h.premiumEntry;
                      const pct  = h.premiumEntry > 0 ? (diff / h.premiumEntry * 100).toFixed(1) : 0;
                      const col  = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8';
                      return (
                        <span style={{ color: col }}>
                          ₹{fmt(cur)} <span style={{ fontSize: '0.65rem' }}>({diff > 0 ? '+' : ''}{pct}%)</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="m2-hist__num m2-hist__sl">₹{fmt(h.premiumSL)}</td>
                  <td className="m2-hist__num m2-hist__t1">₹{fmt(h.premiumT1)}</td>
                  <td className="m2-hist__num m2-hist__t2">₹{fmt(h.premiumT2)}</td>
                  <td className="m2-hist__num m2-hist__t3">₹{fmt(h.premiumT3)}</td>
                  <td className="m2-hist__num">{h.confidence}%</td>
                  <td className="m2-hist__num">{h.ema20 ?? '—'}</td>
                  <td className="m2-hist__num">{h.ema50 ?? '—'}</td>
                  <td className="m2-hist__num" style={{ color: h.rsi > 60 ? '#f87171' : h.rsi < 40 ? '#34d399' : '#94a3b8' }}>
                    {h.rsi ?? '—'}
                  </td>
                  <td className="m2-hist__num" style={{ color: h.pcr > 1.1 ? '#34d399' : h.pcr < 0.9 ? '#f87171' : '#94a3b8' }}>
                    {h.pcr ?? '—'}
                  </td>
                  <td>
                    <button className="m2-hist__expand" onClick={() => setExpanded(isExp ? null : i)}>
                      {isExp ? '▲ hide' : '▼ show'}
                    </button>
                    {isExp && (
                      <ul className="m2-hist__reasons">
                        {h.reasons.map((r, j) => <li key={j}>{r}</li>)}
                        {h.ulSl  != null && <li className="m2-hist__ul">Underlying SL: {fmt(h.ulSl, 0)} · T1: {fmt(h.ulT1, 0)} · T2: {fmt(h.ulT2, 0)}</li>}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ── Mailer Settings Panel ──────────────────────────────────────────────────
function MailerSettings() {
  const [config, setConfig]       = useState(null);  // { secretKeySet, signalEmail }
  const [secretKey, setSecretKey] = useState('');
  const [status, setStatus]       = useState(null);  // { type: 'ok'|'err', msg }
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [open, setOpen]           = useState(false);

  useEffect(() => {
    mailerApi.getConfig()
      .then(({ data: d }) => {
        setConfig(d);
        if (typeof d?.secretKey === 'string') setSecretKey(d.secretKey);
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (!secretKey) return;
    setSaving(true); setStatus(null);
    try {
      const { data: d } = await mailerApi.saveConfig(secretKey);
      setConfig(d);
      if (typeof d?.secretKey === 'string') setSecretKey(d.secretKey);
      setStatus({ type: 'ok', msg: 'Key saved — mail alerts are active' });
    } catch (e) {
      setStatus({ type: 'err', msg: e.response?.data?.error || e.message });
    } finally { setSaving(false); }
  }

  async function test() {
    setTesting(true); setStatus(null);
    try {
      const { data: d } = await mailerApi.sendTest();
      setStatus({ type: 'ok', msg: `Test email sent to ${d.sentTo}` });
    } catch (e) {
      setStatus({ type: 'err', msg: e.response?.data?.error || e.message });
    } finally { setTesting(false); }
  }

  return (
    <div className="m2-card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
           onClick={() => setOpen(o => !o)}>
        <h3 className="m2-card__title" style={{ margin: 0 }}>
          Mail Alerts
          {config?.secretKeySet && (
            <span style={{ marginLeft: 8, fontSize: 11, background: '#dcfce7', color: '#166534',
              padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>ACTIVE</span>
          )}
        </h3>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{open ? '▲ hide' : '▼ configure'}</span>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            Receive an email instantly for every new BUY/SELL signal, and a daily summary at 15:30 IST.
            Uses the <strong>nbnext mailer</strong> service — enter the secret key from your mailer dashboard.
          </p>

          <div style={{ maxWidth: 360, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              Mailer Secret Key
              {config?.secretKeySet && <span style={{ color: '#16a34a', marginLeft: 6 }}>● active</span>}
            </label>
            <input
              type="text"
              placeholder="Enter secret key"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={save} disabled={saving}
              style={{ padding: '7px 18px', background: '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={test} disabled={testing || !config?.secretKeySet}
              title={!config?.secretKeySet ? 'Save secret key first' : 'Send a test email'}
              style={{ padding: '7px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: (testing || !config?.secretKeySet) ? 'not-allowed' : 'pointer',
                opacity: (!config?.secretKeySet) ? 0.5 : 1 }}>
              {testing ? 'Sending…' : 'Send test email'}
            </button>
            {status && (
              <span style={{ fontSize: 13, color: status.type === 'ok' ? '#16a34a' : '#dc2626' }}>
                {status.type === 'ok' ? '✓' : '✗'} {status.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function Method2Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: json } = await method2Api.getMethod2();
      setData(json);
      setError(null);
      setLastFetch(new Date());
    } catch (e) {
      const msg = e.response?.data?.message;
      if (msg?.match(/token|expired|unauthorized/i)) {
        setError('__TOKEN_EXPIRED__');
      } else {
        setError(msg || e.message || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="m2-dashboard">
      {/* ── Nav tabs ── */}
      <MethodNav />

      {/* ── Header ── */}
      <div className="m2-header">
        <div className="m2-header__left">
          <h2 className="m2-header__title">Method 2 — Professional OI Analysis</h2>
          <p className="m2-header__sub">
            Chart · Option Chain · OI Flow · Macro — Professional 4-screen setup
          </p>
        </div>
        <div className="m2-header__right">
          <AutoTradeSwitch />
          {lastFetch && (
            <span className="m2-lastseen">Updated {lastFetch.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          )}
          <button className="m2-refresh-btn" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Token expired ── */}
      {error === '__TOKEN_EXPIRED__' && (
        <div className="zerodha-token-banner">
          <span>Zerodha token expired — data unavailable.</span>
          <a href="/api/v1/auth/zerodha/login" target="_blank" rel="noopener noreferrer" className="zerodha-token-banner__link">
            Login to Zerodha →
          </a>
        </div>
      )}
      {error && error !== '__TOKEN_EXPIRED__' && (
        <div className="m2-error">{error}</div>
      )}

      {loading && !data && (
        <div className="m2-loading">
          <div className="m2-loading__spinner" />
          <span>Loading OI analysis…</span>
        </div>
      )}

      {data && (
        <>
          {/* ── Direction bar ── */}
          <div className="m2-direction-bar">
            <div className="m2-direction-bar__left">
              <span className="m2-direction-bar__label">Market Direction</span>
              <DirectionChip direction={data.direction} />
            </div>
            <ConfBar bull={data.bullPct} bear={data.bearPct} />
          </div>

          {/* ── Row 1: Recommendation + Key Levels ── */}
          <div className="m2-row m2-row--top">
            <div className="m2-col m2-col--rec">
              <ActiveTradeCard trade={data.activeTrade} bullPct={data.bullPct} bearPct={data.bearPct} macd={data.macd} />
              {data.activeTrade?.status === 'active' && (
                <p className="m2-active__note">
                  Below is the live analysis — it will keep moving; the trade
                  above is governed by its levels, not by these swings.
                </p>
              )}
              <RecommendationCard
                rec={data.recommendation}
                direction={data.direction}
                confidence={data.confidence}
                noTradeReason={data.noTradeReason}
              />
            </div>
            <div className="m2-col m2-col--levels">
              <KeyLevelsPanel
                oiSr={data.oiSr}
                maxPain={data.maxPain}
                price={data.price}
                pcr={data.pcr}
              />
            </div>
          </div>

          {/* ── Row 2: OI Flow + Macro ── */}
          <div className="m2-row m2-row--bottom">
            <div className="m2-col m2-col--flow">
              <OiFlowPanel oiChange={data.oiChange} />
            </div>
            <div className="m2-col m2-col--macro">
              <MacroPanel
                indicators={data.indicators}
                vix={data.vix}
                session={data.session}
                ceQuote={data.ceQuote}
                peQuote={data.peQuote}
                adx={data.adx}
                macd={data.macd}
                supertrend={data.supertrend}
              />
            </div>
          </div>
        </>
      )}

      {/* ── History table ── */}
      {data && <HistoryTable history={data.history} livePremiums={data.livePremiums} />}

      {/* ── Backtest ── */}

      {/* ── Mailer settings ── */}
      <MailerSettings />
    </div>
  );
}
