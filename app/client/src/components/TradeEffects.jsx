import { useEffect, useRef, useState } from 'react';
import { marketApi } from '@app/services/api';
import './TradeEffects.css';

// Full-screen trade effects, on whatever page is open:
//  - target hit (T1/T2/T3 or final target exit)  → party poppers, 5 seconds
//  - stoploss hit at a loss                      → red blinkers, 5 seconds
// A trailing stop above entry banked profit, so it celebrates, not alarms.
// Fired only on transitions observed live (baseline kept in localStorage so
// reloading a page never replays an old outcome).

const DURATION = 5000;
const COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#facc15', '#4ade80'];

function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  };
  resize();
  const W = () => canvas.width, H = () => canvas.height;
  // two poppers, bottom corners, plus a top rain
  const parts = [];
  const spawn = (x, y, angle, spread, n, speed) => {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = (0.5 + Math.random()) * speed * dpr;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: (4 + Math.random() * 5) * dpr, h: (8 + Math.random() * 6) * dpr,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        drag: 0.985 + Math.random() * 0.01,
      });
    }
  };
  spawn(0, H(), -Math.PI / 3.2, 0.9, 90, 14);                    // bottom-left popper
  spawn(W(), H(), Math.PI + Math.PI / 3.2, 0.9, 90, 14);         // bottom-right popper
  for (let i = 0; i < 60; i++) {                                  // slow top rain
    parts.push({
      x: Math.random() * W(), y: -20 * dpr,
      vx: (Math.random() - 0.5) * 2 * dpr, vy: (1 + Math.random() * 2.5) * dpr,
      w: (4 + Math.random() * 5) * dpr, h: (8 + Math.random() * 6) * dpr,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[(Math.random() * COLORS.length) | 0], drag: 1,
    });
  }
  const g = 0.35 * dpr;
  const t0 = performance.now();
  let raf;
  const tick = (t) => {
    const elapsed = t - t0;
    ctx.clearRect(0, 0, W(), H());
    const fade = elapsed > DURATION - 800 ? Math.max(0, (DURATION - elapsed) / 800) : 1;
    ctx.globalAlpha = fade;
    for (const p of parts) {
      p.vx *= p.drag; p.vy = p.vy * p.drag + g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < DURATION) raf = requestAnimationFrame(tick);
    else canvas.remove();
  };
  raf = requestAnimationFrame(tick);
  window.addEventListener('resize', resize, { once: true });
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, DURATION + 200);
}

export default function TradeEffects() {
  const [alarm, setAlarm] = useState(false);
  const baseline = useRef({ loaded: false, lastId: null, activeKey: null });

  useEffect(() => {
    let dead = false;
    const fireAlarm = () => { setAlarm(true); setTimeout(() => { if (!dead) setAlarm(false); }, DURATION); };
    const poll = async () => {
      let d;
      try {
        const r = await marketApi.getMethod2Pulse();
        d = r.data;
      } catch { return; }
      const b = baseline.current;
      const activeKey = d.active ? `${d.active.id}:${d.active.targetsHit}` : null;
      const lastId = d.last?.id ?? null;
      if (!b.loaded) {
        // first observation this page-load: baseline from storage, no replay
        b.loaded = true;
        try {
          b.lastId = Number(localStorage.getItem('fx_lastId')) || lastId;
          b.activeKey = localStorage.getItem('fx_activeKey') ?? activeKey;
        } catch { b.lastId = lastId; b.activeKey = activeKey; }
      } else {
        // mid-trade target ratchets: same trade id, targetsHit increased
        if (d.active && b.activeKey) {
          const [pid, phit] = b.activeKey.split(':').map(Number);
          if (pid === d.active.id && d.active.targetsHit > phit) fireConfetti();
        }
        // a trade resolved since we last looked
        if (lastId != null && b.lastId != null && lastId !== b.lastId && d.last) {
          const win = d.last.exit != null && d.last.exit > d.last.entry;
          if (d.last.outcome === 'target' || win) fireConfetti();
          else if (d.last.outcome === 'stopped') fireAlarm();
        }
      }
      b.lastId = lastId ?? b.lastId;
      b.activeKey = activeKey;
      try {
        if (b.lastId != null) localStorage.setItem('fx_lastId', String(b.lastId));
        if (activeKey) localStorage.setItem('fx_activeKey', activeKey);
        else localStorage.removeItem('fx_activeKey');
      } catch { /* private mode */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  return alarm ? <div className="fx-alarm" aria-hidden="true" /> : null;
}
