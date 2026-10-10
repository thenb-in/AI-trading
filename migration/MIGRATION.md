# AI-Trading → startup-framework migration

Living doc. Tracks how the legacy app at `/Users/nautatva/personal_projects/AI-Trading/startup/app`
is being moved into this startup-framework repo in proper structure, and what we deliberately
deferred.

**Source (legacy):** `AI-Trading/startup/app/{server,client}` — ~10k server LOC, ~7.4k client LOC.
**Target (here):** `AI_trading_startup/app/{server,client}` built on `startup/` framework.

## Ground rules for this migration (agreed with owner)

1. **Independent agents build independent slices** in proper structure
   (model → service → controller → view → validator → route; component → page), then we **weave**
   the slices into one app, then run a **completeness/diff pass** against the source.
2. **Preserve logic exactly.** No algorithm, threshold, gate, or guard changes during the move.
   Only mechanical conforming is allowed: `console.*` → framework `logger`, direct `process.env`
   → centralized app config, relocation into the layered structure, and splitting oversized files
   **only where it is clearly behavior-preserving** (otherwise keep whole and log a TODO).
3. **Every improvement/cleanup/hard-won-fix is logged** in "Deferred TODOs" below, not done now.
4. **Secrets → env** (`app/server/.env.example` + `app/server/src/config/env.js`).
5. **Company-specific config → Company Profile** (broker refs, symbols, market hours, trade mode,
   and the ~15 strategy tunables).

## startup/ vs app/ boundary

Decision test: *would every product on this framework want this, with no knowledge of
trading/brokers?* → `startup/`. Mentions a broker / trading concept / this product's domain →
`app/`. Dependency direction is strictly **app → startup**; startup never imports app. App plugs
in through registries (`app/client/src/data/registerAppData.js`, `getAppRoutes`, `getAppModules`,
`getMasterModules`; server `buildApp()` options + `app/server/src/data/registerAppData.js`).
Everything trading-specific lives under `app/`.

## Target conventions cheat-sheet (verified against this repo)

**Server** — 5 layers: `routes/` → `views/` (req/res + `{success,data}` envelope) →
`controllers/` (thin, no req/res, no models) → `services/` (the ONLY layer importing models;
**one model per service**, destructured top-level, lint-enforced) → `models/` (factory
`(sequelize, DataTypes) =>`, int PK for regular models, `underscored:true`, auto-loaded, run
`.associate`). App routes mount via `buildApp({ extraRoutes, mountAppRoutes, registerSchedulerJobs })`
in `app/server/index.js`. Permissions via `create_master_permission(...)` in
`app/server/src/constants/app_permissions.js`. Scheduler jobs via `registerJob({name,cronTime,run})`
in `app/server/scheduler/index.js`. Logger: `require('@startup/logger')`, single template-literal
strings (no comma args). Constants: per-topic files under a `constants/` folder; **prefer inline
template-literal error strings with live variables over minting new constants** (principle 11).

**Client** — two layers wired by registries. Aliases: `@startup/*`, `@app/*`, `@services`,
`@context`, `@utils`, `@data`. Page = route in `getAppRoutes.jsx` + nav module in `getAppModules.js`.
CRUD screen = `BaseMaster` (columns are **server-driven** via the API response) + a master module in
`getMasterModules.js` (auto-creates `/admin/master/<x>`). Company Profile tab =
`app/client/src/components/companyprofile/CompanyProfileSettings.jsx` (forwardRef exposing
`save()` + `onDirtyChange`). API via centralized `ApiService`/`app/client/src/services/api.js`
(must export `reportApi`). Styling = Tailwind + base components; no bespoke theme. Client env =
`import.meta.env.VITE_*`.

**DB** — plain idempotent SQL; framework scripts in `db-scripts/startup/`, **app scripts in
`db-scripts/app/`** (`YYYYMMDD_desc.sql`, `IF NOT EXISTS`). Every model change ships a matching
script. `SYNC_DB` only creates missing tables, never alters.

---

## Source inventory

