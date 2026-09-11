// Main ESLint custom rules index file
// This file imports and exports all custom rules for better organization

const noConsoleUsage = require('./rules/no-console-usage');
const loggerArgsChecker = require('./rules/logger-args-checker');
const noDirectDotenv = require('./rules/no-direct-dotenv');
const noHardcodedStrings = require('./rules/no-hardcoded-strings');
const warnMixedStrings = require('./rules/warn-mixed-strings');
const noJsonStringifyInLogs = require('./rules/no-json-stringify-in-logs');
const constantsInSingleFolder = require('./rules/constants-in-single-folder');
const fileLengthWarning = require('./rules/file-length-warning');
const noDirectModelImports = require('./rules/no-direct-model-imports');
const namedExportsOnly = require('./rules/named-exports-only');
const noEnvOutsideEnvJs = require('./rules/no-env-outside-env-js');
const noStartupImportsApp = require('./rules/no-startup-imports-app');
const noParanoidModels = require('./rules/no-paranoid-models');

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
  ...namedExportsOnly,
  ...noEnvOutsideEnvJs,
  ...noStartupImportsApp,
  ...noParanoidModels
};

module.exports = {
  rules: customRules
};
