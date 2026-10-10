import { useEffect, useState } from 'react';
import { marketApi } from '@app/services/api';
import '@app/styles/Clock.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Computed from UTC + 5:30 so it reads IST even on a mistimezoned machine —
// this clock answers "what time is it on the exchange", not on the laptop.
function istNow() {
  const d = new Date(Date.now() + 330 * 60 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return {
    date: `${DAYS[d.getUTCDay()]} · ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    time: `${hh}:${mm}:${ss}`,
  };
}

const inr = (v, dp = 2) => v == null ? '—' : v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

function SpotRow({ label, q }) {
  if (!q) return null;
  const up = (q.changePct ?? 0) >= 0;
  return (
    <span className="app-clock-spot">
      <span className="app-clock-spot__top">
        <em>{label}</em>
        <b>{inr(q.spot)}</b>
      </span>
      <span className="app-clock-spot__sub">
        <i className={up ? 'up' : 'dn'}>{up ? '▲' : '▼'} {Math.abs(q.changePct ?? 0).toFixed(2)}%</i>
        <u>op {inr(q.open)}</u>
      </span>
    </span>
  );
}

export default function Clock() {
  const [now, setNow] = useState(istNow);
  const [spots, setSpots] = useState(null);
  useEffect(() => {
    const id = setInterval(() => setNow(istNow()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let dead = false;
    const pull = () => marketApi.getSpotSummary()
      .then(payload => { if (!dead && payload) setSpots(payload); })
      .catch(() => {});
    pull();
    const id = setInterval(pull, 3000);
    return () => { dead = true; clearInterval(id); };
  }, []);
  return (
    <div className="app-clock" aria-hidden="true">
      <span className="app-clock-date">{now.date}</span>
      <span className="app-clock-time">{now.time} <em>IST</em></span>
      {spots && <SpotRow label="NIFTY" q={spots.NIFTY} />}
      {spots && <SpotRow label="BANKNIFTY" q={spots.BANKNIFTY} />}
    </div>
  );
}