### Server (`AI-Trading/startup/app/server`)
- **`index.js` — 1787 lines.** The real monolith: nearly all route handlers + the core 8-factor
  signal-synthesis engine live inline here, plus startup hacks (IPv4-first DNS, crash tracing,
  kiteconnect `process.exit` block). Only ONE real controller/route pair exists.
- **Models (12):** AppSetting, AutoOrder, ChainOiBaseline, IndexCandle, Method2Trade,
  NfoInstrument, OptionCandle, OptionSnapshot, ScalpPaperTrade, ScalpReport, SpreadSample,
  TradeSignal.
- **Services (~24):** candleStore, chainBenchmark, chainFeed, dailySummaryMail, execution,
  historyArchive, m1Signal, marketCache, marketHelpers, method2Backtest(595), method2Trade,
  nse(1737), optionSnapshot(716), scalpPaper, scalpReport, scalp(730), seasonality, spotSummary,
  ticker, tradeSignalMail, walkForward, ytBacktest, zerodha(1306).
- **Controllers:** marketController (option snapshots only). **Routes:** market.
- **Utils:** optionMath, mailerService. **Scheduler:** optionSnapshots, nfoInstruments, scalpPaper,
  chainFeed, method2Trade evaluate, nightly archive, daily summary mail.

### Client (`AI-Trading/startup/app/client`)
- **Pages (11):** MarketDashboard(759), Method2Dashboard(835), ScalpDashboard(367), SystemLogic,
  OptionChain, Method2Brief, YearBacktest, YtBacktest, Seasonality, LiveTrading, TradeDesk.
- **Components:** Clock, MethodNav, TradeEffects, TradePill, trading/ChartSignalPanel,
  trading/NiftyChart(516). **Utils:** glossary.
- Routing is a flat public `<Routes>` in `App.jsx` with no auth/admin shell.

### Secrets (→ `app/server/.env.example` + app config)
`ZERODHA_API_KEY`, `ZERODHA_API_SECRET`, `ZERODHA_ACCESS_TOKEN`, `MAILER_SECRET_KEY`,
`SIGNAL_EMAIL_TO`, `FRONTEND_URL`, `MAILER_URL`.

### Strategy tunables (→ Company Profile)
`MACD_FAST/SLOW/SIGNAL`, `SUPERTREND_ATR_PERIOD/MULTIPLIER`, `VIX_HIGH/LOW_THRESHOLD`,
`VOLUME_BREAKOUT_MULTIPLIER`, `TRADE_MODE`, and the `*_CONFIDENCE_WEIGHT` set (MACD, VIX, VOLUME,
SUPERTREND, OI_CHANGE, OI_SR, MAX_PAIN, PDH_PDL, CPR), `SIGNAL_USE_PCR_WEIGHTING`,
`CPR_NARROW_THRESHOLD_PCT`.

---

## Decomposition & ownership map

Agents own disjoint directories and **return** wiring snippets (routes, nav modules, permissions,
env keys, model-field factories) for the orchestrator to splice into the shared registry files.

**Orchestrator-owned (weave only, no agent writes here):**
`app/server/index.js`, `app/server/src/data/registerAppData.js`, `app/server/src/constants/{app_permissions,permissions}.js`,
`app/server/src/routes/app_routes.js`, `app/server/scheduler/index.js`,
`app/client/src/data/{registerAppData.js,getAppRoutes.jsx,getAppModules.js,getMasterModules.js}`,
`app/client/src/services/api.js`, `app/client/src/App.jsx`, `app/client/src/pages/Dashboards.jsx`.

### Wave 1 — Foundation (must land before feature waves)
- **FND-A — Data layer.** Owns `app/server/src/models/**` (all 12, int PK, mixins, underscored),
  `app/server/src/config/env.js`, `app/server/.env.example` edits, `db-scripts/app/*.sql`.
- **FND-B — Broker (Zerodha).** Owns `app/server/src/services/broker/**`. Faithful move of
  zerodhaService (split only if clearly safe). Exposes the exact export surface the rest imports.
- **FND-C — Market data + math.** Owns `app/server/src/services/market_data/**`,
  `app/server/src/utils/{optionMath,marketHelpers}.js`, market cache. Faithful move of nseService
  + indicators + optionMath + marketHelpers + marketCache.
