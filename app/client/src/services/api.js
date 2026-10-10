import { api } from '@startup/services/axiosConfig';

// The app's HTTP API surface. `api` is the framework's configured axios
// instance (base URL, auth cookies, 401 interceptor), so an app groups its own
// endpoints here and exports them:
//
//   const employeeApi = {
//     getAllEmployees: (params = {}) => api.get('/employees', { params }),
//   };
//
// `reportApi` below is not optional. The framework never imports from this file
// by name — it receives what it needs through the registries that
// registerAppData() fills — but the report pipeline has nothing to call over
// HTTP unless an app registers a reportApi, so every app provides one.

// --------------------------------------------
// Report API
// --------------------------------------------
// Handed to the framework by registerAppData() via registerReportApi(). The
// report pipeline calls getReportData(slug, filters) when a report runs over
// HTTP rather than through the socket runner.
const reportApi = {
  getReportData: (url, filters = {}) => {
    if (!url) throw new Error('Report name is required');
    return api.get(`/reports/${url}`, {
      params: filters,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
    }).catch(error => {
      // The interceptor will handle 401 responses
      console.error('Error in getReportData:', error);
      return Promise.reject(error);
    });
  },
};

// --------------------------------------------
// Trading APIs (migrated feature slices)
// --------------------------------------------
// `api` baseURL already includes /api/v1, so paths are bare. The server wraps
// every success as `{ success: true, data: <payload> }`; each JSON method
// unwraps to that payload with `.then((r) => r.data.data)`. The two
// URL-builder methods (`method2Api.backtestCsvUrl`, `backtestApi.ytCsvUrl`)
// return strings for `<a href>` targets, not calls, so they stay bare.

const marketApi = {
  getNifty:               () => api.get('/market/nifty').then((r) => r.data.data),
  getNiftyIndicators:     () => api.get('/market/nifty/indicators').then((r) => r.data.data),
  getBankNiftyIndicators: () => api.get('/market/banknifty/indicators').then((r) => r.data.data),
  getNiftyPcr:            () => api.get('/market/nifty/pcr').then((r) => r.data.data),
  getNiftySignal:         () => api.get('/market/nifty/signal').then((r) => r.data.data),
  getVix:                 () => api.get('/market/vix').then((r) => r.data.data),
  getSession:             () => api.get('/market/session').then((r) => r.data.data),
  getChartAnalysis: (symbol)     => api.get('/market/chart-analysis', { params: { symbol } }).then((r) => r.data.data),
  getCandles: (symbol, from, to) => api.get('/market/candles', { params: { symbol, from, to } }).then((r) => r.data.data),
  getTradeMode:           () => api.get('/market/trade-mode').then((r) => r.data.data),
  setTradeMode: (mode)    => api.post('/market/trade-mode', { mode }).then((r) => r.data.data),
  getSpotSummary:         () => api.get('/market/spot-summary').then((r) => r.data.data),
  getMethod2Pulse:        () => api.get('/market/method2/pulse').then((r) => r.data.data),
  getScalpConfig:         () => api.get('/market/scalp/config').then((r) => r.data.data),
};

const method2Api = {
  getMethod2:     () => api.get('/market/method2').then((r) => r.data.data),
  getAutotrade:   () => api.get('/market/method2/autotrade').then((r) => r.data.data),
  setAutotrade:   (mode) => api.post('/market/method2/autotrade', { mode }).then((r) => r.data.data),
  getBacktest:    (ep) => api.get(`/market/${ep}/backtest/year`).then((r) => r.data.data),
  runBacktest:    (ep, body) => api.post(`/market/${ep}/backtest/year`, body).then((r) => r.data.data),
  backtestCsvUrl: (ep) => `/api/v1/market/${ep}/backtest/year/csv`,
};

const mailerApi = {
  getConfig:  () => api.get('/mailer/config').then((r) => r.data.data),
  saveConfig: (secretKey) => api.post('/mailer/config', { secretKey }).then((r) => r.data.data),
  sendTest:   () => api.post('/mailer/test').then((r) => r.data.data),
};

