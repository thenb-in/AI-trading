import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { MethodNav } from '../components/MethodNav.jsx';
import { Link } from 'react-router-dom';
import { optionChainApi } from '@app/services/api';
import '@app/styles/OptionChain.css';

const REFRESH_MS = 1000;

const n = (v, d = 0) => v == null ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const lakh = (v) => v == null ? '—' : v >= 100000 ? (v / 100000).toFixed(1) + 'L' : n(v);

function Cell({ side, data, isWall }) {
  if (!data) return <td colSpan="5" className="oc-empty">—</td>;
  const oiCh = data.oiChangeToday;
  const oi = <td className={`oc-oi ${isWall ? (side === 'CE' ? 'oc-wall--ce' : 'oc-wall--pe') : ''}`}>{lakh(data.oi)}</td>;
  const oich = <td className={`oc-oich ${oiCh > 0 ? 'up' : oiCh < 0 ? 'dn' : ''}`}>{oiCh == null ? '—' : (oiCh >= 0 ? '+' : '−') + lakh(Math.abs(oiCh))}</td>;
  const vol = <td className="oc-vol">{lakh(data.volume)}</td>;
  const sprd = <td className="oc-sprd" title={data.bid != null ? `bid ${data.bid} / ask ${data.ask}` : undefined}>{data.spread == null ? '—' : data.spread.toFixed(2)}</td>;
  const ltp = <td className={`oc-ltp ${data.changePct > 0 ? 'up' : data.changePct < 0 ? 'dn' : ''}`}>{n(data.ltp, 2)}</td>;
  return side === 'CE'
    ? <>{oi}{oich}{vol}{sprd}{ltp}</>
    : <>{ltp}{sprd}{vol}{oich}{oi}</>;
}

Cell.propTypes = {
  side: PropTypes.string,
  isWall: PropTypes.bool,
  data: PropTypes.shape({
    oiChangeToday: PropTypes.number,
    oi: PropTypes.number,
    volume: PropTypes.number,
    bid: PropTypes.number,
    ask: PropTypes.number,
    spread: PropTypes.number,
    changePct: PropTypes.number,
    ltp: PropTypes.number,
  }),
};

