# Wave 2 wiring snippets (orchestrator weave collector)

Durable record of each feature agent's returned wiring, so the weave can be done in one pass.
Weave targets (orchestrator-owned): `app/server/index.js` (extraRoutes), `app/server/src/routes/app_routes.js`,
`app/server/src/constants/app_permissions.js`, `app/server/scheduler/index.js`,
`app/client/src/data/{getAppRoutes.jsx,getAppModules.js,getMasterModules.js}`,
`app/client/src/services/api.js`, `app/client/src/data/registerAppData.js` (imports only if needed).

Status: W2-1 ⏳ · W2-2 ⏳ · W2-3 ⏳ · W2-4 ⏳ · W2-5 ✅ · W2-6 ⏳ · W2-7 ✅

## OPEN WEAVE DECISIONS (resolve in weave/completeness pass)
- **Auth policy inconsistency:** source endpoints were ALL public (flat router, no auth). W2-5 gated
  behind `protect`+`requirePermission`; W2-7 kept public. Pages live under the framework's authed
  admin shell (ProtectedRoute), so the standard should be: **protect + module permission** for all app
  endpoints, EXCEPT the Zerodha OAuth login/callback (must stay public, W2-6). This is a deliberate
  deviation from source "public" behavior — record it; it fits the framework security model.
- **Shared `/api/v1/market` prefix:** W2-1/W2-2/W2-5 (+others) mount routers under the same `/market`
  prefix. Express allows multiple routers on one prefix; mount order matters only for path overlaps —
  verify no two routers claim the same exact path. Consider one consolidated `marketRoutes` aggregator.
- **app_permissions.js:** must uncomment BOTH `create_master_permission` AND `create_module_permission`
  (W2-5+ use module permissions). Done so far: only master uncommented.

---

## W2-7 — jobs + mailers + archive ✅

**Route mounts** (`app/server/index.js` extraRoutes):
```js
const archiveRoutes = require('./src/routes/archiveRoutes');
const mailerRoutes  = require('./src/routes/mailerRoutes');
// in extraRoutes:
{ prefix: '/api/v1/market/history', router: archiveRoutes },
{ prefix: '/api/v1/mailer',         router: mailerRoutes },
```
Endpoints: `GET /market/history/status`, `POST /market/history/archive/index?symbol=&days=`,
`POST /market/history/archive/options?symbol=`, `GET|POST /mailer/config`, `POST /mailer/test`.
**Unauthenticated in source — kept public (FINDING: security regression).**

**Client api.js methods:** `getArchiveStatus()`, `archiveIndex({symbol,days})`, `archiveOptions({symbol})`,
`getMailerConfig()`, `saveMailerConfig({secretKey})`, `testMailer()`.

**Permissions:** none (public endpoints).

**Scheduler:** W2-7 gave the COMPLETE consolidated `registerAllJobs(getRecHistory)` with all 7 jobs
(trading.optionSnapshots `*/2 * * * *`, trading.nfoInstrumentsSnapshot `30 12 * * 1-5`,
trading.chainFeed `* * * * *`, trading.method2Trades `* * * * *`, trading.scalpPaper `* * * * *`,
trading.historyArchive `50 12 * * 1-5`, trading.dailySummaryMail `0 10 * * 1-5`). This is the
AUTHORITATIVE scheduler file — ignore duplicate per-agent job snippets unless cronTimes disagree.
Sibling service paths used: `../src/services/{optionSnapshotService,scalpPaperService,chainFeedService,
method2TradeService,historyArchiveService}` + `../src/services/broker`.

**Boot additions (`app/server/index.js` after startServer):**
- `registerSchedulerJobs: () => registerAllJobs(() => recHistory)` once F1's in-memory `recHistory` exists
  (until then `registerAllJobs` with no arg is source-faithful; dailySummary falls back to `[]`).
- `await require('./src/utils/mailerService').loadMailerConfig();` in boot `.then()`.
- (source also called `loadSignalHistory()` — F1 owns that.)

**FINDINGS:** hardcoded MAILER_URL full-path vs framework base-path; `MAILER_SECRET_KEY` vs framework
`MAILER_EMAIL_SECRET_KEY`; `mailerService` persists secret in AppSetting (util touches model directly,
overlaps Company Profile); mailer/archive endpoints unauthenticated (security regression); mailer kept as
app util (not framework interface) to preserve behavior.

