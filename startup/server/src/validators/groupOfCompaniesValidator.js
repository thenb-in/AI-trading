const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationErrorsMiddleware');

const checkName = body('name')
  .trim()
  .notEmpty()
  .withMessage('A group of companies needs a name.')
  .isLength({ max: 255 })
  .withMessage('Group name is too long (255 characters max).');

const checkCompanyIds = body('companyIds')
  .optional()
  .isArray()
  .withMessage('companyIds must be a list of company ids.');

const checkUserIds = body('userIds')
  .optional()
  .isArray()
  .withMessage('userIds must be a list of user ids.');

const groupOfCompaniesCreateValidation = [checkName, checkCompanyIds, checkUserIds, handleValidationErrors];

const groupOfCompaniesUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Group name cannot be blank.')
    .isLength({ max: 255 }).withMessage('Group name is too long (255 characters max).'),
  checkCompanyIds,
  checkUserIds,
  handleValidationErrors
];

module.exports = { groupOfCompaniesCreateValidation, groupOfCompaniesUpdateValidation };
