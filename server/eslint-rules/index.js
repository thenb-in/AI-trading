// Main ESLint custom rules index file
// This file imports and exports all custom rules for better organization

const noConsoleUsage = require('./rules/no-console-usage');
const noLoggerCommas = require('./rules/no-logger-commas');
const noDirectDotenv = require('./rules/no-direct-dotenv');
const noHardcodedStrings = require('./rules/no-hardcoded-strings');
const warnMixedStrings = require('./rules/warn-mixed-strings');
const noJsonStringifyInLogs = require('./rules/no-json-stringify-in-logs');
const constantsInSingleFolder = require('./rules/constants-in-single-folder');
const fileLengthWarning = require('./rules/file-length-warning');
const noDirectModelImports = require('./rules/no-direct-model-imports');

// Combine all rules into a single object
const customRules = {
  ...noConsoleUsage,
  ...noLoggerCommas,
  ...noDirectDotenv,
  ...noHardcodedStrings,
  ...warnMixedStrings,
  ...noJsonStringifyInLogs,
  ...constantsInSingleFolder,
  ...fileLengthWarning,
  ...noDirectModelImports
};

module.exports = {
  rules: customRules
};
