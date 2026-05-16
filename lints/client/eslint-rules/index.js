// Main ESLint custom rules index file for client
// This file imports and exports all custom rules for better organization

import noAnonymousComponents from './rules/no-anonymous-components.js';
import noInlineComponents from './rules/no-inline-components.js';
import noMagicSpacing from './rules/no-magic-spacing.js';
import noInlineStyles from './rules/no-inline-styles.js';
import themeValuesOnly from './rules/theme-values-only.js';
import noDirectFetch from './rules/no-direct-fetch.js';
import noInlineArrowFunctions from './rules/no-inline-arrow-functions.js';
import namedExportsOnly from './rules/named-exports-only.js';
import bottomExportsOnly from './rules/bottom-exports-only.js';
import enforceDateTimeUtils from './rules/enforce-date-time-utils.js';

// Combine all rules into a single object
const customRules = {
  ...noAnonymousComponents,
  ...noInlineComponents,
  ...noMagicSpacing,
  ...noInlineStyles,
  ...themeValuesOnly,
  ...noDirectFetch,
  ...noInlineArrowFunctions,
  ...namedExportsOnly,
  ...bottomExportsOnly,
  ...enforceDateTimeUtils,
};

export default {
  rules: customRules
};

