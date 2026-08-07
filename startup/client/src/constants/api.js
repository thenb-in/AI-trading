// API Configuration constants
const API_TIMEOUT = 10000; // 10 seconds
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_DELAY = 1000; // 1 second
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Statuses the UI branches on. Rejected API errors carry the status as
// `httpStatus` (see axiosConfig) so a caller can explain a denial rather than
// render an empty, unexplained control.
const HTTP_STATUS_FORBIDDEN = 403;

export {
  API_TIMEOUT,
  API_RETRY_ATTEMPTS,
  API_RETRY_DELAY,
  API_BASE_URL,
  HTTP_STATUS_FORBIDDEN
};

