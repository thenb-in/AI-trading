const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationErrorsMiddleware');

const openTicketValidation = [
  body('pageUrl')
    .trim()
    .notEmpty()
    .withMessage((value) => `pageUrl is required. Received: "${value}".`),
  body('priority')
    .trim()
    .notEmpty()
    .withMessage((value) => `priority is required. Received: "${value}".`),
  body('category')
    .trim()
    .notEmpty()
    .withMessage((value) => `category is required. Received: "${value}".`),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage((value) => `comment is required. Received: "${value}".`),
  body('logs')
    .optional()
    .isString()
    .withMessage((value) => `logs must be a string. Received: "${value}".`),
  handleValidationErrors
];

module.exports = {
  openTicketValidation
};
