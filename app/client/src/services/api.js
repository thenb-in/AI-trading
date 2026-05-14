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

// --------------------------------------------
// Auth API
// --------------------------------------------
const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/signup', userData),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  getUserDetails: () => api.get('/auth/get-user-details'),
};

// --------------------------------------------
// Customer API (multipart for company_logo)
// --------------------------------------------
const customerApi = {
  getAllCustomers: (filters = {}) => api.get(`/customer`, { params: filters }),
  createCustomer: (formData) => api.post(`/customer`, formData),
  updateCustomer: (customerId, formData) => api.put(`/customer/${customerId}`, formData),
  deleteCustomer: (customerId) => api.delete(`/customer/${customerId}`),
  getSelf: () => api.get(`/customer/self`),
  upsertSelf: (formData) => api.put(`/customer/self`, formData),
};
// --------------------------------------------
// Service Offering API
// --------------------------------------------
const serviceOfferingApi = {
  getAllServiceOfferings: (filters = {}) => api.get(`/service-offering`, { params: filters }),
  createServiceOffering: (offeringData) => api.post(`/service-offering`, offeringData),
  updateServiceOffering: (offeringId, offeringData) => api.put(`/service-offering/${offeringId}`, offeringData),
  deleteServiceOffering: (offeringId) => api.delete(`/service-offering/${offeringId}`),
};


export { reportApi, authApi,pastReportApi,customerApi,serviceOfferingApi};
