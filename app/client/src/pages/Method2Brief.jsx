import { useRef, useState } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { Link } from 'react-router-dom';
import './Method2Brief.css';

/**
 * The Method 2 trade-calculation brief — one page that says exactly how a
 * trade is derived from OI analysis, end to end. The copy button grabs the
 * rendered text of the whole document in one go.
 * Content matches the code as of 2026-09-25; update alongside logic changes.
 */
export default function Method2Brief() {
  const docRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(docRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — select the document instead so Ctrl+C works
      const range = document.createRange();
      range.selectNodeContents(docRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
    }
  };

  return (
    <div className="mb-page">
      <MethodNav />

      <div className="mb-toolbar">
        <button className="mb-copy" onClick={copyAll}>
          {copied ? 'Copied ✓' : 'Copy entire brief'}
        </button>
        <span className="mb-note">Matches the code as of 25 Sep 2026 (walk-forward config).</span>
      </div>

      <article ref={docRef} className="mb-doc">
        <h1>Method 2 — how a trade is calculated from OI analysis</h1>
        <p className="mb-lede">
          Method 2 turns the option chain's open-interest behaviour, plus price
          confirmation, into one number (confidence), one call (BUY / SELL /
          NEUTRAL), and — when the call clears its gates — one trade with
          frozen, chain-derived exit levels that is then managed by data until
          it resolves. Nothing below is a fixed percentage or a designer's
          guess unless explicitly labelled as one.
        </p>

        <h2>0. The data feeding it</h2>
        <ul>
          <li><b>Live chain feed</b> — once a minute, quotes for every NIFTY strike near ATM (nearest expiry): last price, open interest, traded volume. Held as a rolling 40-minute series in memory. This replaced a snapshot table whose stored prices proved ~63% stale.</li>
          <li><b>Streaming ticker</b> — a Zerodha websocket pushes tick-level LTP/OI/depth for ±800 points of chain; it drives the Option Chain page and records real bid–ask spreads every minute.</li>
          <li><b>1-minute candles</b> — for EMA/RSI/MACD/ADX/SuperTrend/ATR and VWAP.</li>
          <li><b>Daily instrument snapshot</b> — real contract symbols and expiries (weeklies expire Tuesday); option symbols are never fabricated from an assumed calendar.</li>
          <li><b>India VIX</b> — as a hard gate only.</li>
        </ul>

        <h2>1. Reading the chain: who did what (±25 points)</h2>
        <p>
          Over the last 10 minutes, for every strike: did OI rise or fall, and
          did the option's own price rise or fall? The four combinations name
          the actor:
        </p>
        <table>
          <thead><tr><th>ΔOI</th><th>Δprice</th><th>Reading</th><th>On a CALL means</th><th>On a PUT means</th></tr></thead>
          <tbody>
            <tr><td>↑</td><td>↑</td><td>fresh buying (long buildup)</td><td>bullish</td><td>bearish</td></tr>
            <tr><td>↑</td><td>↓</td><td>fresh writing (short buildup)</td><td>bearish</td><td>bullish</td></tr>
            <tr><td>↓</td><td>↓</td><td>longs exiting (unwinding)</td><td>bearish</td><td>bullish</td></tr>
            <tr><td>↓</td><td>↑</td><td>writers exiting (covering)</td><td>bullish</td><td>bearish</td></tr>
          </tbody>
        </table>
        <p>
          Rules that matter: the reading is <b>type-aware</b> (put buying is
          bearish — an earlier version scored it as support, observed live and
          fixed), and every vote is <b>volume-validated</b> — a strike with
          nothing traded in the window casts no vote, so bookkeeping OI prints
          cannot fake conviction. Score = (bullish votes − bearish votes) ÷
          total × 25.
        </p>

        <h2>2. PCR trend, not PCR level (±15 points)</h2>
        <p>
          The classic rule — "PCR above 1 is bullish" — was tested against a
          week of real per-minute OI and called direction at <b>46%, worse
          than a coin</b>. It earns zero points. What is scored is the
          <b> 10-minute change</b> in PCR: rising means put writers are adding
          (defending the downside) → bullish; falling means they are pulling
          back → bearish. Measured at 57–62% at a 30-minute horizon, robust
          across 5/10/15-minute windows.
        </p>
        <ul>
          <li>ΔPCR ≥ +0.02 → +15 &nbsp;·&nbsp; ≥ +0.01 → +8</li>
          <li>ΔPCR ≤ −0.02 → −15 &nbsp;·&nbsp; ≤ −0.01 → −8</li>
        </ul>

        <h2>3. Price confirmation (the other 45 points)</h2>
        <table>
          <thead><tr><th>Factor</th><th>Max</th><th>Rule</th></tr></thead>
          <tbody>
            <tr><td>EMA trend</td><td>±15</td><td>price &gt; EMA20 &gt; EMA50 = +15 (mirrored −15); price vs EMA20 alone = ±7.5. Was ±20 — lightened by walk-forward validation</td></tr>
            <tr><td>MACD</td><td>±10</td><td>crossover ±10; histogram ±6.7 with sign agreement, else ±3.3. Was ±15 — lightened by walk-forward validation</td></tr>
            <tr><td>OI S/R position</td><td>±10</td><td>price in the bottom 20% of the wall-to-wall band = +10; top 20% = −10; shaded between</td></tr>
            <tr><td>RSI</td><td>±10</td><td>&gt;65 = +10, &gt;55 = +5, &lt;35 = −10, &lt;45 = −5</td></tr>
            <tr><td>SuperTrend</td><td>±5</td><td>UP/DOWN = ±5</td></tr>
            <tr><td>ADX bonus</td><td>±5</td><td>ADX ≥ 28 adds 5 to whichever side already leads (strength, not direction)</td></tr>
          </tbody>
        </table>

        <h2>4. Confidence and the gates</h2>
        <pre>{`netScore   = sum of all eight factors        (−95 … +95)
bullPct    = (netScore + 95) / 190 × 100
CONFIDENCE = max(bullPct, 100 − bullPct)`}</pre>
        <ul>
          <li><b>70% gate</b> — below it the call is NEUTRAL ("factors split"). 70% ≈ 38 net points of agreement. Raised from 65 by walk-forward validation: across ten out-of-sample months the higher gate halved trades and friction and flipped the year from loss to profit.</li>
          <li><b>MACD contradiction screen</b> — a BUY against a hard bearish crossover (or mirrored) is vetoed.</li>
          <li><b>Hard gates</b> — ADX &lt; 20 (no trend) or VIX ≥ 22 blocks everything. Session gates (lunch, open, close) are OFF by choice: the analysis decides, not the clock.</li>
          <li><b>Honesty guard</b> — if every factor reads zero (dead Zerodha token), the dashboard says "no data", never a fake 50/50.</li>
          <li>Email alerts require ≥ 75%.</li>
        </ul>

        <h2>5. Building the trade: exits from the chain itself</h2>
        <p>
          A BUY buys the ATM call; a SELL buys the ATM put — a real contract
          from the instrument snapshot. Stop and targets are <b>not
          percentages</b>; they are the chain's own structure translated into
          premium:
        </p>
        <ul>
          <li><b>Stop</b> = the premium this option would carry if the index broke the <i>defending OI wall</i> (the put wall below for a BUY, call wall above for a SELL).</li>
          <li><b>Targets</b> = the opposing wall, max pain (only when it lies beyond spot in the trade's favour), and a wall-span extension — nearest first, so T1 &lt; T2 &lt; T3 always. Each step is capped at +50% of entry premium (T1 ≤ 1.5×, T2 ≤ 2×, T3 ≤ 2.5×): a chain level may pull a target nearer, never further.</li>
          <li><b>Conversion</b> — each index level becomes a premium via the option's own implied volatility, solved from its live quoted price (bisection on Black-Scholes). Same-day assumption; theta makes far targets slightly optimistic.</li>
          <li><b>R:R is whatever the geometry gives</b> — T1 can honestly be 0.7 when the opposing wall is close. If the chain is degenerate (missing walls, unsolvable IV), an ATR fallback is used and labelled as such in the reasons.</li>
        </ul>

        <h2>6. Managing the trade: levels, not moods</h2>
        <p>
          A gated signal opens <b>one</b> active trade with frozen levels. The
          live analysis keeps moving underneath — that is information, not a
          reason to unsay the call. Only data resolves the trade:
        </p>
        <ul>
          <li><b>Stays ACTIVE</b> — premium above the (trailing) stop, defending wall intact, thesis not reversed. A dip is reported as drawdown with the levels, calmly.</li>
          <li><b>STOPPED</b> — premium at the trailing stop, or the index closing through the wall the stop was built on (structure gone beats price printing).</li>
          <li><b>Targets ratchet the stop</b> — after T1 the stop moves to entry (the trade can no longer lose); after T2, to T1. T3 completes it. Independently, once the premium has been 1R in favour (entry + [entry − stop]), the stop rises to entry + costs even if T1 hasn't printed.</li>
          <li><b>INVALIDATED</b> — the analysis flipping to the <i>opposite</i> side at ≥70% is an exit. Holding against your own signal is hope.</li>
          <li><b>EOD</b> — force-close 15:20; nothing carries overnight.</li>
        </ul>
        <p>
          A minute-cron resolves trades even when no dashboard is open. Every
          resolution and its reason is persisted — the calls build a judgeable
          ledger.
        </p>

        <h2>7. What is measured vs what is assumed</h2>
        <ul>
          <li><b>Measured</b>: PCR-level's failure (46%) and PCR-trend's edge (57–62% @ 30 min); buildup votes 59% @ 30 min; the type-blind scoring bug; the stale-snapshot input (both fixed). A permanent benchmark re-scores any change — nothing ships unless it beats the incumbent on unseen data.</li>
          <li><b>Assumed (declared honestly)</b>: the chain-factor weights (25/15/10) remain design choices. The price-factor weights and the 70% gate are no longer assumptions — they were selected by walk-forward validation (3-month train, 1-month test, ten out-of-sample months: +₹2.19L vs −₹0.82L for the old manual config). Slippage in backtests is 0.25 pts/side; real bid–ask spreads are being recorded every minute to replace that assumption with measurement.</li>
          <li><b>Sample sizes are small</b> — one week of real per-minute OI history, growing daily. Percentages sharpen as the harvest and the forward ledger grow; treat every number as an estimate with error bars, not a promise.</li>
        </ul>
      </article>
    </div>
  );
}