const scalpApi = {
  getReports:       () => api.get('/market/scalp/report').then((r) => r.data.data),
  getPaperStats:    () => api.get('/market/scalp/paper').then((r) => r.data.data),
  getHistoryStatus: () => api.get('/market/history/status').then((r) => r.data.data),
  runShapeReport:   () => api.post('/market/scalp/report/run').then((r) => r.data.data),
  runMatrix:        () => api.post('/market/scalp/report/matrix').then((r) => r.data.data),
  getLive:      (symbol = 'NIFTY') => api.get('/market/scalp', { params: { symbol } }).then((r) => r.data.data),
  getBacktest:  (params = {})      => api.get('/market/scalp/backtest', { params }).then((r) => r.data.data),
  getBreakeven: () => api.get('/market/scalp/breakeven').then((r) => r.data.data),
  runPaperTick: () => api.post('/market/scalp/paper/tick').then((r) => r.data.data),
  getConfig:    () => api.get('/market/scalp/config').then((r) => r.data.data),
  getReport:    (id) => api.get(`/market/scalp/report/${id}`).then((r) => r.data.data),
};

const optionChainApi = {
  getLiveChain: (symbol) => api.get('/market/chain/live', { params: { symbol } }).then((r) => r.data.data),
  getBookmarks: () => api.get('/market/chain/bookmarks').then((r) => r.data.data),
  saveBookmarks: (bookmarks) => api.post('/market/chain/bookmarks', { bookmarks }).then((r) => r.data.data),
  getRecentSnapshots: (params = {}) => api.get('/market/nifty/snapshots', { params }).then((r) => r.data.data),
  getSpreadSummary: (params = {}) => api.get('/market/chain/spreads/summary', { params }).then((r) => r.data.data),
  runBenchmark: () => api.post('/market/chain/benchmark').then((r) => r.data.data),
  getFeedStatus: () => api.get('/market/chain/feed-status').then((r) => r.data.data),
};

const backtestApi = {
  getYtReport: ({ pricing = 'project', triggerSet = 'yt', expiryRule = false } = {}) =>
    api.get('/market/yt/backtest/year', { params: { pricing, triggerSet, expiryRule } }).then((r) => r.data.data),
  runYtBacktest: (body) => api.post('/market/yt/backtest/year', body).then((r) => r.data.data),
  ytCsvUrl: ({ pricing = 'project', triggerSet = 'yt', expiryRule = false } = {}) =>
    `${import.meta.env.VITE_API_URL}/market/yt/backtest/year/csv?pricing=${pricing}&triggerSet=${triggerSet}&expiryRule=${expiryRule}`,
  getPeerYearReport: (method) => api.get(`/market/${method}/backtest/year`).then((r) => r.data.data),
};

const seasonalityApi = {
  getSeasonality: (symbol = 'NIFTY') => api.get('/market/seasonality', { params: { symbol } }).then((r) => r.data.data),
  getTilt: () => api.get('/market/seasonality/tilt').then((r) => r.data.data),
  setTilt: (enabled) => api.post('/market/seasonality/tilt', { enabled }).then((r) => r.data.data),
};

const liveTradingApi = {
  getAutotradeState: () => api.get('/market/method2/autotrade').then((r) => r.data.data),
  setAutotradeMode: (mode) => api.post('/market/method2/autotrade', { mode }).then((r) => r.data.data),
  catchUpEntry: () => api.post('/market/method2/catchup').then((r) => r.data.data),
  modifyGtt: (payload) => api.post('/market/method2/gtt', payload).then((r) => r.data.data),
  getDaybook: () => api.get('/market/method2/daybook').then((r) => r.data.data),
  getMethod2: () => api.get('/market/method2').then((r) => r.data.data),
};

export {
  api,
  reportApi,
  marketApi,
  method2Api,
  mailerApi,
  scalpApi,
  optionChainApi,
  backtestApi,
  seasonalityApi,
  liveTradingApi,
};
