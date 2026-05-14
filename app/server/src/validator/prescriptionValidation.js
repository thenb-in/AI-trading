const { body, param, validationResult } = require('express-validator');

const validateCreatePrescription = [
  body('doctor_id')
    .notEmpty()
    .withMessage('Doctor ID is required')
    .isInt()
    .withMessage('Doctor ID must be a valid number'),

  body('date')
    .notEmpty()
    .withMessage('Prescription date is required')
    .isISO8601()
    .withMessage('Date must be a valid date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters'),

  body('medicine_intake')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medicine intake must not exceed 2000 characters'),

  body('next_follow_up')
    .optional()
    .isISO8601()
    .withMessage('Next follow-up date must be a valid date')
];

const validateUpdatePrescription = [
  param('id')
    .isInt()
    .withMessage('Prescription ID must be a valid number'),

  body('doctor_id')
    .optional()
    .isInt()
    .withMessage('Doctor ID must be a valid number'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters'),

  body('medicine_intake')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medicine intake must not exceed 2000 characters'),

  body('next_follow_up')
    .optional()
    .isISO8601()
    .withMessage('Next follow-up date must be a valid date')
];

const validateGetPrescriptionById = [
  param('id')
    .isInt()
    .withMessage('Prescription ID must be a valid number')
];

const validateDeletePrescription = [
  param('id')
    .isInt()
    .withMessage('Prescription ID must be a valid number')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = {
  validateCreatePrescription,
  validateUpdatePrescription,
  validateGetPrescriptionById,
  validateDeletePrescription,
  handleValidationErrors
};
