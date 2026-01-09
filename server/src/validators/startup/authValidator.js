/**
 * Validators for authentication operations
 * Uses express-validator for request validation
 */
const { body, validationResult } = require('express-validator');

const signupValidation = [
  body('phone').isMobilePhone().withMessage(`Invalid phone number for signup ${body('phone').value}.`),
  body('password')
    .isLength({ min: 8 })
    .withMessage(`Password must be at least 8 characters ${body('password').value}.`)
    .matches(/[A-Z]/)
    .withMessage(`Password must contain at least one uppercase letter ${body('password').value}.`)
    .matches(/[0-9]/)
    .withMessage(`Password must contain at least one number ${body('password').value}.`),
  body('name').notEmpty().withMessage('Name is required'),
  body('companyId').isUUID().withMessage('Invalid company ID')
];

const loginValidation = [
  body('password').notEmpty().withMessage(`Password is required ${body('password').value}.`)
];

const resetPasswordValidation = [
  body('username').notEmpty().withMessage(`Username is required ${body('username').value}.`),
  body('password').notEmpty().withMessage(`Password is required ${body('password').value}.`)
];

const approveUserValidation = [
  // eslint-disable-next-line custom/no-hardcoded-strings
  body('requirePasswordReset').optional().isBoolean().withMessage('requirePasswordReset must be a boolean')
];

const generateTotpSecretValidation = [
  body('username').notEmpty().withMessage('Username is required')
];

const verifyTotpValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('totpCode').isLength({ min: 6, max: 6 }).withMessage(`TOTP code must be exactly 6 digits , provide :${ body('totpCode').length}`).isNumeric().withMessage(`TOTP code must contain only numeric characters , provide :${ body('totpCode').value}`)
];

/**
 * Middleware to handle validation results
 * Returns 400 with errors if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  signupValidation: [...signupValidation, handleValidationErrors],
  loginValidation: [...loginValidation, handleValidationErrors],
  resetPasswordValidation: [...resetPasswordValidation, handleValidationErrors],
  approveUserValidation: [...approveUserValidation, handleValidationErrors],
  generateTotpSecretValidation: [...generateTotpSecretValidation, handleValidationErrors],
  verifyTotpValidation: [...verifyTotpValidation, handleValidationErrors]
};