function OptionChain() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [chain, setChain] = useState(null);
  const [err, setErr] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);   // ["NIFTY:23000", ...]
  const timer = useRef(null);

  useEffect(() => {
    optionChainApi.getBookmarks()
      .then((payload) => setBookmarks(payload.bookmarks ?? []))
      .catch(() => {});
  }, []);

  const selectSymbol = (sym) => { setSymbol(sym); setChain(null); };

  const toggleBookmark = (strike) => {
    const key = `${symbol}:${strike}`;
    const next = bookmarks.includes(key)
      ? bookmarks.filter((b) => b !== key)
      : [...bookmarks, key];
    setBookmarks(next);                               // optimistic
    optionChainApi.saveBookmarks(next).catch(() => {});
  };

  const load = useCallback(async () => {
    try {
      const res = await optionChainApi.getLiveChain(symbol);
      setChain(res);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, [symbol]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const rows = chain?.rows ?? [];
  const marked = new Set(bookmarks.filter((b) => b.startsWith(`${symbol}:`)).map((b) => Number(b.split(':')[1])));
  const bookmarkedRows = rows.filter((r) => marked.has(r.strike));
  // ATM = the listed strike nearest to spot (strike steps differ per index)
  const atm = (chain?.spot != null && rows.length)
    ? rows.reduce((b, r) => Math.abs(r.strike - chain.spot) < Math.abs(b - chain.spot) ? r.strike : b, rows[0].strike)
    : null;
  const live = chain?.connected && chain?.spotAgeMs != null && chain.spotAgeMs < 15000;

  return (
    <div className="oc-page">
      <MethodNav />

      <header className="oc-header">
        <div className="oc-titlewrap">
          <h2>{symbol} option chain{chain?.expiry ? ` · exp ${chain.expiry}` : ''}</h2>
          <div className="oc-toggle" role="tablist" aria-label="Index">
            {['NIFTY', 'BANKNIFTY'].map((sym) => (
              <button key={sym} role="tab" aria-selected={symbol === sym}
                      className={`oc-toggle__btn ${symbol === sym ? 'oc-toggle__btn--on' : ''}`}
                      onClick={() => selectSymbol(sym)}>
                {sym}
              </button>
            ))}
          </div>
        </div>
        <div className="oc-spot">
          <span className={`oc-live ${live ? 'oc-live--on' : 'oc-live--off'}`}>
            {live ? '● LIVE — streaming' : chain?.connected ? '● connected, waiting for ticks' : '○ NOT CONNECTED'}
          </span>
          <b>{n(chain?.spot, 2)}</b>
        </div>
      </header>

      {!chain?.connected && (
        <div className="oc-banner">
          Websocket not connected{chain?.lastError ? ` — ${chain.lastError}` : ''}.
          If the daily Zerodha login is pending, complete it at
          {' '}<a href="/api/v1/auth/zerodha/login">/auth/zerodha/login</a> — the chain
          connects itself right after.
        </div>
      )}
      {err && <div className="oc-banner">Server unreachable: {err}</div>}

      {bookmarkedRows.length > 0 && (
        <div className="oc-bmstrip">
          {bookmarkedRows.map((r) => (
            <span key={r.strike} className="oc-bmchip">
              ★ {n(r.strike)}
              <em>CE {n(r.CE?.ltp, 2)} ({r.CE?.oiChangeToday >= 0 ? '+' : '−'}{lakh(Math.abs(r.CE?.oiChangeToday ?? 0))})</em>
              <em>PE {n(r.PE?.ltp, 2)} ({r.PE?.oiChangeToday >= 0 ? '+' : '−'}{lakh(Math.abs(r.PE?.oiChangeToday ?? 0))})</em>
              <button onClick={() => toggleBookmark(r.strike)} aria-label={`Remove bookmark ${r.strike}`}>×</button>
            </span>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="oc-scroll">
          <table className="oc-table">
            <thead>
              <tr>
                <th colSpan="5" className="oc-side oc-side--ce">CALLS (CE)</th>
                <th className="oc-strikehead">STRIKE</th>
                <th colSpan="5" className="oc-side oc-side--pe">PUTS (PE)</th>
              </tr>
              <tr>
                <th>OI</th><th>OI chg</th><th>Vol</th><th>Sprd</th><th>LTP</th>
                <th></th>
                <th>LTP</th><th>Sprd</th><th>Vol</th><th>OI chg</th><th>OI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.strike}
                    className={[
                      r.strike === atm ? 'oc-atm' : '',
                      chain.spot != null && r.strike < chain.spot ? 'oc-itm-ce' : 'oc-itm-pe',
                      r.strike === chain.support ? 'oc-band-s' : '',
                      r.strike === chain.resistance ? 'oc-band-r' : '',
                    ].join(' ')}>
                  <Cell side="CE" data={r.CE} isWall={r.strike === chain.resistance} />
                  <td className={`oc-strike ${marked.has(r.strike) ? 'oc-strike--bm' : ''}`}>
                    <button className={`oc-star ${marked.has(r.strike) ? 'oc-star--on' : ''}`}
                            onClick={() => toggleBookmark(r.strike)}
                            aria-label={`${marked.has(r.strike) ? 'Remove' : 'Add'} bookmark ${r.strike}`}
                            title={marked.has(r.strike) ? 'Remove bookmark' : 'Bookmark this strike'}>
                      {marked.has(r.strike) ? '★' : '☆'}
                    </button>
                    {n(r.strike)}
                    {r.strike === chain.resistance && <span className="oc-tag oc-tag--res">R wall</span>}
                    {r.strike === chain.support && <span className="oc-tag oc-tag--sup">S wall</span>}
                  </td>
                  <Cell side="PE" data={r.PE} isWall={r.strike === chain.support} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="oc-foot">
        Streams from Zerodha's websocket into server memory; this page reads the
        snapshot every second. OI chg is since today's open (anchored in DB).
        Sprd = live bid−ask; every minute of spread is recorded to measure our
        real slippage. S/R walls = largest PE/CE OI. Yellow row = ATM.
      </p>
    </div>
  );
}

export { OptionChain };
