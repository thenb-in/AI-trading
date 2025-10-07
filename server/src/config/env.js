// Centralized environment configuration
// This file sets up dotenv-safe once and exports the configuration
require('dotenv-safe').config({
  allowEmptyValues: true,
  example: '.env.example'
});

// Export the configuration for use in other files
module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVER_URL: process.env.SERVER_URL,

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DIALECT: process.env.DB_DIALECT || 'postgres',

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  MAX_JWT_ACCESS_EXPIRATION_MS: parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, 10) || 900000,
  MAX_JWT_REFRESH_EXPIRATION_MS: parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, 10) || 604800000,

  // Helper functions
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test'
};
