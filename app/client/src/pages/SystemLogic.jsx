import { useState, useEffect } from 'react';
import MethodNav from '../components/MethodNav.jsx';
import { Link } from 'react-router-dom';
import { marketApi } from '@app/services/api';
import './SystemLogic.css';

// The experiment record. These are finished results — fixed history, kept
// short on purpose. Full detail lives in SCALP_BACKTEST_RESULTS.md and the
// scalp_reports table.
const HISTORY = [
  {
    when: 'Mar–Apr 2026',
    what: 'First engine (TypeScript): trend-following with OI, MACD, regime gates. Five backtest rounds tuning it.',
    result: 'Best honest run: 54 trades over a year, 55.6% wins, +0.328R expectancy. An "80% accuracy" variant was a mirage — only 10 trades.',
    verdict: 'ok',
  },
  {
    when: 'Apr 2026',
    what: 'Exit logic rewritten; later backtests quietly switched to simulated (random) OI data.',
    result: 'Expectancy collapsed to ~0. The two headline runs (187 and 221 trades) were validating nothing real.',
    verdict: 'bad',
  },
  {
    when: 'May 2026',
    what: 'Full rebuild as this app (Method 2 dashboard). Old engine deleted.',
    result: 'Shipped without any backtest — an untested signal, later fixed.',
    verdict: 'bad',
  },
  {
    when: 'Sep 8, 2026',
    what: 'Scalp idea: fade small volatile ranges, +2/−5 on option premium, 2 lots. Backtested on a year of 5-min candles with modelled premiums.',
    result: 'Won 64.5% but needed ~85% — costs of ~₹167/trade dominate. All 48 target/stop shapes lost. +1/−5 is unwinnable: a winning trade nets ≤ ₹0.',
    verdict: 'bad',
  },
  {
    when: 'Sep 8, 2026',
    what: 'Data upgraded: 1-minute candles, then REAL traded option premiums with per-minute OI (harvested daily — Zerodha deletes them at expiry).',
    result: 'Real premiums confirmed the modelled verdict: 64–70% win rates, never enough. Also exposed two data bugs (stale snapshot prices, expiry years stored as 2001).',
    verdict: 'ok',
  },
  {
    when: 'Sep 8, 2026',
    what: 'Option-chain confirmation added: only trade when writers are building OI on the side that defends the entry. Plus a stricter regime filter.',
    result: 'Raised win rate in 12 of 12 comparisons. strict+OIflow +3/−5: 25 trades, 80% wins vs 78.7% needed — first configuration ever profitable after all charges (+₹340 at 2 lots).',
    verdict: 'good',
  },
  {
    when: 'Sep 8, 2026',
    what: 'Variations tested: skipping expiry days, and position size 2 → 4 → 6 lots.',
    result: 'Skipping expiry days hurt (both expiry days were profitable). Size scales super-linearly — flat ₹40 brokerage dilutes: +₹340 @2L → +₹3,378 @6L. Losing configs lose more with size.',
    verdict: 'ok',
  },
  {
    when: 'Sep 23, 2026',
    what: 'Method 2 OI analysis validated against real per-minute OI, then rewired: fresh live chain feed replaces the stale snapshot table; PCR level dropped from scoring (46% — worse than a coin); PCR 10-min trend scored instead; buildup votes now require traded volume.',
    result: 'Benchmark (permanent, in DB): PCR trend 57–62% at 15–30 min across all windows; buildup votes 59% at 30 min; PCR level and standalone flow near coin. Nothing chain-only approaches the "80%" folklore — that number is win-rate geometry, not direction-calling.',
    verdict: 'good',
  },
  {
    when: 'Now',
    what: 'Forward paper test: the engine trades strict+OIflow +3/−5 live, every minute, against real quotes.',
    result: 'This ledger — not any backtest — decides whether real money ever trades. ~25-trade backtest samples are suggestive, not proof.',
    verdict: 'live',
  },
];

