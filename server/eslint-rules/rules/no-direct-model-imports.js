// No direct model imports rule
module.exports = {
  'no-direct-model-imports': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce use of services layer instead of direct model imports in controllers and routes',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noDirectModelImports: 'Do not import models directly. Use the services layer instead. Import {{modelName}} from the appropriate service file.',
        noDirectModelUsage: 'Direct model usage detected. Use the services layer for database operations instead of calling {{modelName}}.{{method}}() directly.'
      }
    },
    create(context) {
      const filename = context.getFilename();

      // Services are allowed to use models, so skip this rule for service files
      const isServiceFile = filename.includes('/services/') || filename.includes('\\services\\');
      if (isServiceFile) {
        return {};
      }

      // Also skip for model files themselves and test files
      if (filename.includes('/models/') || filename.includes('\\models\\') ||
          filename.includes('.test.js') || filename.includes('.spec.js')) {
        return {};
      }

      // Track imported models
      const importedModels = new Set();

      // jscpd:ignore-start
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

      // Helper function to extract model names from import
      function extractModelNames(node) {
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
            // Default import: const models = require('../../models');
            modelNames.push(declaration.id.name);
          }
        }
        return modelNames;
      }
      // jscpd:ignore-end

      return {
        // Check for CommonJS require() imports
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal') {
            const requirePath = node.arguments[0].value;

            // Block imports to specific model files (e.g., ../models/User)
            if (isSpecificModelImport(requirePath)) {
              const modelNames = extractModelNames(node);
              modelNames.forEach(modelName => {
                importedModels.add(modelName);
              });
              const firstModelName = modelNames[0] || 'models';
              context.report({
                node,
                messageId: 'noDirectModelImports',
                data: {
                  modelName: firstModelName
                }
              });
              return;
            }

            // Block destructured imports from models directory (e.g., const { User } = require('../models'))
            // But allow default imports (e.g., const db = require('../models')) for accessing sequelize
            if (isModelsDirectoryImport(requirePath) && isDestructuredImport(node)) {
              const modelNames = extractModelNames(node);
              modelNames.forEach(modelName => {
                importedModels.add(modelName);
              });
              const firstModelName = modelNames[0] || 'models';
              context.report({
                node,
                messageId: 'noDirectModelImports',
                data: {
                  modelName: firstModelName
                }
              });
            }
          }
        },

        // Check for ES6 import statements
        // jscpd:ignore-start
        ImportDeclaration(node) {
          if (node.source && node.source.type === 'Literal') {
            const importPath = node.source.value;

            // Block imports to specific model files
            if (isSpecificModelImport(importPath)) {
              const modelNames = [];
              if (node.specifiers) {
                node.specifiers.forEach(spec => {
                  if (spec.type === 'ImportSpecifier') {
                    // Named import: import { User, Employee } from '../../models';
                    modelNames.push(spec.imported.name);
                    importedModels.add(spec.imported.name);
                  } else if (spec.type === 'ImportDefaultSpecifier') {
                    // Default import: import models from '../../models';
                    modelNames.push(spec.local.name);
                    importedModels.add(spec.local.name);
                  } else if (spec.type === 'ImportNamespaceSpecifier') {
                    // Namespace import: import * as models from '../../models';
                    modelNames.push(spec.local.name);
                    importedModels.add(spec.local.name);
                  }
                });
              }

              // Report the import
              const firstModelName = modelNames[0] || 'models';
              context.report({
                node,
                messageId: 'noDirectModelImports',
                data: {
                  modelName: firstModelName
                }
              });
              return;
            }

            // Block destructured/named imports from models directory, but allow default/namespace imports
            if (isModelsDirectoryImport(importPath)) {
              const hasNamedImports = node.specifiers && node.specifiers.some(
                spec => spec.type === 'ImportSpecifier'
              );
              if (hasNamedImports) {
                const modelNames = [];
                node.specifiers.forEach(spec => {
                  if (spec.type === 'ImportSpecifier') {
                    modelNames.push(spec.imported.name);
                    importedModels.add(spec.imported.name);
                  }
                });
                const firstModelName = modelNames[0] || 'models';
                context.report({
                  node,
                  messageId: 'noDirectModelImports',
                  data: {
                    modelName: firstModelName
                  }
                });
              }
            }
          }
        },
        // jscpd:ignore-end

        // Check for direct model usage (Sequelize methods)
        MemberExpression(node) {
          if (node.object.type === 'Identifier' && importedModels.has(node.object.name)) {
            // Check if it's a Sequelize model method call
            if (node.property.type === 'Identifier' &&
                ['findAll', 'findOne', 'findByPk', 'findByPrimaryKey', 'create', 'update',
                  'destroy', 'bulkCreate', 'upsert', 'count', 'findAndCountAll', 'max',
                  'min', 'sum', 'increment', 'decrement', 'truncate', 'restore'].includes(node.property.name)) {

              context.report({
                node,
                messageId: 'noDirectModelUsage',
                data: {
                  modelName: node.object.name,
                  method: node.property.name
                }
              });
            }
          }
        }
      };
    }
  }
};
