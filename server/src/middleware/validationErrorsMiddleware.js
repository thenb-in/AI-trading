const {  validationResult } = require('express-validator');

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

module.exports={
  handleValidationErrors
};
