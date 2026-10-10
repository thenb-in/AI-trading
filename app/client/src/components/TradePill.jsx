import { useEffect, useState } from 'react';
import { marketApi } from '@app/services/api';
import '@app/styles/TradePill.css';

// Global trade pill, bottom-right on EVERY screen: the live position while
// one is open, a quiet "watching" chip while none is. Rides the same light
// /pulse heartbeat the screen effects use — no heavy analysis polling.

const t2 = (v) => v == null ? '—' : Number(v).toFixed(2);

// Proactive unlock line: the concrete things that would push this toward a
// 10/10 — the gate gap, the breakout trigger distance (vs LIVE spot), the
// EMA20 cross — updating tick-by-tick, not at the analysis cadence.
function unlockLine(side, conv) {
  if (!conv || conv.spotLive == null) return null;
  const parts = [];
  const sidePct = side === 'BUY' ? conv.bullPct : conv.bearPct;
  if (sidePct < 70) parts.push(`gate ${sidePct}→70`);
  if (side === 'BUY' && conv.buyTrig != null) {
    const d = conv.buyTrig - conv.spotLive;
    parts.push(`brk↑ ${d > 0 ? d.toFixed(0) + ' away' : 'FIRED'}`);
  }
  if (side === 'SELL' && conv.sellTrig != null) {
    const d = conv.spotLive - conv.sellTrig;
    parts.push(`brk↓ ${d > 0 ? d.toFixed(0) + ' away' : 'FIRED'}`);
  }
  if (conv.ema20 != null) {
    const d = conv.spotLive - conv.ema20;
    if (side === 'BUY' && d < 0) parts.push(`EMA20 ${(-d).toFixed(0)} above`);
    if (side === 'SELL' && d > 0) parts.push(`EMA20 ${d.toFixed(0)} below`);
  }
  if (conv.macdCrossover !== 'none') {
    const contra = (side === 'BUY' && conv.macdCrossover === 'bearish') || (side === 'SELL' && conv.macdCrossover === 'bullish');
    if (contra) parts.push('MACD against');
  }
  return parts.length ? parts.slice(0, 3).join(' · ') : 'all conditions met';
}

// Enter-now score, same formula as the dashboard meter: distance from
// coin-flip to the 70% gate on the trade's own side; MACD contradiction caps 3.
function enterScore(active, conv) {
  if (!conv || conv.bullPct == null) return null;
  const sidePct = active.direction === 'BUY' ? conv.bullPct : conv.bearPct;
  let score = Math.round(1 + 9 * Math.min(1, Math.max(0, (sidePct - 50) / 20)));
  const contra = (active.direction === 'BUY' && conv.macdCrossover === 'bearish')
              || (active.direction === 'SELL' && conv.macdCrossover === 'bullish');
  if (contra) score = Math.min(score, 3);
  return { score, sidePct };
}

function TradePill() {
  const [d, setD] = useState(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let dead = false;
    const poll = () => marketApi.getMethod2Pulse()
      .then(payload => { if (!dead && payload) { setD(payload); setSeen(true); } })
      .catch(() => {});
    poll();
    const id = setInterval(poll, 1000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  if (!seen) return null;
  const active = d?.active ?? null;
  const conv = d?.conviction ?? null;

  // market direction chip — always on top of the stack
  const dir = conv ? (conv.bullPct >= 70 ? 'BULLISH' : conv.bearPct >= 70 ? 'BEARISH' : 'NEUTRAL') : null;
  const dirChip = (
    <span className={`tp-dir ${dir === 'BULLISH' ? 'tp-dir--up' : dir === 'BEARISH' ? 'tp-dir--dn' : ''}`}
          title="Live market direction from Method 2 (gate 70%)">
      <em>MARKET DIRECTION</em>
      <b>{dir ?? '—'}{conv?.prime ? ' ★' : ''}</b>
      {conv && (
        <span className="tp-dir__bar" title={`bull ${conv.bullPct}% · bear ${conv.bearPct}% · gate 70%`}>
          <i style={{ width: `${conv.bullPct}%` }} />
          <u style={{ left: '70%' }} />
          <u style={{ left: '30%' }} />
        </span>
      )}
      {conv && <span>bull {conv.bullPct}% · bear {conv.bearPct}%</span>}
    </span>
  );

  let pill;
  if (!active) {
    const best = conv ? Math.max(conv.bullPct, conv.bearPct) : null;
    const side = conv && conv.bearPct > conv.bullPct ? 'SELL' : 'BUY';
    pill = (
      <span className="tp-pill tp-pill--idle" title="The system is watching — no position is open">
        <span className="tp-pill__top">○ No active trade</span>
        <span className="tp-pill__sub">
          {best != null ? `watching · ${side} side ${best}% (gate 70%)` : 'watching for a 70%+ setup'}
        </span>
        {(() => { const u = conv ? unlockLine(side, conv) : null; return u ? <span className="tp-unlock">to a call: {u}</span> : null; })()}
      </span>
    );
  } else {
    const pnl = active.last != null ? active.last - active.entry : 0;
    const up = pnl >= 0;
    const m = enterScore(active, conv);
    pill = (
      <a className={`tp-pill ${up ? 'tp-pill--up' : 'tp-pill--dn'}`} href="/method2"
         title="Open the Method 2 trade card">
        <span className="tp-pill__top">
          <i className="tp-pill__dot" />
          LIVE · {active.direction} {active.strike}{active.tradingsymbol?.endsWith('PE') ? 'PE' : 'CE'}
          {conv?.prime ? <u className="tp-pill__prime">★</u> : null}
          <b>{up ? '+' : '−'}₹{Math.abs(pnl).toFixed(2)}/u</b>
          <small className={up ? 'tp-up' : 'tp-dn'}>({up ? '+' : '−'}₹{Math.abs(Math.round(pnl * 130)).toLocaleString('en-IN')})</small>
        </span>
        <span className="tp-pill__sub">
          Now {t2(active.last)}{active.live ? '●' : ''} · SL {t2(active.trailSl)} · T1 {t2(active.t1)}
          {active.targetsHit > 0 ? ` · T${active.targetsHit} ✓` : ''}
        </span>
        {m && (
          <span className="tp-meter" title={`${active.direction} side at ${m.sidePct}% (gate 70%)`}>
            <span className="tp-meter__scale">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} className={i < m.score ? 'lit' : ''}
                   style={i < m.score ? { background: m.score >= 8 ? '#34d399' : m.score >= 5 ? '#fbbf24' : '#f87171' } : undefined} />
              ))}
            </span>
            <small>enter {m.score}/10</small>
          </span>
        )}
        {(() => { const u = unlockLine(active.direction, conv); return u ? <span className="tp-unlock">to 10/10: {u}</span> : null; })()}
      </a>
    );
  }

  return (
    <span className="tp-stack" aria-hidden="true">
      {dirChip}
      {pill}
    </span>
  );
}

export { TradePill };