// Parameter sets over time — just the values and when they were in force.
const PARAM_TIMELINE = [
  {
    when: 'Mar–Apr 2026', name: 'Trend engine v1 (old app)',
    params: ['8-factor score', 'confidence ≥ 72–75%', 'SL 1.5× ATR', 'T1 1.0–1.5R by ADX',
             'max 2 trades/day', 'ADX ≥ 20', 'VIX < 22', 'circuit breaker 2–4 stops'],
  },
  {
    when: 'May 2026', name: 'Method 2 (this app)',
    params: ['105-pt score: OI 25 · PCR 15 · EMA 20 · MACD 15 · OI-S/R 10 · RSI 10 · ST 5 · ADX 5',
             'trade gate 75%', 'email gate 75%'],
  },
  {
    when: 'Sep 8, 2026', name: 'Method 2 gate fix',
    params: ['trade gate 75% → 65%', 'MACD screen on every shown signal'],
  },
  {
    when: 'Sep 8, 2026', name: 'Scalp v1',
    params: ['window 20 × 1-min', 'efficiency ≤ 0.35', 'band 0.08–0.35%', 'path ≥ 1.6×',
             'edge zone 25%', '+2 / −5 pts', 'cap ₹100', 'hold ≤ 15 min', '2 lots (130)',
             'slippage 0.25/side', 'breaker 3 stops'],
  },
  {
    when: 'Sep 8, 2026', name: 'Scalp revisions (same day)',
    params: ['cap ₹100 → ₹250', 'hold 15 min → none (EOD 15:20)', 'target +2 → +3'],
  },
  {
    when: 'Sep 23, 2026', name: 'Method 2 OI rewiring',
    params: ['input: live 1-min chain feed (snapshots retired)', 'PCR level: unscored',
             'PCR 10-min trend: ±8 / ±15 pts at ±0.01 / ±0.02', 'buildup votes: volume-validated',
             'benchmark gate: beat 59–62% @30 min or don\u2019t ship'],
  },
  {
    when: 'Sep 25, 2026', name: 'Walk-forward adoption (Method 2)',
    params: ['gate 65% → 70%', 'EMA weight 20 → 15', 'MACD weight 15 → 10',
             'chosen by 3m-train/1m-test walk-forward: OOS +₹2.19L vs −₹0.82L manual, PF 1.19, half the trades'],
  },
  {
    when: 'Sep 29, 2026', name: 'Exit discipline (Method 2 trades)',
    params: ['targets capped: T1 ≤ 1.5× / T2 ≤ 2× / T3 ≤ 2.5× entry (max +50% a step)',
             '1R breakeven ratchet — 1R in favour moves stop to entry + costs',
             'chain-exit sanity: targets within 2.5% of spot, IV 4–150%',
             'after a +166% winner round-tripped to a loss under a +300% T1'],
  },
  {
    when: 'Sep 8, 2026 → now', name: 'strict + OI-flow (current, live)',
    params: ['efficiency ≤ 0.22', 'path ≥ 2.2×', 'edge zone 12%', 'OI-flow gate 10-min',
             '+3 / −5 pts', 'cap ₹250', '2 lots (130)', 'no hold limit, EOD 15:20', 'breaker 3 stops'],
  },
];

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : String(v));

function ParamRow({ name, value, meaning }) {
  return (
    <tr>
      <td className="sl-param">{name}</td>
      <td className="sl-value">{fmt(value)}</td>
      <td className="sl-meaning">{meaning}</td>
    </tr>
  );
}

