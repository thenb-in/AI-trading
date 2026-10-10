import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { MethodNav } from '../components/MethodNav.jsx';
import { liveTradingApi } from '@app/services/api';
import '@app/styles/TradeDesk.css';

// THE screen: everything needed to take (or not take) a trade, in the order
// it matters — can I trade right now → what is the call → what is running →
// how is the day. Centre stage belongs to the state banner, and its loudest
// state is the PRIME CALL: a Method-2 conviction call confirmed by a live
// Method-1 breakout — the highest-quality signal class ever measured here
// (PF 1.40, 50.9% win, drawdown −28% over 4 years).

const t2 = (v) => v == null ? '—' : Number(v).toFixed(2);
const inr = (v) => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;

function deskState(d) {
  if (!d) return { key: 'loading', title: 'Connecting…', sub: '' };
  const trade = d.activeTrade?.status === 'active' ? d.activeTrade : null;
  if (trade) {
    const pnl = trade.statusInfo?.pnlPerUnit ?? 0;
    return {
      key: pnl >= 0 ? 'intrade-up' : 'intrade-dn',
      title: `IN TRADE · ${trade.direction} ${trade.tradingsymbol}`,
      sub: `${pnl >= 0 ? '+' : '−'}₹${Math.abs(pnl).toFixed(2)}/unit · the trade resolves on its levels, not the mood`,
    };
  }
  const best = Math.max(d.bullPct ?? 50, d.bearPct ?? 50);
  const side = (d.bullPct ?? 0) >= (d.bearPct ?? 0) ? 'BUY' : 'SELL';
  if (d.direction !== 'NEUTRAL' && d.prime) {
    return {
      key: 'prime',
      title: `★ PRIME ${d.direction} CALL — breakout confirmed`,
      sub: `Conviction ${best}% AND a live swing-S/R breakout agree — the rarest, highest-quality setup this system knows (PF 1.40 class). `,
    };
  }
  if (d.direction !== 'NEUTRAL') {
    return {
      key: d.direction === 'BUY' ? 'call-up' : 'call-dn',
      title: `${d.direction} CALL · ${best}%`,
      sub: 'Conviction cleared the 70% gate. No breakout confirmation — a standard-grade call.',
    };
  }
  if (d.breakout?.sig) {
    return {
      key: 'forming',
      title: `Breakout ${d.breakout.sig === 1 ? 'UP' : 'DOWN'} fired — conviction not there`,
      sub: `Price broke structure but ${d.breakout.sig === 1 ? 'bull' : 'bear'} conviction is ${d.breakout.sig === 1 ? d.bullPct : d.bearPct}% (< 70%). The system does not chase price without the chain agreeing.`,
    };
  }
  if (best >= 60) {
    return { key: 'forming', title: `FORMING · ${side} side at ${best}%`, sub: 'Below the 70% gate — watching, not calling.' };
  }
  return { key: 'wait', title: 'WAIT — no edge', sub: d.noTradeReason || 'Factors are split; standing aside is the position.' };
}

// One scored factor: a centred diverging bar (its live contribution toward
// bull/bear against its maximum weight) plus the raw number behind it.
function FactorBar({ name, value, max, note }) {
  const v = Number(value) || 0;
  const pct = Math.min(100, Math.abs(v) / max * 100);
  return (
    <div className="td-factor">
      <span className="td-factor__name">{name}</span>
      <div className="td-factor__track">
        <div className={`td-factor__fill ${v >= 0 ? 'up' : 'dn'}`}
             style={{ width: `${pct / 2}%`, [v >= 0 ? 'left' : 'right']: '50%' }} />
        <i className="td-factor__mid" />
      </div>
      <span className={`td-factor__pts ${v > 0 ? 'up' : v < 0 ? 'dn' : ''}`}>{v > 0 ? '+' : ''}{v}/{max}</span>
      <span className="td-factor__note">{note}</span>
    </div>
  );
}

FactorBar.propTypes = {
  name: PropTypes.string,
  value: PropTypes.number,
  max: PropTypes.number,
  note: PropTypes.node,
};

function ProCard({ label, value, sub, tone }) {
  return (
    <div className={`td-pro ${tone ?? ''}`}>
      <em>{label}</em>
      <b>{value}</b>
      <span>{sub}</span>
    </div>
  );
}

ProCard.propTypes = {
  label: PropTypes.string,
  value: PropTypes.node,
  sub: PropTypes.node,
  tone: PropTypes.string,
};

