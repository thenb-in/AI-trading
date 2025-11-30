// API Configuration constants
const API_TIMEOUT = 10000; // 10 seconds
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_DELAY = 1000; // 1 second
const API_BASE_URL = import.meta.env.VITE_API_URL;

export {
  API_TIMEOUT,
  API_RETRY_ATTEMPTS,
  API_RETRY_DELAY,
  API_BASE_URL
};

