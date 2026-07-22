import { api } from '@startup/services/axiosConfig';

// App-side API surface. The framework (startup/client) imports these named
// API objects via the @app/services/api contract, so the reference scaffold
// must export every one the framework consumes — otherwise the ESM named
// imports fail at module-eval time and the admin pages never mount.

// --------------------------------------------
// Report API - routes through the Node.js server
// --------------------------------------------
const reportApi = {
  getReportData: (url, filters = {}) => {
    if (!url) throw new Error('Report name is required');
    // add employment_type default if not present
    const params = { ...filters };
    if (params.employment_type === undefined || params.employment_type === null || params.employment_type === '') {
      params.employment_type = 'monthly';
    }
    return api.get(`/reports/${url}`, {
      params,
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
// Past Report API
// --------------------------------------------
const pastReportApi = {
  getAllPastReports: () => api.get('/pastreport/get_all_past_report'),
  getReportById: (id) => api.get(`/pastreport/get_report/${id}`),
};

// --------------------------------------------
// Layout API — persists per-document data-grid layouts. Consumed by the
// framework's useLayoutManager/LayoutManager (mounted on every grid), so it
// must exist. Wired to the framework server's /api/v1/layouts routes.
// --------------------------------------------
const layoutApi = {
  getLayoutsByDocument: (documentName) => api.get(`/layouts/document/${documentName}`),
  getLayoutById: (layoutId) => api.get(`/layouts/layout/${layoutId}`),
  createOrUpdateLayout: (layoutData) => api.post('/layouts/create-or-update-layout', layoutData),
  deleteLayout: (layoutId) => api.delete(`/layouts/layout/${layoutId}`),
  setDefaultLayout: (layoutId) => api.post('/layouts/set-default', { layout_id: layoutId }),
  unsetDefaultLayout: (documentName) => api.post('/layouts/unset-default', { document_name: documentName }),
};

export {
  reportApi,
  pastReportApi,
  layoutApi,
};