---

## W2-5 — backtests + seasonality ✅
**extraRoutes:** `const backtestRoutes = require('./src/routes/backtestRoutes');` → `{ prefix:'/api/v1/market', router: backtestRoutes }`
Endpoints (under /market): POST+GET `/yt/backtest/year`, GET `/yt/backtest/year/csv`, GET `/seasonality`, GET+POST `/seasonality/tilt`, GET `/candles/resampled`, GET `/candles/status`.
**api.js:** `backtestApi` {getYtReport, runYtBacktest, ytCsvUrl, getPeerYearReport}, `seasonalityApi` {getSeasonality, getTilt, setTilt}. Add to exports.
**getAppRoutes.jsx:** import YtBacktest, Seasonality; `{path:'yt-backtest',element:<YtBacktest/>}`, `{path:'seasonality',element:<Seasonality/>}`
**getAppModules.js:** modules `ytBacktest` (nav /admin/yt-backtest, perm view_yt_backtest_module, icon LineChart, order 50), `seasonality` (nav /admin/seasonality, perm view_seasonality_module, icon CalendarRange, order 51), category 'Trading'.
**app_permissions.js (module):** `VIEW_YT_BACKTEST_MODULE: create_module_permission('yt_backtest','YT Backtest')`, `VIEW_SEASONALITY_MODULE: create_module_permission('seasonality','Seasonality')`
**Scheduler:** none.
**Exports (siblings depend):** seasonalityService → {getSeasonality,getSeasonalTilt,liveTiltState,setTiltEnabled} (W2-2 needs liveTiltState,setTiltEnabled). candleStoreService → {upsertIndexCandles,upsertOptionCandles,resample,getIndexCandles,getResampledIndexCandles,loadOptionContractsFromDb,storeStatus}. ytBacktestService → {runYtBacktest,latestYtReport,buildYtSignal,DEFAULT_RULES}. walkForwardService → {runWalkForward,GRID}.
**FINDINGS:** candleStoreService imports 2 models (IndexCandle+OptionCandle) — one-model violation, deferred. seasonalityService raw-SQL reads index_candles + uses AppSetting. Boot deps: ytBacktest/walkForward require `./method2BacktestService` (F2/W2-2), backtestController needs `tradesToCsv` (W2-2). Client pages import `../components/MethodNav.jsx` (W2-1) and YtBacktest imports `./YearBacktest.css` (W2-2 page). candleStore owned here (not W2-7) — no dup. Category 'Trading' is NEW (not in getMasterModules categories; modules use free-text category, fine).

---

## W2-4 — option chain + OI ✅ (boot-critical paths delivered)
**extraRoutes:** `const optionChainRoutes = require('./src/routes/optionChainRoutes');` → `{ prefix:'/api/v1/market', router: optionChainRoutes }`
Endpoints (/market): GET `/nifty/snapshots`, GET `/chain/live`, GET|POST `/chain/bookmarks`, GET `/chain/spreads/summary`, POST `/chain/benchmark`, GET `/chain/feed-status`. (NOT `/market/nifty/oi-change` — F1/W2-1 wires that against my getOiChangeAnalysis.)
**api.js:** `optionChainApi` {getLiveChain,getBookmarks,saveBookmarks,getRecentSnapshots,getSpreadSummary,runBenchmark,getFeedStatus}. Export it.
**getAppRoutes.jsx:** import OptionChain; `{path:'option-chain',element:<OptionChain/>}`
**getAppModules.js:** module `optionChain` (nav /admin/option-chain, perm view_option_chain_module, icon lucide Table2, order 40, category Trading).
**app_permissions.js (module):** `OPTION_CHAIN: create_module_permission('option_chain','Option Chain')`
**Scheduler:** optionSnapshots `*/2 * * * *`, chainFeed `* * * * *` (SAME as W2-7 consolidated — no conflict).
**Exports (siblings depend):**
- optionSnapshotService → {collectNiftyOptionSnapshots, runOptionSnapshotCollectorOnce, startOptionSnapshotScheduler, getOiChangeAnalysis, getRecentSnapshots, RECENT_OPTION_SNAPSHOT_LIMIT, isZerodhaTokenError, +pure analytics fns}
- chainFeedService → object {tick, analyze, setSpot, feedStatus, DEFAULT_WINDOW_MIN}
**DEDUPE RISK:** W2-4 created `appSettingService.js` + `spreadSampleService.js` OUTSIDE ownership — W2-6 (execution) also touches AppSetting; keep ONE canonical appSettingService. spread_samples written by tickerService (W2-6), read by spreadSampleService (W2-4) → one-table-two-services.
**FINDINGS:** split optionSnapshot→optionSnapshot/analytics.js (behavior-preserving). Routes PUBLIC (like W2-7). RAW response envelopes (not {success,data}). `reloadEnvForZerodhaToken()` uses dotenv.config → **trips no-direct-dotenv lint** (essential for token hot-reload). chainFeedService TOP-requires `./scalpPaperService` (W2-3) → boot depends on W2-3. Dead imports preserved (istMinutes, Link) → trip no-unused-vars. Hardcoded localhost:3000 zerodha login URL in page.

