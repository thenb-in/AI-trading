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
// `api` baseURL already includes /api/v1, so paths are bare. Each group's
// return style (raw axios response vs unwrapped `.data`) matches what its
// migrated pages consume — do not "normalise" it.

const marketApi = {
  getNifty:               () => api.get('/market/nifty'),
  getNiftyIndicators:     () => api.get('/market/nifty/indicators'),
  getBankNiftyIndicators: () => api.get('/market/banknifty/indicators'),
  getNiftyPcr:            () => api.get('/market/nifty/pcr'),
  getNiftySignal:         () => api.get('/market/nifty/signal'),
  getVix:                 () => api.get('/market/vix'),
  getSession:             () => api.get('/market/session'),
  getChartAnalysis: (symbol)     => api.get('/market/chart-analysis', { params: { symbol } }),
  getCandles: (symbol, from, to) => api.get('/market/candles', { params: { symbol, from, to } }),
  getTradeMode:           () => api.get('/market/trade-mode'),
  setTradeMode: (mode)    => api.post('/market/trade-mode', { mode }),
  getSpotSummary:         () => api.get('/market/spot-summary'),
  getMethod2Pulse:        () => api.get('/market/method2/pulse'),
  getScalpConfig:         () => api.get('/market/scalp/config'),
};

const method2Api = {
  getMethod2:     () => api.get('/market/method2'),
  getAutotrade:   () => api.get('/market/method2/autotrade'),
  setAutotrade:   (mode) => api.post('/market/method2/autotrade', { mode }),
  getBacktest:    (ep) => api.get(`/market/${ep}/backtest/year`),
  runBacktest:    (ep, body) => api.post(`/market/${ep}/backtest/year`, body),
  backtestCsvUrl: (ep) => `/api/v1/market/${ep}/backtest/year/csv`,
};

const mailerApi = {
  getConfig:  () => api.get('/mailer/config'),
  saveConfig: (secretKey) => api.post('/mailer/config', { secretKey }),
  sendTest:   () => api.post('/mailer/test'),
};

const scalpApi = {
  getReports:       () => api.get('/market/scalp/report').then((r) => r.data),
  getPaperStats:    () => api.get('/market/scalp/paper').then((r) => r.data),
  getHistoryStatus: () => api.get('/market/history/status').then((r) => r.data),
  runShapeReport:   () => api.post('/market/scalp/report/run').then((r) => r.data),
  runMatrix:        () => api.post('/market/scalp/report/matrix').then((r) => r.data),
  getLive:      (symbol = 'NIFTY') => api.get('/market/scalp', { params: { symbol } }).then((r) => r.data),
  getBacktest:  (params = {})      => api.get('/market/scalp/backtest', { params }).then((r) => r.data),
  getBreakeven: () => api.get('/market/scalp/breakeven').then((r) => r.data),
  runPaperTick: () => api.post('/market/scalp/paper/tick').then((r) => r.data),
  getConfig:    () => api.get('/market/scalp/config').then((r) => r.data),
  getReport:    (id) => api.get(`/market/scalp/report/${id}`).then((r) => r.data),
};

const optionChainApi = {
  getLiveChain: (symbol) => api.get('/market/chain/live', { params: { symbol } }),
  getBookmarks: () => api.get('/market/chain/bookmarks'),
  saveBookmarks: (bookmarks) => api.post('/market/chain/bookmarks', { bookmarks }),
  getRecentSnapshots: (params = {}) => api.get('/market/nifty/snapshots', { params }),
  getSpreadSummary: (params = {}) => api.get('/market/chain/spreads/summary', { params }),
  runBenchmark: () => api.post('/market/chain/benchmark'),
  getFeedStatus: () => api.get('/market/chain/feed-status'),
};

const backtestApi = {
  getYtReport: ({ pricing = 'project', triggerSet = 'yt', expiryRule = false } = {}) =>
    api.get('/market/yt/backtest/year', { params: { pricing, triggerSet, expiryRule } }),
  runYtBacktest: (body) => api.post('/market/yt/backtest/year', body),
  ytCsvUrl: ({ pricing = 'project', triggerSet = 'yt', expiryRule = false } = {}) =>
    `${import.meta.env.VITE_API_URL}/market/yt/backtest/year/csv?pricing=${pricing}&triggerSet=${triggerSet}&expiryRule=${expiryRule}`,
  getPeerYearReport: (method) => api.get(`/market/${method}/backtest/year`),
};

const seasonalityApi = {
  getSeasonality: (symbol = 'NIFTY') => api.get('/market/seasonality', { params: { symbol } }),
  getTilt: () => api.get('/market/seasonality/tilt'),
  setTilt: (enabled) => api.post('/market/seasonality/tilt', { enabled }),
};

const liveTradingApi = {
  getAutotradeState: () => api.get('/market/method2/autotrade'),
  setAutotradeMode: (mode) => api.post('/market/method2/autotrade', { mode }),
  catchUpEntry: () => api.post('/market/method2/catchup'),
  modifyGtt: (payload) => api.post('/market/method2/gtt', payload),
  getDaybook: () => api.get('/market/method2/daybook'),
  getMethod2: () => api.get('/market/method2'),
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
