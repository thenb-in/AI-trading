import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '@app/styles/MethodNav.css';

// THE navbar — one component, one source of truth. Every page used to carry
// its own hardcoded copy and they drifted apart (different pages showed
// different tab sets). Primary tabs stay visible; the rest live behind "+".

// Ordered by how often the user actually looks: Method 2 is the daily driver.
const PRIMARY = [
  { to: '/method2',  label: 'Method 2 — OI Analysis' },
  { to: '/desk',     label: 'Trade Desk' },
  { to: '/live',     label: 'Live Trading' },
  { to: '/chain',    label: 'Option Chain' },
  { to: '/backtest', label: 'Backtest' },
  { to: '/backtest-yt', label: 'YT Backtest' },
];

const MORE = [
  { to: '/backtest?m=m3', label: '★ M3 Backtest', match: '/backtest', q: 'm=m3' },
  { to: '/backtest?m=m2p', label: 'M2 + discipline Backtest', match: '/backtest', q: 'm=m2p' },
  { to: '/',         label: 'Method 1 — Chart + Signals' },
  { to: '/scalp',    label: 'Scalp — +2/−5 Report' },
  { to: '/seasonal', label: 'Seasonality' },
  { to: '/logic',    label: 'How it works' },
  { to: '/brief',    label: 'Trade Brief' },
];

function MethodNav() {
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const isActive = (item) => {
    const base = item.match ?? item.to;
    if (pathname !== base) return false;
    if (base === '/backtest') return item.q ? search.includes(item.q) : !(search.includes('m=m3') || search.includes('m=m2p'));
    return true;
  };
  const moreActive = MORE.some(isActive);

  const toggleOpen = () => setOpen(o => !o);

  return (
    <nav className="method-nav">
      {PRIMARY.map(item => (
        <Link key={item.label} to={item.to}
              className={`method-nav__tab ${isActive(item) ? 'method-nav__tab--active' : ''}`}>
          {item.label}
        </Link>
      ))}
      <span className="method-nav__more" ref={boxRef}>
        <button className={`method-nav__tab method-nav__plus ${moreActive ? 'method-nav__tab--active' : ''}`}
                onClick={toggleOpen} title="More screens">
          + more
        </button>
        {open && (
          <span className="method-nav__menu">
            {MORE.map(item => (
              <Link key={item.label} to={item.to} onClick={() => setOpen(false)}
                    className={`method-nav__item ${isActive(item) ? 'on' : ''}`}>
                {item.label}
              </Link>
            ))}
          </span>
        )}
      </span>
    </nav>
  );
}

export { MethodNav };