---

## W2-1 — market dashboard + chrome + system-logic ✅
**app_routes.js mount (NOT extraRoutes — paths already include /market):**
`const marketRoutes = require('../routes/marketRoutes'); app.use(prefix, marketRoutes);`
Endpoints: /options/nifty, /market/nifty/candles, /market/nifty/indicators, /market/banknifty/indicators, /market/nifty/bias, /market/nifty/pcr, /market/nifty/signal, /market/nifty, /market/banknifty, /market/vix, /market/session, /market/nifty/{supertrend,macd,volume,oi-change,max-pain,cpr,oi-sr}, /market/candles, /market/chart-analysis, /market/spot-summary, GET+POST /market/trade-mode. **Gated protect+requirePermission(view_market_module).**
**api.js:** `marketApi` {getNifty,getNiftyIndicators,getBankNiftyIndicators,getNiftyPcr,getNiftySignal,getVix,getSession,getChartAnalysis,getCandles,getTradeMode,setTradeMode,getSpotSummary, +getMethod2Pulse(F2),getScalpConfig(F3)}. Export it.
**getAppRoutes.jsx:** import MarketDashboard, SystemLogic; `{path:'market-dashboard',element:<MarketDashboard/>}`, `{path:'system-logic',element:<SystemLogic/>}`
**getAppModules.js:** `marketDashboard` (nav /admin/market-dashboard, perm view_market_module, icon LineChart, order 1), `systemLogic` (nav /admin/system-logic, perm view_system_logic_module, icon BookOpen, order 7), category Trading.
**app_permissions.js (module):** `MARKET_DASHBOARD: create_module_permission('market','Market Dashboard')`, `SYSTEM_LOGIC: create_module_permission('system_logic','System Logic')`
**GLOBAL CHROME (wire into app_layout/AppLayout.jsx):** `import { startGlossary } from '@app/utils/glossary'; import '@app/glossary.css'; useEffect(()=>startGlossary(),[]);` render `<Clock/>`, `<TradePill/>`, `<TradeEffects/>`.
**CLIENT DEP:** add `lightweight-charts@^4.2.3` to app/client/package.json (NiftyChart).
**FINDINGS:** boot deps marketController→optionSnapshotService(F4✓) & spotSummaryService→tickerService(F6 pending). spotSummaryService builds own KiteConnect client (dup of broker) — deferred. **⚠ getNiftyCandles resolves to marketCache version via barrel spread vs source nseService version — verify in completeness pass (possible behavior diff).** MethodNav links point at legacy routes (/method2,/desk,/live,/chain,/backtest,/scalp,/seasonal,/logic,/brief,/) — dangle until reconciled with framework paths (/admin/...). Unused imports preserved (Link,useLocation). Raw response envelopes (not {success,data}).

---

