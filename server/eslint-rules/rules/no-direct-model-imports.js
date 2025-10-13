// No direct model imports rule
module.exports = {
  'no-direct-model-imports': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce use of services layer instead of direct model imports in controllers',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noDirectModelImports: 'Controllers should not import models directly. Use the services layer instead. Import {{modelName}} from the appropriate service file.',
        noDirectModelUsage: 'Direct model usage detected. Use the services layer for database operations instead of calling {{modelName}}.{{method}}() directly.'
      }
    },
    create(context) {
      const filename = context.getFilename();

      // Only apply this rule to controller files
      const isControllerFile = filename.includes('/controllers/') || filename.includes('\\controllers\\');
      if (!isControllerFile) {
        return {};
      }

      // Track imported models
      const importedModels = new Set();

      return {
        // Check for direct model imports
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal') {
            const requirePath = node.arguments[0].value;

            // Check if importing from models directory
            if (requirePath.includes('../models') || requirePath.includes('./models') || requirePath.includes('../../models')) {
              // Allow importing from models/index.js for services
              if (requirePath.includes('models/index.js') || requirePath.includes('models/')) {
                // Check if this is a destructured import
                if (node.parent && node.parent.type === 'VariableDeclarator') {
                  const declaration = node.parent;
                  if (declaration.id.type === 'ObjectPattern') {
                    // Extract model names from destructuring
                    declaration.id.properties.forEach(prop => {
                      if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                        importedModels.add(prop.key.name);
                      }
                    });
                  } else if (declaration.id.type === 'Identifier') {
                    importedModels.add(declaration.id.name);
                  }
                }

                context.report({
                  node,
                  messageId: 'noDirectModelImports',
                  data: {
                    modelName: 'models'
                  }
                });
              }
            }
          }
        },

        // Check for direct model usage
        MemberExpression(node) {
          if (node.object.type === 'Identifier' && importedModels.has(node.object.name)) {
            // Check if it's a model method call
            if (node.property.type === 'Identifier' &&
                ['findAll', 'findOne', 'findByPk', 'create', 'update', 'destroy', 'bulkCreate'].includes(node.property.name)) {

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
