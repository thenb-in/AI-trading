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
  body('phone').isMobilePhone().withMessage(`Invalid phone number for reset password ${body('phone').value}.`),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage(`New password must be at least 8 characters ${body('newPassword').value}.`)
    .matches(/[A-Z]/)
    .withMessage(`New password must contain at least one uppercase letter ${body('newPassword').value}.`)
    .matches(/[0-9]/)
    .withMessage(`New password must contain at least one number ${body('newPassword').value}.`)
];

const approveUserValidation = [
  // eslint-disable-next-line custom/no-hardcoded-strings
  body('requirePasswordReset').optional().isBoolean().withMessage('requirePasswordReset must be a boolean'),
  // eslint-disable-next-line custom/no-hardcoded-strings
  body('roleId').optional().isUUID().withMessage('roleId must be a valid UUID')
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
  approveUserValidation: [...approveUserValidation, handleValidationErrors]
};