## W2-3 — scalping ✅
**app_routes.js mount:** `const scalpRoutes = require('../routes/scalpRoutes'); app.use(`${prefix}/market/scalp`, scalpRoutes);`
Endpoints (/market/scalp): GET `/`, GET `/backtest`, GET `/breakeven`, GET `/paper`, POST `/paper/tick`, POST `/report/run`, POST `/report/matrix`, GET `/config`, GET `/report`, GET `/report/:id`. **Gated protect+requirePermission(view_scalp_dashboard_module).**
**api.js:** `scalpApi` {getReports,getPaperStats,getHistoryStatus(⚠F8 /market/history/status),runShapeReport,runMatrix,getLive,getBacktest,getBreakeven,runPaperTick,getConfig,getReport} — methods unwrap `.data`. Export it.
**getAppRoutes.jsx:** import ScalpDashboard; `{path:'scalp',element:<ScalpDashboard/>}`
**getAppModules.js:** `scalpDashboard` (nav /admin/scalp, perm view_scalp_dashboard_module, icon lucide Activity, order 30, category Trading, color amber).
**app_permissions.js (module):** `SCALP_DASHBOARD: create_module_permission('scalp_dashboard','Scalp Dashboard')`
**Scheduler:** trading.scalpPaper `* * * * *` (matches W2-7 consolidated).
**FINDINGS:** scalpService kept whole 730ln (lint error, deferred). candleStoreService dep → owned by W2-5 (resolved). scalpPaperService reads 2 models (ScalpPaperTrade+NfoInstrument) — one-model violation deferred. Gated (public→authed). Raw envelopes. Unused Link import.

---

## W2-2 — Method 2 engine + dashboards ✅
**extraRoutes:** `const method2Router = require('./src/routes/method2Routes');` → `{ prefix:'/api/v1/market', router: method2Router }`
Endpoints (/market): GET `/method2`, GET+POST `/method2/autotrade`, POST `/method2/catchup`, POST `/method2/gtt`, GET `/method2/daybook`, GET `/method2/pulse` (protect-only, polled by effects widget), {method2,method3,method2plus}`/backtest/year` GET+POST+CSV.
**Boot:** `await require('./src/services/method2EngineService').loadSignalHistory();` after startServer.
**api.js:** `method2Api` {getMethod2,getAutotrade,setAutotrade,getBacktest,runBacktest,backtestCsvUrl}, `mailerApi` {getConfig,saveConfig,sendTest} (F9 endpoints, needed by Method2Dashboard MailerSettings). Export both.
**getAppRoutes.jsx:** import Method2Dashboard,Method2Brief,YearBacktest; `{path:'method2',...}`,`{path:'brief',...}`,`{path:'backtest',...}` (YearBacktest reads ?m=m2p|m3).
**getAppModules.js:** NORMALIZE to framework module shape — `method2` (title 'Method 2 — OI Analysis', nav /admin/method2, perm view_method2_module, order ~10), plus backtest+brief as nav links (W2-2 gave MethodNav {to,label} format — convert to proper modules or leave as sub-pages; at minimum one Method2 module).
**app_permissions.js (module):** `METHOD2: create_module_permission('method2','Method 2')`
**Scheduler (TWO jobs):** trading.method2Trades `* * * * *` (matches W2-7); PLUS **trading.method2EngineTick `*/10 * * * * *`** (NEW — replaces legacy index.js HTTP self-poll; guards market-hours + isMarketOpen + reentrancy). W2-7 consolidated plan LACKS this engine-tick — ADD IT.
**recHistory wiring:** W2-7's `registerAllJobs(getRecHistory)` → pass `() => require('./src/services/method2EngineService').getRecHistory()`.
**Exports:** method2EngineService → {getMethod2,computeMethod2,getM2CacheBody,loadSignalHistory,getRecHistory,MIN_DIRECTION_PCT}; method2TradeService → {getActive,openTrade,evaluateActive,describe,recentTrades,tradePulse,GATE,todaysTrades,closedTradesWithExit}; method2BacktestService → {runYearBacktest,latestYearReport,runMethod3Backtest,latestM3Report,tradesToCsv,runPlusBacktest,latestPlusReport,PLUS_PARAMS,...}; chainBenchmarkService → {runChainBenchmark}.
**FINDINGS:** engine 840ln + backtest 595ln oversized (deferred). Services flat in src/services → use `../models` (NOT ../../models) — **INCONSISTENCY vs broker/market_data which are in subfolders using ../../models; both correct for their depth, but note flat-services use ../models**. TradeSignal owned by engine (F2) though "signal" split F1/F2 — confirm. ScalpReport shared by backtest+chainBenchmark (each single-model, ok). Hardcoded qty 130 / IST 19800 carried. Tunables in-code constants (deferred). Pages need MethodNav (F1 ✓).

