// Server constants - centralized location for all constants (except logger)
// This file exports all constants used throughout the server

// API Response Messages
const API_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  ERROR: 'An error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

// Database Constants
const DB_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_ORDER: 'ASC'
};

// JWT Constants
const JWT_CONSTANTS = {
  DEFAULT_ACCESS_EXPIRATION: '15m',
  DEFAULT_REFRESH_EXPIRATION: '7d',
  ALGORITHM: 'HS256'
};

// File Upload Constants
const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain']
};

// Validation Constants
const VALIDATION_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

const PARSE_INT_RADIX = 10;
const PRODUCTION_ENV = 'production';




// Setup Script Constants
const SETUP_CONSTANTS = {
  DEFAULT_COMPANY_NAME: 'default',
  BCRYPT_ROUNDS: 10
};

// Export all constants
module.exports = {
  API_MESSAGES,
  HTTP_STATUS,
  DB_CONSTANTS,
  JWT_CONSTANTS,
  FILE_CONSTANTS,
  VALIDATION_CONSTANTS,
  PARSE_INT_RADIX,
  PRODUCTION_ENV,
  SETUP_CONSTANTS
};
