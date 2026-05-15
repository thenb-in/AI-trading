import { api } from '@startup/services/axiosConfig';

// --------------------------------------------
// Report API - Now routes through Node.js server
// --------------------------------------------
const reportApi = {
  getReportData: (url, filters = {}) => {
    if (!url) throw new Error('Report name is required');
    // add empeloyment_type default if not present
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


export { reportApi, pastReportApi };