- **FND-D — Company Profile.** Owns `app/server/src/{services,views,controllers,routes}/companyProfile*`,
  `app/server/src/models/{mixins,register}/companyProfile*`, and client
  `app/client/src/components/companyprofile/CompanyProfileSettings.jsx` + app service. Home for
  broker refs, symbols, market hours, trade mode, and the tunables (storage + UI only; per-service
  rewiring is a deferred TODO).

### Wave 2 — Features (build on frozen foundation)
- **F1 — Market dashboard + signal engine** (the inline index.js engine → signal service/controller/view;
  m1Signal, spotSummary, chainFeed, optionSnapshot read paths; page MarketDashboard + shared chrome
  Clock/TradePill/TradeEffects/MethodNav/glossary).
- **F2 — Method 2** (method2Trade, method2Backtest, chainBenchmark; pages Method2Dashboard,
  Method2Brief, YearBacktest).
- **F3 — Scalping** (scalp, scalpPaper, scalpReport; page ScalpDashboard).
- **F4 — Option chain / OI** (optionSnapshot CRUD + chainFeed views; page OptionChain).
- **F5 — Backtests & seasonality** (ytBacktest, seasonality, walkForward; pages YtBacktest, Seasonality).
- **F6 — Live trading / execution** (execution, ticker, AutoOrder; pages LiveTrading, TradeDesk,
  Zerodha auth callback flow).
- **F7 — System logic page** (static explainer; page SystemLogic + NiftyChart/ChartSignalPanel if shared).
- **F8 — History/candle store + scheduler jobs** (historyArchive, candleStore; job registrations).
- **F9 — Mailers** (tradeSignalMail, dailySummaryMail; mailer interface).

### Wave 3 — Weave + completeness pass (orchestrator)
Splice all returned wiring; boot the server/client; diff endpoint-by-endpoint and page-by-page
against the source; reconcile the deferred-TODO list.

---

## Phase / progress tracker

| Item | Status |
|------|--------|
| Framework conventions mapped (server + client) | ✅ done |
| Migration doc created | ✅ done |
| FND-A data layer (12 models, SQL, env) | ✅ done |
| FND-B broker → `services/broker/**` (24-fn contract) | ✅ done |
| FND-C market data + math → `services/market_data/**` | ✅ done |
| FND-D company profile home (31 fields) | ✅ done |
| Foundation weave (registry/permission/route/deps splice) | ✅ done |
| Wave 2 features (7 agents: market, method2, scalp, option-chain, backtests, live/exec, jobs/mailers) | ✅ done |
| Wave 2 weave (routes, nav, api, permissions, scheduler, chrome, deps) | ✅ done |
| Completeness/diff pass (static) | ✅ done — see "Weave results" |
| `npm install` (root `npm run i`) + Postgres + runtime boot | ⏳ pending (env step, user-run) |
| Lint/pre-commit pass (console/constants/file-length/one-model) | ⏳ pending (needs install; known violations in deferred TODOs) |

### Foundation module contracts (frozen — Wave 2 imports these)
- **Models:** `require('../../models')` → app+framework registry (12 app models, names match source).
- **Broker:** `require('../broker')` → 24 fns incl. getNiftyAtmOptionQuote, getNiftyPcrFromZerodha,
  calculateMaxPain, getOiBasedSupportResistance, getNiftySpotFromZerodha, fetchHistoricalCandles,
  fetchOptionCandles, saveNfoInstrumentsSnapshot, lookupOptionToken, generateZerodhaSession,
  getZerodhaLoginURL, getZerodhaErrorMessage, isZerodhaTokenError, getZerodhaProfile,
  getZerodhaInstruments, getZerodhaLTP, getOptionQuotesByTradingSymbols, getNearestExpiryNiftyOptions …
- **Market data:** `require('../market_data')` → getNiftyCandles, getBankNiftyCandles, getNiftyMarketBias,
  getIndiaVix, calculateSuperTrend/Macd/Adx, analyzeVolume, extractPreviousDayLevels, calculateCpr,
  getNiftyChartAnalysis, getTradeMode/setTradeMode, getMarketSnapshot, invalidateMarketCache,
  evaluateMarketSession, breakoutState, debug* … **(`marketHelpers` lives in `market_data/`, not `utils/`)**
