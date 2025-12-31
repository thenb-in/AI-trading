// One model per service rule
// Enforces that each service file can only import one model
// This ensures a one-to-one mapping between services and models
//
// Usage in eslint.config.js:
// 'custom/one-model-per-service': ['error', { warnThreshold: 2, errorThreshold: 3 }],
// 'custom/one-model-per-service-warn': ['warn', { warnThreshold: 2, errorThreshold: 3 }],
//
// The same rule is configured twice with different severities:
// - As 'warn': reports when modelCount >= warnThreshold and < errorThreshold
// - As 'error': reports when modelCount >= errorThreshold

// Shared helper functions
function createModelImportTracker() {
  const importedModels = new Set();
  const modelImportNodes = [];
  const defaultImportNodes = [];

  // Helper function to check if a path imports from models directory
  function isModelsDirectoryImport(path) {
    if (typeof path !== 'string') {
      return false;
    }
    // Check if path ends with models or models/index (for accessing db/sequelize)
    // Matches: ../models, ../../models, models, models/index, models/index.js
    const modelsDirPattern = /(^|\/|\\)models(\/index(\.js)?)?$/;
    return modelsDirPattern.test(path);
  }

  // Helper function to check if a path imports a specific model file
  function isSpecificModelImport(path) {
    if (typeof path !== 'string') {
      return false;
    }
    // Check for imports to specific model files
    // Matches: ../models/User, ../../models/startup/User, models/User, etc.
    const specificModelPattern = /(^|\/|\\)models\/[^/]+/;
    return specificModelPattern.test(path);
  }

  // Helper function to check if import is destructured
  function isDestructuredImport(node) {
    if (node.parent && node.parent.type === 'VariableDeclarator') {
      return node.parent.id.type === 'ObjectPattern';
    }
    return false;
  }

  // Helper function to check if import is default (non-destructured)
  function isDefaultImport(node) {
    if (node.parent && node.parent.type === 'VariableDeclarator') {
      return node.parent.id.type === 'Identifier';
    }
    return false;
  }

  // Helper function to extract model names from CommonJS require
  function extractModelNamesFromRequire(node) {
    const modelNames = [];
    if (node.parent && node.parent.type === 'VariableDeclarator') {
      const declaration = node.parent;
      if (declaration.id.type === 'ObjectPattern') {
        // Destructured import: const { User, Employee } = require('../../models');
        declaration.id.properties.forEach(prop => {
          if (prop.type === 'Property' && prop.key.type === 'Identifier') {
            modelNames.push(prop.key.name);
          } else if (prop.type === 'Property' && prop.value && prop.value.type === 'Identifier') {
            // Handle aliases: const { User: UserModel } = require('../../models');
            modelNames.push(prop.value.name);
          } else if (prop.type === 'Identifier') {
            // Shorthand: const { User } = require('../../models');
            modelNames.push(prop.name);
          }
        });
      } else if (declaration.id.type === 'Identifier') {
        // Default import: const db = require('../../models')
        // Count as one model import (we can't determine how many models it accesses)
        modelNames.push(declaration.id.name);
      }
    }
    return modelNames;
  }

  // Helper function to extract model names from ES6 import
  function extractModelNamesFromImport(node) {
    const modelNames = [];
    if (node.specifiers) {
      node.specifiers.forEach(spec => {
        if (spec.type === 'ImportSpecifier') {
          // Named import: import { User, Employee } from '../../models';
          modelNames.push(spec.imported.name);
        } else if (spec.type === 'ImportDefaultSpecifier') {
          // Default import: import db from '../../models'
          // Count as one model import (we can't determine how many models it accesses)
          modelNames.push(spec.local.name);
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          // Namespace import: import * as db from '../../models'
          // Count as one model import (we can't determine how many models it accesses)
          modelNames.push(spec.local.name);
        }
      });
    }
    return modelNames;
  }

  return {
    importedModels,
    modelImportNodes,
    defaultImportNodes,
    isModelsDirectoryImport,
    isSpecificModelImport,
    isDestructuredImport,
    isDefaultImport,
    extractModelNamesFromRequire,
    extractModelNamesFromImport
  };
}

