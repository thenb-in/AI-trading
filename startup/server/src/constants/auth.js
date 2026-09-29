// Validation constants
// Password validation
const VALIDATION_MIN_PASSWORD_LENGTH = 8;
const VALIDATION_MAX_PASSWORD_LENGTH = 128;

// Username validation
const VALIDATION_MIN_USERNAME_LENGTH = 3;
const VALIDATION_MAX_USERNAME_LENGTH = 50;

// Email validation
const VALIDATION_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Date and time format constants
const TIME_ZONE = 'Asia/Kolkata';
const DEFAULT_DATE_FORMAT = 'dd-MM-yyyy';
const DEFAULT_DATE_LOCALE = 'nl-NL'; // locale as per DEFAULT_DATE_FORMAT

// JWT-related constants
const JWT_DEFAULT_ACCESS_EXPIRATION = '15m';
const JWT_DEFAULT_REFRESH_EXPIRATION = '7d';
const JWT_ALGORITHM = 'HS256';
// How long a just-rotated refresh token is still accepted, so parallel requests converge instead of logging out.
const REFRESH_ROTATION_GRACE_MS = 15000;

// Setup script default constants
const SETUP_DEFAULT_COMPANY_NAME = 'default';
const SETUP_BCRYPT_ROUNDS = 10;

// Signup failures. The controller and the services below it raise plain Errors,
// so the view classifies them by matching their message — these are the needles
// it looks for, kept beside the message they have to keep matching.
const SIGNUP_GENERIC_ERROR = 'An error occurred during signup';
const SIGNUP_CONFLICT_MESSAGES = ['Phone number already exists', 'username', 'Username'];



module.exports = {
  VALIDATION_MIN_PASSWORD_LENGTH,
  VALIDATION_MAX_PASSWORD_LENGTH,
  VALIDATION_MIN_USERNAME_LENGTH,
  VALIDATION_MAX_USERNAME_LENGTH,
  VALIDATION_EMAIL_REGEX,
  TIME_ZONE,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_LOCALE,
  JWT_DEFAULT_ACCESS_EXPIRATION,
  JWT_DEFAULT_REFRESH_EXPIRATION,
  JWT_ALGORITHM,
  REFRESH_ROTATION_GRACE_MS,
  SETUP_DEFAULT_COMPANY_NAME,
  SETUP_BCRYPT_ROUNDS,
  SIGNUP_GENERIC_ERROR,
  SIGNUP_CONFLICT_MESSAGES
};