- **Option math:** `require('../../utils/optionMath')` → impliedVol, bsPrice, dteYears, atmStrike, optSymbol …
- **Company Profile trading config:** `GET/PUT /api/v1/company-profile/trading`; client
  `companyProfileTradingService`; 31 fields on CompanyProfile.
- **⚠ Boot order:** `market_data/nseService` top-level-requires `../optionSnapshotService` and
  `../broker`. F4 MUST create `app/server/src/services/optionSnapshotService.js` (exact path) or boot crashes.

---

## Weave results (Wave 2 integration)

**96 app-server JS files + 11 pages + chrome, all migrated and wired.** Orchestrator spliced into the
shared files (nothing agents own): `app/server/index.js` (11 routers in `extraRoutes` + boot sequence:
mailer config → signal-history replay → ticker start), `app/server/scheduler/index.js` (7 cron jobs +
the new `method2EngineTick` replacing the HTTP self-poll; `recHistory` sourced from the engine service),
`app/server/src/constants/app_permissions.js` (7 module perms + `AUTO_EXECUTION` & `COMPANY_TRADING_CONFIG`
masters), `app/server/src/models/register/registerAppModelFields.js`, and client
`getAppRoutes.jsx` / `getAppModules.js` (11 nav modules under category "Trading") /
`services/api.js` (8 api groups, each keeping its page's exact unwrap style) /
`components/app_layout/AppLayout.jsx` (global Clock/TradePill/TradeEffects + glossary) /
`app/client/package.json` (+lightweight-charts) / `app/server/package.json` (+kiteconnect,
technicalindicators, tradingview-scraper, yahoo-finance2).

**Bugs caught & fixed during the completeness pass (would have crashed boot):**
- **Flat-service require paths** — executionService, tickerService, scalpService, scalpPaperService,
  scalpReportService, historyArchiveService used `../../models` and `../broker` (correct only for the
  2-level subfolder services). Fixed to `../models` and `./broker`. (method2* were already correct.)
- **Route collision** — `/market/method2/{autotrade,catchup,gtt}` defined by BOTH method2Routes (W2-2)
  and executionRoutes (W2-6) at the same `/api/v1/market` prefix. Resolved: execution owns them (it has
  the `AUTO_EXECUTION` permission + drives executionService); the duplicates were stripped from
  method2Routes and execution is mounted first.
- **App models loader** skipped `register/` dir (fixed in foundation weave).

**Static verification done (no runtime env here):** all 96 server files `node --check` clean; both
package.json valid; zero `console.*` left in migrated server code; no deep single-model imports;
**require-graph fully resolves** (every relative/aliased require points to a real file); all 23 source
services + all 11 pages covered. **Not yet run** (needs `npm run i` + Postgres): server boot, DB sync,
lint/pre-commit, and the client Vite build.

**URL/auth map after weave:** market reads `/api/v1/market/*` + `/api/v1/options/nifty`; Zerodha OAuth
`/api/v1/auth/zerodha/login` + `/api/v1/zerodha/callback` (PUBLIC); method2 `/api/v1/market/method2*`;
execution `/api/v1/market/method2/{autotrade,catchup,gtt}`; option chain `/api/v1/market/{nifty/snapshots,chain/*}`;
backtests `/api/v1/market/{yt/backtest/*,seasonality*,candles/*}`; scalp `/api/v1/market/scalp/*`;
archive `/api/v1/market/history/*`; mailer `/api/v1/mailer/*`; trading config `/api/v1/company-profile/trading`.

## Round 2 — follow-up refactors + first real run (all 7 requested items)

1. **CSS → `styles/`** — all 16 client CSS files `git mv`'d to `app/client/src/styles/`; 17 imports repointed to `@app/styles/*`. (`index.css`/`App.css` left as framework entry.)
2. **broker → interfaces** — `services/broker/` moved to `app/server/interfaces/broker/` (mirrors the framework's `startup/server/interfaces/`); 17 importers repointed to `@appServer/interfaces/broker`; broker's own internal requires fixed. Confirmed execution/ticker/spotSummary use the `kiteconnect` package directly, not the broker module.
3. **env.js / .env.example** — verified `env.js` re-exports framework env and `.env.example` is consumed by the framework's `dotenv-safe` (cwd-relative). Tunables removed from both (now in Company Profile); secrets/URLs kept.
4. **Tunables rewired to Company Profile** — new `app/server/src/config/tradingConfig.js`: synchronous, never-throws, cold→DEFAULTS, 60s background refresh, resolves the single-tenant company via `companyService` + `companyProfileTradingService`. All signal/indicator/session read sites in `market_data/*`, `optionSnapshotService`, and `interfaces/broker/zerodhaOptionAnalytics` now read it. DEFAULTS equal the old env values byte-for-byte, so behavior is unchanged. (Still in-code and deferred: the engine gate constants MIN_DIRECTION_PCT 70 / VIX 22 / ADX 20 and 8-factor weights; RSI/VWAP dead zones; `execution_mode` stays on AppSetting — live-order code untouched.)
5. **Auth on public endpoints** — optionChain/mailer/archive routes now `protect` + `requirePermission`; new master perms `MAILER_CONFIG`, `HISTORY_ARCHIVE`. Only the Zerodha OAuth login/callback stay public (browser redirect, no session) and `/method2/pulse` is protect-only (polled widget).
6. **Startup response envelope** — every trading JSON view returns `{ success, data }` (errors `{ success:false, error, message }`, same status codes); client `api.js` unwraps `r.data.data` and all 11 pages + chrome updated. Non-JSON responses (OAuth HTML/redirect, CSV downloads) left raw.
7. **RAN THE APP — verified end-to-end:**
   - `npm install` across nucleus/startup-server/app-server/app-client ✓ (incl. kiteconnect, technicalindicators, tradingview-scraper, yahoo-finance2, lightweight-charts).
   - **Client build**: `vite build` + prerender succeeded — 25,586 modules, all 11 pages/envelope/CSS compile.
   - **Server boot** against Postgres (`startup_db` created, `SYNC_DB=true`): **LISTENING on :8469**, 40 tables synced (all 12 trading tables present), signal-history replay ran, **all 8 trading scheduler jobs registered + started and tick cleanly** (graceful no-token skips, no crashes).
   - **Endpoint probes:** `/health` 200; `/market/vix` and `/company-profile/trading` → **401 unauth** (auth gating verified); `/auth/zerodha/login` reachable (500 only because `ZERODHA_API_KEY` is empty in this env — not a bug).
   - **Boot fix:** one permission key mismatch (`backtestRoutes` expected `VIEW_YT_BACKTEST_MODULE`/`VIEW_SEASONALITY_MODULE`; `app_permissions.js` had `YT_BACKTEST`/`SEASONALITY`) — renamed the keys; reboot clean.

### New follow-up (from Round 2)
- [ ] **Role seeding:** the new permissions (`auto_execution`, `company_trading_config`, `mailer_config`, `history_archive`, and the `view_*_module` set) are not granted to any role yet — non-superuser accounts will 403 on those screens until a role is granted them. Seed/assign them.
- [ ] To run live Zerodha flows, fill `ZERODHA_API_KEY/SECRET` in `app/server/.env` and reconcile the broker's hardcoded callback URL (`localhost:3000`) with the app port (`8469`).

## Deferred TODOs (hard-won fixes, tech-debt, and cleanups to take up later)

Logged now, acted on later. **Do not touch during the faithful move.**

### Correctness / production hazards carried over verbatim (revisit, don't lose)
- [ ] **IPv4-first DNS hack** (`index.js:8`, `dns.setDefaultResultOrder('ipv4first')`) — exists
  because Zerodha's order API IP-whitelist is IPv4 and the host reached it over IPv6. Decide the
  proper home (process bootstrap / deploy config) rather than a top-of-file side effect.
- [ ] **Silent-death crash tracing + `process.exit` override** (`index.js:16-52`) — synchronous
  crash logging and a block on kiteconnect's `process.exit(1)` from its ticker. Needs a first-class
  home (framework-level fatal handler + a supervised ticker) instead of monkey-patching `process.exit`.
- [ ] **Core signal engine lives inline in a route handler** (`index.js` `/market/method2`, ~500
  lines) — the 8-factor scoring, gates, and option-recommendation construction must move into a
  proper service/controller. Moved verbatim first; refactor into testable units later.
- [ ] **Degenerate option-chain reads** — multiple "never again" guards (e.g. T3 = whole strike
  value producing a ₹22,693 target on a ₹51 option). Preserve exactly; add tests before refactor.

### Convention conflicts to resolve
- [ ] **`console.*` everywhere** — converted to framework `logger` during the move; verify no
  comma-arg logger calls remain (lint).
- [ ] **Files over the 500-line limit** — nse(1737), zerodha(1306), scalp(730), optionSnapshot(716),
  method2Backtest(595); client Method2Dashboard(835), MarketDashboard(759), NiftyChart(516). Split
  into cohesive modules where behavior-preserving; where risky, kept whole and listed here.
- [ ] **Strategy tunables still read from `process.env`** in services — their *home* is now Company
  Profile, but rewiring each service from `process.env.X` → company-profile config read is deferred
  (behavior change). Track each call site.
- [ ] **Hardcoded market specifics** — strike step `50`, symbol list NIFTY/BANKNIFTY/SENSEX, IST
  session hours. Preserved as-is; later source from Company Profile.
- [ ] **AppSetting DB model holds mailer/app settings** — overlaps with the new Company Profile
  home; reconcile (migrate AppSetting values into Company Profile, or keep as runtime cache) later.

### Frontend
- [ ] Legacy `App.jsx` is a flat public router with no auth/admin shell; pages move under the
  framework admin shell + nav modules + permissions. Per-component CSS files move to Tailwind over time.

### Foundation-weave integration notes (new, from Wave 1)
- [ ] **`npm install` pending** — added to `app/server/package.json`: `kiteconnect@^5.1.0`,
  `technicalindicators@^3.1.0`, `tradingview-scraper@^1.0.4`, `yahoo-finance2@^2.14.0`. Server will not
  boot until installed.
- [x] **App models loader excluded `register` dir** — `app/server/src/models/index.js` `isModelDir`
  now also skips `register` (would have crashed trying to call `registerAppModelFields.js` as a model
  factory). Fixed during weave.
- [ ] **ZERODHA_ACCESS_TOKEN kept on raw `process.env`** (broker `kiteClient.js`) — `env.js` snapshots
  env at load, which would freeze the token and break post-login hot-reload. Proper home: a live getter
  or small token store.
- [ ] **Hardcoded Zerodha callback URL** `http://localhost:3000/api/v1/zerodha/callback` in broker.
  Also a **port mismatch**: source server ran on `3000`, target app's `kill` script targets `8469`.
  Reconcile callback URL + port via config/Company Profile.
- [ ] **nseService Tuesday-expiry vs optionMath Thursday-expiry** inconsistency carried over verbatim
  (`marketHelpers` treats dayOfWeek===2 as expiry; `optionMath` assumes Thursday). Reconcile via
  Company Profile, do not "fix" during faithful move.
- [ ] **Logger single-string conversion dropped structured error metadata** across broker + market_data
  (comma-arg object logs folded into template strings). Revisit if structured logs are needed.
- [ ] **`execution_mode` (off/dry/live) vs `signal_trade_mode` (selective/medium)** are two distinct
  concepts now in Company Profile. Legacy order switch lives in `AppSetting.auto_trade_mode`; backfill
  `execution_mode` from it on cutover, then retire the AppSetting row (deferred to service-rewire wave).
- [ ] **`underscored` inconsistent across models** (AppSetting/NfoInstrument/OptionSnapshot/
  ScalpPaperTrade/TradeSignal = false; AutoOrder = true) and **no associations** anywhere
  (AutoOrder.trade_id → method2_trades.id is a logical-only FK). Preserved; normalize later.
- [ ] **Market-data tables are global (no companyId)** — fine for single-tenant; flag for multi-tenant.

### Wave 2 agent findings (consolidated — preserve-now, fix-later)
- [ ] **Oversized files kept whole** (>500-line lint error): `method2EngineService` 840, `scalpService`
  730, `method2BacktestService` 595, `market_data/nseService` 1737. (`optionSnapshotService` was safely
  split 716→335 + `optionSnapshot/analytics.js` 433; broker was split into 7 modules.) Split the rest
  with tests once booting.
- [ ] **One-model-per-service violations** (carried verbatim, trip the lint): `candleStoreService`
  (IndexCandle+OptionCandle), `scalpPaperService` (ScalpPaperTrade+NfoInstrument), `executionService`
  (AutoOrder+AppSetting+Method2Trade), `tickerService` (NfoInstrument+ChainOiBaseline+SpreadSample). Route
  secondary models through sibling services later.
- [ ] **Helper-service dedupe:** W2-4 created `appSettingService.js` + `spreadSampleService.js` outside
  its scope; `executionService` also hits AppSetting inline. Make `appSettingService` the one canonical
  AppSetting accessor. `spread_samples` is written by `tickerService`, read by `spreadSampleService`
  (one-table-two-services).
- [ ] **Auth policy:** the migrated trading endpoints are inconsistent — market/method2/scalp/backtest/
  execution are gated (`protect`+permission), but `optionChain` data, `mailer/*` and `market/history/*`
  were kept PUBLIC (source was all-public). Public mailer/archive = **security regression** (unauth read/
  write of the mailer secret, unauth data backfill). Standardize: protect all except the Zerodha OAuth
  login/callback and `/market/method2/pulse`.
- [ ] **Response envelopes:** every trading view returns the RAW legacy shape, NOT the framework
  `{success,data}` envelope, to preserve the exact client contract. Reconcile for uniformity later.
- [ ] **Lint/pre-commit will flag:** `dotenv.config()` in `optionSnapshotService.reloadEnvForZerodhaToken`
  (no-direct-dotenv — but essential for token hot-reload); dead imports (`Link`, `istMinutes`,
  `useLocation`) preserved verbatim; `method2View` still exports the now-unrouted autotrade/catchup/gtt
  handlers (dead — remove when execution ownership settles).
- [ ] **MethodNav links** point at legacy flat routes (`/method2`, `/desk`, `/live`, …) not the framework
  `/admin/*` paths — reconcile the in-page nav with the sidebar, or drop MethodNav in favour of the sidebar.
- [ ] **`spotSummaryService` builds its own KiteConnect client** (duplicates `broker`) — route through broker.
- [ ] **Tunables still in-code constants / `process.env`** across the engine + services (MIN_DIRECTION_PCT,
  VIX/ADX gates, confidence weights, MACD/SuperTrend params). Company Profile home now exists — rewire each
  call site to read it (behavior-changing; do per-service with tests).
- [ ] **Hardcoded market specifics:** qty `130` (2 lots) + IST `19800`s offset (method2 controller), strike
  step `50`, Tuesday-vs-Thursday expiry inconsistency (marketHelpers vs optionMath) — source from Company Profile.
- [ ] **`?m=` barrel/surface checks:** verify `market_data` barrel exports the intended `getNiftyCandles`
  (marketCache vs nseService) during a boot test; confirm `TradeSignal`/`ScalpReport` model ownership
  (split across F1/F2/F3).
- [ ] **Callback URL / port:** broker hardcodes `http://localhost:3000/api/v1/zerodha/callback`; app `kill`
  script targets `8469`. Reconcile callback host/port (broker const + Zerodha app dashboard + run port)
  before live OAuth.

## Next steps (environment — user-run)
1. `npm run i` at repo root (installs framework + app + client; nothing is installed yet).
2. Provision Postgres; set `app/server/.env` from `.env.example` (fill ZERODHA_* / MAILER_* secrets).
3. `cd app/server && SYNC_DB=true npm run dev` for a first boot (creates missing tables), or run the
   `db-scripts/app/*.sql` scripts; then boot normally. Watch for runtime wiring issues the static pass
   can't see (circular requires, export mismatches).
4. `cd app/client && npm run dev` and verify the 11 pages render under `/admin/*`.
5. Run lint/pre-commit; triage the known violations above.

_Last updated: 2026-10-10 (Wave 2 woven + static completeness pass; runtime boot pending install)_
