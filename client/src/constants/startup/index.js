// Client constants - centralized location for all constants (except logger)
// This file exports all constants used throughout the client

// API Configuration
const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  BASE_URL: import.meta.env.VITE_API_URL
};

// UI Constants
const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200
};

// Form Validation Constants
const FORM_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// Local Storage Keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Route Constants
const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  ADMIN_DASHBOARD: '/admin',
  USER_MANAGEMENT: '/admin/users',
  ROLES_PERMISSIONS: '/admin/roles'
};

// Permission Constants
const PERMISSIONS = {
  USER_MANAGEMENT: 'user_management',
  ROLE_MANAGEMENT: 'role_management',
  COMPANY_SETTINGS: 'company_settings',
  SYSTEM_ADMIN: 'system_admin'
};

// Theme Constants
const THEME_CONSTANTS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Export all constants
export {
  API_CONFIG,
  UI_CONSTANTS,
  FORM_CONSTANTS,
  STORAGE_KEYS,
  ROUTES,
  PERMISSIONS,
  THEME_CONSTANTS
};
