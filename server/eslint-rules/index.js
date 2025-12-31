// Main ESLint custom rules index file
// This file imports and exports all custom rules for better organization

const constantsInSingleFolder = require('./rules/constants-in-single-folder');
const fileLengthWarning = require('./rules/file-length-warning');
const loggerArgsChecker = require('./rules/logger-args-checker');
const namedExportsOnly = require('./rules/named-exports-only');
const noConsoleUsage = require('./rules/no-console-usage');
const noDirectDotenv = require('./rules/no-direct-dotenv');
const noDirectModelImports = require('./rules/no-direct-model-imports');
const noHardcodedStrings = require('./rules/no-hardcoded-strings');
const noJsonStringifyInLogs = require('./rules/no-json-stringify-in-logs');
const noSequelizeModels = require('./rules/no-sequelize-models');
const oneModelPerService = require('./rules/one-model-per-service');
const warnMixedStrings = require('./rules/warn-mixed-strings');

// Combine all rules into a single object
const customRules = {
  ...noConsoleUsage,
  ...loggerArgsChecker,
  ...noDirectDotenv,
  ...noHardcodedStrings,
  ...warnMixedStrings,
  ...noJsonStringifyInLogs,
  ...constantsInSingleFolder,
  ...fileLengthWarning,
  ...noDirectModelImports,
  ...noSequelizeModels,
  ...oneModelPerService,
  ...namedExportsOnly
};

module.exports = {
  rules: customRules
};