function TradeDesk() {
  const [d, setD] = useState(null);
  const [at, setAt] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let dead = false;
    const pull = () => liveTradingApi.getMethod2()
      .then(x => { if (!dead) { setD(x); setErr(null); } })
      .catch(e => { if (!dead) setErr(String(e.message || e.error || e)); });
    pull();
    const id = setInterval(pull, 5000);
    return () => { dead = true; clearInterval(id); };
  }, []);
  useEffect(() => {
    let dead = false;
    const pull = () => liveTradingApi.getAutotradeState()
      .then(x => { if (!dead && x) setAt(x); }).catch(() => {});
    pull();
    const id = setInterval(pull, 3000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  const st = deskState(d);
  const trade = d?.activeTrade?.status === 'active' ? d.activeTrade : null;
  const rec = d?.recommendation;
  const oneR = trade ? Number(trade.entryPremium) - Number(trade.slPremium) : null;

  return (
    <div className="td-page">
      <MethodNav />

      {/* can I trade right now */}
      <div className="td-strip">
        <span className={`td-chip ${err ? 'bad' : 'ok'}`}>{err ? `data: ${err}` : 'data live'}</span>
        {at && <span className={`td-chip ${at.mode === 'live' ? 'ok' : at.mode === 'dry' ? 'warn' : ''}`}>auto: {at.mode.toUpperCase()}</span>}
        {at && <span className={`td-chip ${at.tradesToday >= at.maxTradesDay ? 'bad' : ''}`}>trades {at.tradesToday}/{at.maxTradesDay}</span>}
        {at && <span className={`td-chip ${at.stopsToday >= at.maxStopsDay ? 'bad' : at.stopsToday === at.maxStopsDay - 1 ? 'warn' : ''}`}>stops {at.stopsToday}/{at.maxStopsDay}</span>}
        {at && <span className={`td-chip ${at.dayNetRs >= 0 ? 'ok' : 'bad'}`}>day {inr(at.dayNetRs)}</span>}
        {at?.blocked && <span className="td-chip bad">⛔ {at.blocked}</span>}
        {d?.seasonal?.tilt !== 0 && d?.seasonal && <span className="td-chip">{d.seasonal.month}: {d.seasonal.tilt > 0 ? 'bullish month' : 'bearish month'}</span>}
      </div>

      {/* the state banner — the one thing to glance at */}
      <section className={`td-banner td-banner--${st.key}`}>
        <h1>{st.title}</h1>
        <p>{st.sub}</p>
        {!trade && d && (
          <div className="td-conv">
            <div className="td-conv__bar">
              <i style={{ width: `${d.bullPct}%` }} />
              <em style={{ left: '70%' }} title="entry gate 70%" />
              <em style={{ left: '30%' }} title="entry gate 70% (bear side)" />
            </div>
            <span>bull {d.bullPct}% · bear {d.bearPct}% · gate 70%</span>
          </div>
        )}
      </section>

      {/* the proposed trade, when there is a call and no open position */}
      {rec && !trade && (
        <section className="td-card td-card--rec">
          <h3>{d.prime ? '★ Prime call' : 'The call'} — {rec.tradingsymbol}</h3>
          <div className="td-levels">
            <span>Entry <b>₹{t2(rec.premiumEntry)}</b></span>
            <span>Stop <b className="dn">₹{t2(rec.premiumSL)}</b></span>
            <span>T1 <b className="up">₹{t2(rec.premiumT1)}</b></span>
            <span>T2 <b className="up">₹{t2(rec.premiumT2)}</b></span>
            <span>T3 <b className="up">₹{t2(rec.premiumT3)}</b></span>
          </div>
          {Array.isArray(rec.reasons) && rec.reasons.length > 0 && (
            <ul className="td-reasons">{rec.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}</ul>
          )}
        </section>
      )}

      {/* the running trade, front and centre while it lives */}
      {trade && (
        <section className="td-card td-card--trade">
          <h3>Position · called at {trade.confidenceAtEntry}%</h3>
          <div className="td-levels td-levels--big">
            <span>Entry <b>₹{t2(trade.entryPremium)}</b></span>
            <span>Now <b>₹{t2(trade.lastPremium)}</b></span>
            <span>Stop <b className="dn">₹{t2(trade.trailSl)}</b>{Number(trade.trailSl) > Number(trade.slPremium) ? ' (trailed)' : ''}</span>
            <span>T1 <b className="up">₹{t2(trade.t1)}</b>{trade.targetsHit >= 1 ? ' ✓' : ''}</span>
            <span>T2 <b className="up">₹{t2(trade.t2)}</b>{trade.targetsHit >= 2 ? ' ✓' : ''}</span>
            <span>T3 <b className="up">₹{t2(trade.t3)}</b></span>
          </div>
          {oneR > 0 && (
            <p className="td-next">
              Next machine moves: at <b>₹{t2(Number(trade.entryPremium) + oneR)}</b> (1R) the stop jumps to breakeven;
              beyond it the stop trails 1.5R (₹{t2(oneR * 1.5)}) behind the high. Wall {trade.ulLevels?.sl ?? '—'} guards the thesis.
            </p>
          )}
          <p className="td-line">{trade.statusInfo?.line}</p>
        </section>
      )}

      {/* what the pros glance at before anything else */}
      {d && (
        <section className="td-procards">
          <ProCard label="NIFTY" value={d.day?.spot != null ? Number(d.day.spot).toLocaleString('en-IN') : (d.price != null ? Number(d.price).toLocaleString('en-IN') : '—')}
                   sub={d.day?.ohlc ? `O ${t2(d.day.ohlc.open)} · H ${t2(d.day.ohlc.high)} · L ${t2(d.day.ohlc.low)}` : 'day range after open'} />
          <ProCard label="VWAP" value={d.indicators?.vwap != null ? t2(d.indicators.vwap) : '—'}
                   tone={d.indicators?.vwap != null && d.price != null ? (d.price >= d.indicators.vwap ? 'up' : 'dn') : ''}
                   sub={d.indicators?.vwap != null && d.price != null ? (d.price >= d.indicators.vwap ? 'price above — buyers in charge' : 'price below — sellers in charge') : 'needs session data'} />
          <ProCard label="EMA 20/50" value={d.indicators?.ema20 != null ? `${t2(d.indicators.ema20)} / ${t2(d.indicators.ema50)}` : '—'}
                   tone={d.indicators?.ema20 > d.indicators?.ema50 ? 'up' : d.indicators?.ema20 < d.indicators?.ema50 ? 'dn' : ''}
                   sub={d.indicators?.ema20 > d.indicators?.ema50 ? 'bullish stack' : d.indicators?.ema20 < d.indicators?.ema50 ? 'bearish stack' : '—'} />
          <ProCard label="RSI" value={d.indicators?.rsi != null ? Number(d.indicators.rsi).toFixed(1) : '—'}
                   tone={d.indicators?.rsi >= 60 ? 'up' : d.indicators?.rsi <= 40 ? 'dn' : ''}
                   sub={d.indicators?.rsi >= 70 ? 'overbought zone' : d.indicators?.rsi <= 30 ? 'oversold zone' : 'neutral band'} />
          <ProCard label="ADX" value={d.adx?.value != null ? Number(d.adx.value).toFixed(1) : '—'}
                   tone={d.adx?.value >= 28 ? 'up' : ''}
                   sub={d.adx?.value >= 28 ? 'trending — score bonus active' : d.adx?.value >= 20 ? 'mild trend' : 'chop — breakouts suspect'} />
          <ProCard label="PCR" value={d.pcr != null ? Number(d.pcr).toFixed(2) : '—'}
                   sub={d.pcr != null ? (d.pcr > 1.2 ? 'put-heavy (support below)' : d.pcr < 0.8 ? 'call-heavy (ceiling above)' : 'balanced book') : 'chain warming up'} />
          <ProCard label="ATM IV" value={d.atmIv ? `${d.atmIv.ce ?? '—'} / ${d.atmIv.pe ?? '—'}` : '—'}
                   tone={d.atmIv?.skew > 2 ? 'dn' : ''}
                   sub={d.atmIv?.skew != null ? `skew ${d.atmIv.skew > 0 ? '+' : ''}${d.atmIv.skew} — ${d.atmIv.skew > 2 ? 'puts bid: fear in the market' : d.atmIv.skew < -2 ? 'calls bid: chase up' : 'calm'}` : 'CE / PE implied vol'} />
          <ProCard label="VIX" value={d.vix?.value != null ? Number(d.vix.value).toFixed(2) : '—'}
                   tone={d.vix?.value != null && !d.vix.safe ? 'dn' : ''}
                   sub={d.vix?.value == null ? 'unavailable' : d.vix.safe ? 'within trading range' : 'elevated — size down'} />
        </section>
      )}

      {/* the live anatomy of the verdict: every scored factor, as it scores */}
      {d?.scores && (
        <section className="td-card">
          <h3>What's moving the needle <small>(live factor contributions · bull → / ← bear)</small></h3>
          <FactorBar name="OI buildup" value={d.scores.oiBuildup} max={25}
                     note={d.oiChange?.summary ? `L${d.oiChange.summary.longBuildup ?? 0} S${d.oiChange.summary.shortBuildup ?? 0} SC${d.oiChange.summary.shortCovering ?? 0} LU${d.oiChange.summary.longUnwinding ?? 0}` : 'feed warming'} />
          <FactorBar name="PCR trend" value={d.scores.pcr} max={15}
                     note={d.pcr != null ? `PCR ${Number(d.pcr).toFixed(2)}` : '—'} />
          <FactorBar name="OI S/R" value={d.scores.oiSr} max={10}
                     note={`walls ${d.oiSr?.support?.strike ?? '—'} / ${d.oiSr?.resistance?.strike ?? '—'}`} />
          <FactorBar name="EMA" value={d.scores.ema} max={15}
                     note={d.indicators?.ema20 != null ? `20: ${t2(d.indicators.ema20)} vs 50: ${t2(d.indicators.ema50)}` : '—'} />
          <FactorBar name="MACD" value={d.scores.macd} max={10}
                     note={d.macd ? (d.macd.crossover !== 'none' ? `${d.macd.crossover} crossover` : `histogram ${d.macd.histogram}`) : '—'} />
          <FactorBar name="RSI" value={d.scores.rsi} max={10}
                     note={d.indicators?.rsi != null ? `RSI ${Number(d.indicators.rsi).toFixed(1)}` : '—'} />
          <FactorBar name="SuperTrend" value={d.scores.supertrend} max={5}
                     note={d.supertrend ?? '—'} />
          <FactorBar name="ADX bonus" value={d.adx?.value >= 28 ? ((d.bullPct ?? 50) >= 50 ? d.scores.adxBonus : -d.scores.adxBonus) : 0} max={5}
                     note={d.adx?.value != null ? `ADX ${Number(d.adx.value).toFixed(1)} (hot ≥28)` : '—'} />
          <FactorBar name="Seasonal" value={d.seasonal?.nudge ?? 0} max={2}
                     note={d.seasonal ? `${d.seasonal.month}${d.seasonal.enabled ? '' : ' (tilt off)'}` : '—'} />
          <FactorBar name="Breakout" value={(d.breakout?.sig ?? 0) * 5} max={5}
                     note={d.breakout?.ready ? (d.breakout.sig === 1 ? 'fired UP' : d.breakout.sig === -1 ? 'fired DOWN' : 'armed, not fired') : 'warming'} />
          <p className="td-note">
            Chain factors (OI, PCR, S/R) are 50 of 95 points; price factors the rest. The % at the top is this board
            summed and mapped to 0–100. Breakout and seasonal lean the verdict; they are not scored into the 95.
          </p>
        </section>
      )}

      {/* structure context: where the next triggers sit */}
      {d?.breakout?.ready && (
        <section className="td-card">
          <h3>Structure (5-min swings)</h3>
          <div className="td-levels">
            <span>Breakout UP above <b className="up">{t2(d.breakout.buyTrig)}</b></span>
            <span>Breakout DOWN below <b className="dn">{t2(d.breakout.sellTrig)}</b></span>
            <span>OI walls <b>{d.oiSr?.support?.strike ?? '—'} / {d.oiSr?.resistance?.strike ?? '—'}</b></span>
            <span>Max pain <b>{d.maxPain?.maxPainStrike ?? '—'}</b></span>
          </div>
          <p className="td-note">
            A breakout through structure WITH conviction ≥70% = the prime setup. Breakout alone is noise;
            conviction alone is the standard call. This screen shouts only when both agree.
          </p>
        </section>
      )}

      <p className="td-foot">
        Prime call = Method 1 swing-breakout confirming a Method 2 conviction call — measured at PF 1.40, 50.9% win,
        −28% drawdown over 4 years (vs PF 1.24, 47.3% for conviction alone), at roughly a third of the trade count.
        Auto-execution, levels, trailing and all caps behave exactly as on the Live Trading screen.
      </p>
    </div>
  );
}

export { TradeDesk };
