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
  // Generic report fetch used by the framework BaseReport. ERP reports are
  // served as named GET endpoints under /reports/<slug>; filters go as query.
  getReportData: (slug, filters = {}) =>
    ApiService.request('GET', `/reports/${slug}`, null, { params: filters })
};

// Company profile (tolerances, inventory flags, email settings, font size).
// Owned by the app since the framework upgrade — the shared ApiService no
// longer carries these methods. Server routes: GET/PUT /api/v1/company-profile.
const companyProfileApi = {
  getCompanyProfile: () => ApiService.request('GET', '/company-profile', null, { cache: 'companyProfile' }),
  updateCompanyProfile: (payload) => ApiService.request('PUT', '/company-profile', payload, { invalidates: ['companyProfile'] }),
  sendWelcomeEmailsToCustomers: () => ApiService.request('POST', '/company-profile/send-welcome-emails')
};

export { api, reportApi };
