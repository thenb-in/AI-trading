/**
 * Global glossary: every known short form, anywhere in the UI, gets a hover
 * tooltip with its full form — no per-page markup needed. A debounced
 * MutationObserver scans leaf elements and sets `title` (native browser
 * tooltip) plus a dotted underline. Attributes only — React's DOM is never
 * restructured, so reconciliation stays safe.
 */

const TERMS = {
  'EMA':        'Exponential Moving Average — trend line weighting recent prices more',
  'VWAP':       'Volume-Weighted Average Price — the day\'s average price weighted by volume',
  'RSI':        'Relative Strength Index (0–100) — momentum; <30 oversold, >70 overbought',
  'ADX':        'Average Directional Index — trend STRENGTH (not direction); >25 = trending',
  'MACD':       'Moving Average Convergence Divergence — momentum from two EMAs crossing',
  'SuperTrend': 'SuperTrend — ATR-based trend direction line (UP/DOWN)',
  'SUPERTREND': 'SuperTrend — ATR-based trend direction line (UP/DOWN)',
  'PCR':        'Put-Call Ratio — total put OI ÷ call OI; we score its TREND (rising = put writers defending)',
  'OI':         'Open Interest — number of option contracts currently open at a strike',
  'ATM':        'At The Money — strike nearest the current spot price',
  'OTM':        'Out of The Money — strike beyond the current spot price',
  'ITM':        'In The Money — strike already crossed by the spot price',
  'CE':         'Call European — call option (profits when the index RISES)',
  'PE':         'Put European — put option (profits when the index FALLS)',
  'SL':         'Stop Loss — exit level that caps the loss',
  'T1':         'Target 1 — first profit level (here: the nearest option-chain level)',
  'T2':         'Target 2 — second profit level',
  'T3':         'Target 3 — final profit level; reaching it completes the trade',
  'R:R':        'Risk-to-Reward ratio — profit at target ÷ loss at stop',
  'IV':         'Implied Volatility — the volatility the option\'s market price implies',
  'LTP':        'Last Traded Price',
  'ATR':        'Average True Range — average candle range; a volatility measure',
  'EOD':        'End Of Day — forced exit at 15:20 IST; nothing carries overnight',
  'PF':         'Profit Factor — gross wins ÷ gross losses; >1 is profitable',
  'VIX':        'India VIX — expected market volatility index ("fear gauge")',
  'CPR':        'Central Pivot Range — pivot-based support/resistance zone',
  'PDH':        'Previous Day High',
  'PDL':        'Previous Day Low',
  'PDC':        'Previous Day Close',
  'S/R':        'Support / Resistance levels',
  'CONF':       'Confidence — net factor score mapped to 0–100%',
  'Conf':       'Confidence — net factor score mapped to 0–100%',
  'qty':        'Quantity — units traded (1 NIFTY lot = 65)',
  'QTY':        'Quantity — units traded (1 NIFTY lot = 65)',
  'BS':         'Black-Scholes — option pricing model (used only where real premiums are unavailable)',
  'ER':         'Efficiency Ratio (Kaufman) — net move ÷ total path; low = ranging, high = trending',
  'DD':         'Drawdown — peak-to-trough decline of running profit',
  'OIflow':     'OI Flow — where option writers are ADDING open interest (below spot = floor defense, above = ceiling)',
  'Max Pain':   'Max Pain — the strike where option buyers lose the most; price often gravitates toward it near expiry',
  'MAX PAIN':   'Max Pain — the strike where option buyers lose the most; price often gravitates toward it near expiry',
};

// longest first so "Max Pain" wins over "PE" etc.; word-boundary matching so
// OI never fires inside POINTS
const KEYS = Object.keys(TERMS).sort((a, b) => b.length - a.length);
const PATTERNS = KEYS.map((k) => ({
  k,
  re: new RegExp(`(^|[^A-Za-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9])`),
}));

function annotate(root) {
  const els = root.querySelectorAll('span, th, td, b, h1, h2, h3, h4, label, p, li, button, a, div');
  for (const el of els) {
    if (el.childElementCount > 0) continue;          // leaf elements only
    if (el.dataset.glossed) continue;
    const text = el.textContent;
    if (!text || text.length > 90) continue;
    const hits = [];
    for (const { k, re } of PATTERNS) {
      if (re.test(text)) {
        if (!hits.some((h) => TERMS[h] === TERMS[k])) hits.push(k);
        if (hits.length >= 3) break;
      }
    }
    if (hits.length === 0) continue;
    el.dataset.glossed = '1';
    el.title = hits.map((k) => `${k}: ${TERMS[k]}`).join('\n');
    el.classList.add('gloss');
  }
}

function startGlossary() {
  let timer = null;
  const run = () => { timer = null; try { annotate(document.body); } catch { /* never break the app */ } };
  const schedule = () => { if (!timer) timer = setTimeout(run, 400); };
  schedule();
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => { mo.disconnect(); if (timer) clearTimeout(timer); };
}

export { startGlossary };
