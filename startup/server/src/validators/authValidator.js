/**
 * Validators for authentication operations
 * Uses express-validator for request validation
 */
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationErrorsMiddleware');

const signupValidation = [
  body('phone').isMobilePhone().withMessage((value) => `Invalid phone number for signup ${value}.`),
  body('password')
    .isLength({ min: 8 })
    .withMessage((value) => `Password must be at least 8 characters ${value}.`)
    .matches(/[A-Z]/)
    .withMessage((value) => `Password must contain at least one uppercase letter ${value}.`)
    .matches(/[0-9]/)
    .withMessage((value) => `Password must contain at least one number ${value}.`),
  body('name').notEmpty().withMessage('Name is required'),
  body('company_id').isUUID().withMessage('Invalid company ID')
];

const loginValidation = [
  body('username').notEmpty().withMessage((value) => `Username is required ${value}.`),
  body('password').notEmpty().withMessage((value) => `Password is required ${value}.`)
];

const resetPasswordValidation = [
  body('username').notEmpty().withMessage((value) => `Username is required ${value}.`),
  body('password').notEmpty().withMessage((value) => `Password is required ${value}.`)
];

const approveUserValidation = [
  body('requirePasswordReset').optional().isBoolean().withMessage((value, { path }) =>
    `${path} must be boolean. Received: "${value}"`
  )
];

module.exports = {
  signupValidation: [...signupValidation, handleValidationErrors],
  loginValidation: [...loginValidation, handleValidationErrors],
  resetPasswordValidation: [...resetPasswordValidation, handleValidationErrors],
  approveUserValidation: [...approveUserValidation, handleValidationErrors]
};

