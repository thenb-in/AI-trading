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

export { api, reportApi };