---

## W2-6 — live trading / execution / Zerodha auth ✅
**extraRoutes:** `zerodhaAuthRoutes` → `{ prefix:'/api/v1', router: zerodhaAuthRoutes }` ; `executionRoutes` → `{ prefix:'/api/v1/market', router: executionRoutes }`
Endpoints: PUBLIC `GET /auth/zerodha/login`, `GET /zerodha/callback`; protect `GET /zerodha/{profile,instruments,ltp/:token}`, `GET /debug/{nifty,nifty-indices}`; protect+requirePermission(AUTO_EXECUTION) `GET+POST /market/method2/autotrade`, POST `/market/method2/catchup`, POST `/market/method2/gtt`.
**⚠ ROUTE COLLISION:** W2-2 method2Router ALSO defines /method2/autotrade,/catchup,/gtt at same /market prefix → mount executionRoutes FIRST (or strip those 3 from method2Routes). RESOLUTION: execution owns them (has AUTO_EXECUTION perm + executionService).
**BOOT WIRING (onAfterListen):** `try { require('./src/services/tickerService').start(); } catch(err){ logger.warn(...) }`
**api.js:** `liveTradingApi` {getAutotradeState,setAutotradeMode,catchUpEntry,modifyGtt,getDaybook,getMethod2}. Export it.
**getAppRoutes.jsx:** import LiveTrading,TradeDesk; `{path:'live-trading',...}`,`{path:'trade-desk',...}`
**getAppModules.js:** `liveTrading` (nav /admin/live-trading, perm read_auto_execution, icon Activity), `tradeDesk` (nav /admin/trade-desk, perm read_auto_execution, icon LineChart), category Trading.
**app_permissions.js (MASTER):** `AUTO_EXECUTION: create_master_permission('auto_execution')` — HARD PREREQ: executionRoutes requires MASTER_PERMISSION_CONSTANTS.AUTO_EXECUTION at require-time → splice before mount or boot throws.
**Scheduler:** none (ticker is boot-start; lifecycle driven by F2 eval loop).
**FINDINGS:** execution_mode vs AppSetting.auto_trade_mode overlap (live switch, untouched). Callback URL localhost:3000 vs app port 8469. executionService imports 3 models (AutoOrder+AppSetting+Method2Trade), tickerService 3 (NfoInstrument+ChainOiBaseline+SpreadSample) — one-model violations deferred. ZERODHA_ACCESS_TOKEN raw process.env. Lazy requires scalpService.estimateCosts(F3)+method2TradeService.getActive(F2).

---
## ALL 7 WAVE-2 AGENTS COMPLETE — proceed to weave.
### Cross-cutting conflicts to resolve in weave:
1. Route collision: /method2/{autotrade,catchup,gtt} (W2-2 vs W2-6) → execution wins.
2. appSettingService.js created by W2-4 (+ execution uses AppSetting inline) → one canonical.
3. spreadSampleService.js (W2-4 read) vs tickerService writes spread_samples → ok, note.
4. Auth policy: W2-1/2/3/5/6 gate; W2-4/W2-7 public → standardize (gate all app pages' endpoints; keep OAuth login/callback + /method2/pulse public). Record deviation from source(all-public).
5. getNiftyCandles barrel order (market_data) — marketCache vs nseService version (W2-1) → verify which source used.
6. app_permissions.js: uncomment create_master_permission + create_module_permission; add METHOD2, MARKET_DASHBOARD, SYSTEM_LOGIC, SCALP_DASHBOARD, OPTION_CHAIN, VIEW_YT_BACKTEST_MODULE, VIEW_SEASONALITY_MODULE (modules) + AUTO_EXECUTION, COMPANY_TRADING_CONFIG (masters).
7. Scheduler: W2-7 consolidated 7 jobs + ADD W2-2 engine-tick (*/10s) + recHistory via method2EngineService.getRecHistory.
8. Client deps: lightweight-charts@^4.2.3.
9. Flat services use ../models; subfolder services (broker/market_data) use ../../models.