function createRuleHandlers(tracker, context) {
  const {
    importedModels,
    modelImportNodes,
    defaultImportNodes,
    isModelsDirectoryImport,
    isSpecificModelImport,
    isDestructuredImport,
    isDefaultImport,
    extractModelNamesFromRequire,
    extractModelNamesFromImport
  } = tracker;

  return {
    // Check for CommonJS require() imports - block ALL requires inside functions
    CallExpression(node) {
      if (node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal') {
        const requirePath = node.arguments[0].value;

        // Check if this is a model import
        const isModelImport = isSpecificModelImport(requirePath) || isModelsDirectoryImport(requirePath);

        if (isModelImport) {
          // Check if this is top-level (allowed) or inside a function (not allowed)
          const isTopLevel = node.parent &&
                node.parent.type === 'VariableDeclarator' &&
                node.parent.parent &&
                node.parent.parent.type === 'VariableDeclaration' &&
                node.parent.parent.parent &&
                node.parent.parent.parent.type === 'Program';

          if (!isTopLevel) {
            // Block ALL model requires inside functions
            context.report({
              node,
              messageId: 'noModelRequireInFunction',
              data: { path: requirePath }
            });
            return;
          }

          // Top-level requires - track for one-model-per-service check
          if (isSpecificModelImport(requirePath)) {
            const modelNames = extractModelNamesFromRequire(node);
            modelNames.forEach(modelName => {
              importedModels.add(modelName);
            });
            modelImportNodes.push({ node, modelNames });
          } else if (isModelsDirectoryImport(requirePath)) {
            if (isDestructuredImport(node)) {
              // Destructured import: const { User, Company } = require('../../models')
              const modelNames = extractModelNamesFromRequire(node);
              modelNames.forEach(modelName => {
                importedModels.add(modelName);
              });
              modelImportNodes.push({ node, modelNames });
            } else if (isDefaultImport(node)) {
              // Default import: const db = require('../../models') - NOT ALLOWED
              defaultImportNodes.push(node);
            }
          }
        }
      }
    },

    // Check for ES6 import statements
    ImportDeclaration(node) {
      if (node.source && node.source.type === 'Literal') {
        const importPath = node.source.value;

        // Check if this is a model import
        if (isSpecificModelImport(importPath)) {
          const modelNames = extractModelNamesFromImport(node);
          modelNames.forEach(modelName => {
            importedModels.add(modelName);
          });
          modelImportNodes.push({ node, modelNames });
        } else if (isModelsDirectoryImport(importPath)) {
          // Check for imports from models directory
          if (node.specifiers) {
            const hasNamedImports = node.specifiers.some(spec => spec.type === 'ImportSpecifier');
            const hasDefaultImport = node.specifiers.some(spec => spec.type === 'ImportDefaultSpecifier');
            const hasNamespaceImport = node.specifiers.some(spec => spec.type === 'ImportNamespaceSpecifier');

            if (hasNamedImports) {
              // Named import: import { User, Company } from '../../models'
              const modelNames = extractModelNamesFromImport(node);
              modelNames.forEach(modelName => {
                importedModels.add(modelName);
              });
              modelImportNodes.push({ node, modelNames });
            } else if (hasDefaultImport || hasNamespaceImport) {
              // Default or namespace import: import db from '../../models' - NOT ALLOWED
              defaultImportNodes.push(node);
            }
          }
        }
      }
    }
  };
}

function shouldSkipFile(filename) {
  // Only apply this rule to service files
  const isServiceFile = filename.includes('/services/') || filename.includes('\\services\\');
  if (!isServiceFile) {
    return true;
  }

  // Skip model files themselves and test files
  if (filename.includes('/models/') || filename.includes('\\models\\') ||
      filename.includes('.test.js') || filename.includes('.spec.js')) {
    return true;
  }

  return false;
}

