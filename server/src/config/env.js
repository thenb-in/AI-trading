// Centralized environment configuration
const { PARSE_INT_RADIX, PRODUCTION_ENV } = require('../constants/startup');
// This file sets up dotenv-safe once and exports the configuration
require('dotenv-safe').config({
  allowEmptyValues: true,
  example: '.env.example'
});

// Export the configuration for use in other files
const isProduction = process.env.NODE_ENV === PRODUCTION_ENV;
module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVER_URL: process.env.SERVER_URL,

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DIALECT: process.env.DB_DIALECT,

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  MAX_JWT_ACCESS_EXPIRATION_MS: parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, PARSE_INT_RADIX),
  MAX_JWT_REFRESH_EXPIRATION_MS: parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, PARSE_INT_RADIX),

  DEFAULT_COMPANY_NAME: process.env.DEFAULT_COMPANY_NAME,

  // Helper functions
  isProduction,
  isDevelopment: !isProduction
};
