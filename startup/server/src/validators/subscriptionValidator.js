/**
 * Validators for subscription admin operations.
 * Uses express-validator for request validation (mirrors authValidator/helpSupportValidator).
 */
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationErrorsMiddleware');
const { VALID_SUBSCRIPTION_STATUSES } = require('../constants/subscription');

// Shared shape for a `permissions: [{ name, status }]` body. Matching is on name because a
// permission's id is only a local serial — an exported subscription's ids mean nothing here.
const permissionItemRules = [
  body('permissions.*.name')
    .exists().withMessage((value) => `permission name is required. Received: "${value}".`)
    .bail()
    .isString().withMessage((value) => `permission name must be a string. Received: "${value}".`),
  body('permissions.*.status')
    .isIn(VALID_SUBSCRIPTION_STATUSES).withMessage(`status must be one of: ${VALID_SUBSCRIPTION_STATUSES.join(', ')}`)
];

const createSubscriptionValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage((value) => `Subscription name is required. Received: "${value}".`)
    .bail()
    .isLength({ min: 2, max: 50 }).withMessage((value) => `Subscription name must be between 2 and 50 characters. Received: "${value}".`),
  body('description')
    .optional({ nullable: true })
    .isString().withMessage((value) => `description must be a string. Received: "${value}".`)
    .isLength({ max: 500 }).withMessage((value) => `description cannot exceed 500 characters. Received: "${value}".`)
    .customSanitizer((value) => (typeof value === 'string' && value.trim() ? value.trim() : null)),
  body('isGlobal')
    .optional()
    .isBoolean().withMessage((value) => `isGlobal must be a boolean. Received: "${value}".`),
  body('permissions')
    .optional()
    .isArray().withMessage((value) => `permissions must be an array. Received: "${value}".`),
  ...permissionItemRules,
  handleValidationErrors
];

const updateSubscriptionPermissionsValidation = [
  param('subscription_id')
    .notEmpty().withMessage((value) => `subscription_id is required. Received: "${value}".`)
    .bail()
    .isInt().withMessage((value) => `subscription_id must be an integer. Received: "${value}".`),
  body('isGlobal')
    .optional()
    .isBoolean().withMessage((value) => `isGlobal must be a boolean. Received: "${value}".`),
  body('permissions')
    .isArray().withMessage((value) => `permissions must be an array. Received: "${value}".`),
  ...permissionItemRules,
  handleValidationErrors
];

const importSubscriptionValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage((value) => `Subscription name is required. Received: "${value}".`)
    .bail()
    .isLength({ min: 2, max: 50 }).withMessage((value) => `Subscription name must be between 2 and 50 characters. Received: "${value}".`),
  body('description')
    .optional({ nullable: true })
    .isString().withMessage((value) => `description must be a string. Received: "${value}".`)
    .isLength({ max: 500 }).withMessage((value) => `description cannot exceed 500 characters. Received: "${value}".`),
  body('isGlobal')
    .optional()
    .isBoolean().withMessage((value) => `isGlobal must be a boolean. Received: "${value}".`),
  body('permissions')
    .isArray({ min: 1 }).withMessage((value) => `permissions must be a non-empty array. Received: "${value}".`),
  ...permissionItemRules,
  handleValidationErrors
];

module.exports = {
  createSubscriptionValidation,
  updateSubscriptionPermissionsValidation,
  importSubscriptionValidation
};