export default function SystemLogic() {
  const [cfg, setCfg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    marketApi.getScalpConfig()
      .then((r) => setCfg(r.data))
      .catch((e) => setErr(e.message));
  }, []);

  const R = cfg?.regimeStrict;

  return (
    <div className="sl-page sl-page--wide">
      <MethodNav />

      <header className="sl-header">
        <h2>How the scalp engine decides</h2>
        <p>
          One trade at a time, options bought on NIFTY, always 2 lots (130 qty).
          The engine looks for a market going nowhere, waits for price to touch
          the edge of that range, asks the option chain whether big writers are
          defending that edge — and only then buys the bounce for a few points.
        </p>
      </header>

      {err && <div className="sl-error">Config unavailable: {err} — parameter values below may be stale.</div>}

      <div className="sl-columns">
      <div className="sl-main">
      <section className="sl-card">
        <h3>Step 1 — Find a small volatile range</h3>
        <p>
          Looks at the last {cfg?.regimeBase?.WINDOW ?? 20} one-minute candles and
          asks three questions. Is price trending? (Kaufman efficiency — net move
          divided by total path — must be ≤ {R?.MAX_EFFICIENCY ?? '0.22'}, meaning mostly
          noise.) Is the band the right size? (Between {((R?.MIN_RANGE_PCT ?? 0.0008) * 100).toFixed(2)}%
          and {((R?.MAX_RANGE_PCT ?? 0.0035) * 100).toFixed(2)}% of spot — small enough to fade,
          alive enough to pay.) Is it genuinely oscillating? (Price must have
          walked ≥ {R?.MIN_PATH_RATIO ?? 2.2}× the band width.)
        </p>
        <p>
          Entry only when price sits in the outer {((R?.EDGE_ZONE ?? 0.12) * 100).toFixed(0)}%
          of the band — at the floor we buy a call, at the ceiling a put. A close
          that has broken <em>out</em> of the band is a breakout, not an edge: no trade.
        </p>
      </section>

      <section className="sl-card">
        <h3>Step 2 — Ask the option chain for permission</h3>
        <p>
          Over the last {cfg?.oiFlow?.windowMin ?? 10} minutes, who is building open
          interest? Put writers adding OI at or below spot are defending the floor
          (bullish); call writers adding above are capping the ceiling (bearish).
          The trade only goes through when this flow agrees with the range signal
          <em> and outweighs the opposing side</em>. In testing this single gate raised
          the win rate in every configuration it was added to.
        </p>
      </section>

      <section className="sl-card">
        <h3>Step 3 — The trade itself</h3>
        <div className="sl-scroll">
          <table className="sl-table">
            <tbody>
              <ParamRow name="Instrument" value="Nearest-expiry NIFTY option" meaning="Real contracts from the daily instrument snapshot — priciest strike quoted at or under the cap (closest to ATM = most delta)" />
              <ParamRow name="Premium cap" value={`₹${cfg?.trade?.maxEntryPremium ?? 250}`} meaning="Never pay more than this per unit" />
              <ParamRow name="Size" value={`${cfg?.trade?.lots ?? 2} lots = ${cfg?.trade?.qty ?? 130} qty`} meaning="Fixed. Never more, never less" />
              <ParamRow name="Target / Stop" value={`+${cfg?.trade?.targetPts ?? 3} / −${cfg?.trade?.stopPts ?? 5} pts`} meaning="On the option premium. +3 chosen because +1 and +2 cannot out-earn the charges" />
              <ParamRow name="Holding" value="No time limit" meaning={cfg?.trade?.holdRule ?? 'until target or stop; force-close 15:20 IST; no overnight carry'} />
              <ParamRow name="Circuit breaker" value={cfg?.trade?.circuitBreaker ?? '3 consecutive stops halts the day'} meaning="A day that keeps stopping out is a regime we misread — stop trading it" />
              <ParamRow name="Friction per trade" value={`≈ ₹${Math.round((cfg?.frictionPerTrade?.chargesApprox ?? 102) + 65)}`} meaning={cfg?.frictionPerTrade?.note ?? 'brokerage + taxes + slippage'} />
            </tbody>
          </table>
        </div>
        <p className="sl-note">
          Every result anywhere in this app is quoted <b>in hand</b> — after all of
          the friction above. A rule of thumb this system learned the hard way:
          at +3/−5, roughly 79% of trades must win just to break even.
        </p>
      </section>

      <section className="sl-card">
        <h3>What we tried before, and what it scored</h3>
        <ol className="sl-timeline">
          {HISTORY.map((h, i) => (
            <li key={i} className={`sl-tl sl-tl--${h.verdict}`}>
              <div className="sl-tl__when">{h.when}</div>
              <div className="sl-tl__body">
                <p className="sl-tl__what">{h.what}</p>
                <p className="sl-tl__result">{h.result}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="sl-note">
          Full numbers: every backtest is saved in the database (visible on the
          Scalp page), and the long-form history is in SCALP_BACKTEST_RESULTS.md.
        </p>
      </section>
      </div>

      <aside className="sl-rail" aria-label="Parameter sets over time">
        <h3>Parameters, over time</h3>
        {PARAM_TIMELINE.map((e, i) => (
          <div key={i} className={`sl-railset${i === PARAM_TIMELINE.length - 1 ? ' sl-railset--current' : ''}`}>
            <div className="sl-railset__when">{e.when}</div>
            <div className="sl-railset__name">{e.name}</div>
            <ul className="sl-railset__list">
              {e.params.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        ))}
      </aside>
      </div>
    </div>
  );
}
