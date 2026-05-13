const { body, param, validationResult } = require('express-validator');

const validateCreateDoctor = [
  body('doctorData.alias')
    .trim()
    .notEmpty()
    .withMessage('Doctor alias is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Doctor alias must be between 2 and 50 characters'),

  body('doctorData.type')
    .trim()
    .notEmpty()
    .withMessage('Doctor type is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Doctor type must be between 2 and 50 characters'),

  body('doctorData.mobile_number')
    .optional()
    .isInt()
    .withMessage('Mobile number must be a valid number'),

  body('doctorData.email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('doctorData.adress')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must not exceed 255 characters'),

  body('doctorData.alternate_number')
    .optional()
    .isInt()
    .withMessage('Alternate number must be a valid number'),

  body('timingsArray')
    .optional()
    .isArray()
    .withMessage('Timings array must be an array'),

  body('timingsArray.*.day')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .trim()
    .notEmpty()
    .withMessage('Day is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day must be a valid day of the week'),

  body('timingsArray.*.start_time')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),

  body('timingsArray.*.end_time')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
];

const validateUpdateDoctor = [
  param('id')
    .isInt()
    .withMessage('Doctor ID must be a valid number'),

  body('doctorData')
    .optional()
    .isObject()
    .withMessage('Doctor data must be an object'),

  body('doctorData.alias')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Doctor alias must be between 2 and 50 characters'),

  body('doctorData.type')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Doctor type must be between 2 and 50 characters'),

  body('doctorData.mobile_number')
    .optional()
    .isInt()
    .withMessage('Mobile number must be a valid number'),

  body('doctorData.email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('doctorData.adress')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must not exceed 255 characters'),

  body('doctorData.alternate_number')
    .optional()
    .isInt()
    .withMessage('Alternate number must be a valid number'),

  body('timingsArray')
    .optional()
    .isArray()
    .withMessage('Timings array must be an array'),

  body('timingsArray.*.id')
    .optional()
    .isInt()
    .withMessage('Timing ID must be a valid number'),

  body('timingsArray.*.day')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .trim()
    .notEmpty()
    .withMessage('Day is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day must be a valid day of the week'),

  body('timingsArray.*.start_time')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),

  body('timingsArray.*.end_time')
    .if((value, { req }) => req.body.timingsArray && Array.isArray(req.body.timingsArray))
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
];

const validateGetDoctorById = [
  param('id')
    .isInt()
    .withMessage('Doctor ID must be a valid number')
];

const validateDeleteDoctor = [
  param('id')
    .isInt()
    .withMessage('Doctor ID must be a valid number')
];

const validateDeleteDoctorTiming = [
  param('doctorId')
    .isInt()
    .withMessage('Doctor ID must be a valid number'),

  param('timingId')
    .isInt()
    .withMessage('Timing ID must be a valid number')
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
  validateCreateDoctor,
  validateUpdateDoctor,
  validateGetDoctorById,
  validateDeleteDoctor,
  validateDeleteDoctorTiming,
  handleValidationErrors
};