// Schema for rule options
const ruleSchema = [
  {
    type: 'object',
    properties: {
      warnThreshold: {
        type: 'number',
        default: 2
      },
      errorThreshold: {
        type: 'number',
        default: 3
      }
    },
    additionalProperties: false
  }
];

// Rule for warnings (reports when count >= warnThreshold and < errorThreshold)
const warnRule = {
  'one-model-per-service-warn': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Warn when service imports models >= warnThreshold and < errorThreshold (configurable thresholds)',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: ruleSchema,
      messages: {
        twoModelsImported: 'Service should only import one model. Found {{count}} model imports: {{models}}. Each service should have a one-to-one mapping with a single model. Use that model services',
        noModelRequireInFunction: 'Do not import models inside functions using require(\'{{path}}\'). Import models at the top level of the file only.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      if (shouldSkipFile(filename)) {
        return {};
      }

      // Get configuration options
      const options = context.options[0] || {};
      const warnThreshold = options.warnThreshold !== undefined ? options.warnThreshold : 2;
      const errorThreshold = options.errorThreshold !== undefined ? options.errorThreshold : 3;

      const tracker = createModelImportTracker();
      const handlers = createRuleHandlers(tracker, context);

      return {
        ...handlers,
        'Program:exit'() {
          // First, report errors for default imports (always an error)
          tracker.defaultImportNodes.forEach(node => {
            context.report({
              node,
              messageId: 'defaultModelImport'
            });
          });

          const modelCount = tracker.importedModels.size;

          // Report warning for models >= warnThreshold and < errorThreshold
          if (modelCount >= warnThreshold && modelCount < errorThreshold) {
            const modelList = Array.from(tracker.importedModels).join(', ');
            if (tracker.modelImportNodes.length > 0) {
              context.report({
                node: tracker.modelImportNodes[0].node,
                messageId: 'twoModelsImported',
                data: {
                  count: modelCount,
                  models: modelList
                }
              });
            }
          }
        }
      };
    }
  }
};

// Rule for errors (reports when count >= errorThreshold)
const errorRule = {
  'one-model-per-service': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Error when service imports models >= errorThreshold (configurable threshold)',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: ruleSchema,
      messages: {
        multipleModelsImported: 'Service can only import one model. Found {{count}} model imports: {{models}}. Each service should have a one-to-one mapping with a single model.',
        defaultModelImport: 'Service cannot use default import from models directory (e.g., const db = require(\'../../models\')). Import only your primary model directly (e.g., const { User } = require(\'../../models\')).',
        noModelRequireInFunction: 'Do not import models inside functions using require(\'{{path}}\'). Import models at the top level of the file only.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      if (shouldSkipFile(filename)) {
        return {};
      }

      // Get configuration options
      const options = context.options[0] || {};
      const errorThreshold = options.errorThreshold !== undefined ? options.errorThreshold : 3;

      const tracker = createModelImportTracker();
      const handlers = createRuleHandlers(tracker, context);

      return {
        ...handlers,
        'Program:exit'() {
          // First, report errors for default imports (always an error)
          tracker.defaultImportNodes.forEach(node => {
            context.report({
              node,
              messageId: 'defaultModelImport'
            });
          });

          const modelCount = tracker.importedModels.size;

          // Report error for models >= errorThreshold
          if (modelCount >= errorThreshold) {
            const modelList = Array.from(tracker.importedModels).join(', ');
            if (tracker.modelImportNodes.length > 0) {
              context.report({
                node: tracker.modelImportNodes[0].node,
                messageId: 'multipleModelsImported',
                data: {
                  count: modelCount,
                  models: modelList
                }
              });
            }
          }
        }
      };
    }
  }
};

// Export both rules (same rule, different names for different severities)
module.exports = {
  ...warnRule,
  ...errorRule
};
