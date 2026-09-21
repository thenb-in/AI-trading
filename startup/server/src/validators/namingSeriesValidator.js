const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validationErrorsMiddleware');
const { templateProblem } = require('../utils/namingSeriesTemplate');
const { isNamingSeriesMaster, getNamingSeriesMasters } = require('../utils/namingSeriesRegistry');

const checkTemplate = (template) => {
  const problem = templateProblem(template);
  if (problem) {
    throw new Error(problem);
  }
  return true;
};

const checkCount = body('count')
  .optional()
  .isInt({ min: 0 })
  .withMessage('Last number must be a whole number, 0 or more.');

const namingSeriesCreateValidation = [
  body('master').custom((master) => {
    if (!isNamingSeriesMaster(master)) {
      const known = getNamingSeriesMasters().map((entry) => entry.master).join(', ') || 'none registered';
      throw new Error(`"${master}" does not number its rows from a naming series. Pick one of: ${known}.`);
    }
    return true;
  }),
  body('template').custom(checkTemplate),
  checkCount,
  handleValidationErrors
];

const namingSeriesUpdateValidation = [
  body('template').optional().custom(checkTemplate),
  checkCount,
  handleValidationErrors
];

module.exports = { namingSeriesCreateValidation, namingSeriesUpdateValidation };
