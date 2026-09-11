import axios from 'axios';
import { toast } from 'react-toastify';
import { getCurrentBatchId, newBatchId } from './batchContext';

// Writes carry a batch id so the server's activity log can group one user
// gesture into one undoable action. Inside runAsBatch every request shares an
// id; a standalone write gets its own, so it is undoable by itself.
const WRITE_METHODS = ['post', 'put', 'patch', 'delete'];

// URLs
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create Axios instances
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with cross-origin requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30 * 60 * 1000,  // 3 min
  // Treat 304 Not Modified as a success (axios default rejects all 3xx)
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

// Add request interceptor for API
api.interceptors.request.use(
  (config) => {
    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      // Let the browser auto-set "multipart/form-data; boundary=..." — if we
      // leave Content-Type as 'application/json' (the instance default), axios
      // will JSON-serialize the FormData and File entries become {}, so multer
      // never sees the file.
      delete config.headers['Content-Type'];
      if (config.headers.common) {
        delete config.headers.common['Content-Type'];
      }
    } else {
      config.headers['Content-Type'] = 'application/json';
    }

    if (WRITE_METHODS.includes(String(config.method).toLowerCase())) {
      config.headers['x-batch-id'] = getCurrentBatchId() || newBatchId();
    }

    console.log(`📡 API ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      headers: config.headers,
      withCredentials: true,
      ...config
    });

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for API
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} success:`, {
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    return response;
  },
  (error) => {
    // Put the status and the server's own message in the log LINE, not only in
    // the object — the console collapses an object argument to "Object", which
    // is exactly the detail a support engineer needs and cannot see. The object
    // still follows for the full body.
    const serverSaid = error.response?.data?.message || error.message;
    console.error(
      `❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} error: HTTP ${error.response?.status ?? 'no response'} — ${serverSaid}`,
      { status: error.response?.status, data: error.response?.data, message: error.message }
    );

    // Handle 400 Bad Request - validation errors
    if (error.response?.status === 400 && error.response?.data?.errors) {
      error.response.data.errors.forEach((e) => {
        // errors entries may be plain strings (custom validators) or
        // objects { msg } / { message } (express-validator style).
        toast.error(typeof e === 'string' ? e : (e.msg || e.message || 'Validation error'));
      });
    }

    // Handle 401 Unauthorized responses (skip if already on login page to avoid reload loop)
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      console.log('Received 401 Unauthorized, logging out...');
      window.location.href = '/'
    }

    // Reject with the response body, but keep the HTTP status on it — callers
    // need to tell "you may not see this" (403) apart from "this broke" (5xx)
    // so they can explain themselves instead of rendering a dead control.
    const body = error.response?.data;
    if (body && typeof body === 'object') {
      return Promise.reject(Object.assign({}, body, { httpStatus: error.response.status }));
    }
    return Promise.reject(error);
  }
);

export { api };