// No sequelize.models usage rule
// Prevents services from accessing other models through sequelize.models
// Services should use other service files instead
module.exports = {
  'no-sequelize-models': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Prevent services from accessing models through sequelize.models. Use service files instead.',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noSequelizeModels: 'Do not access models through sequelize.models (e.g., Model.sequelize.models.OtherModel). Use the appropriate service file instead (e.g., require(\'./otherService\')).'
      }
    },
    create(context) {
      const filename = context.getFilename();

      // Only apply this rule to service files
      const isServiceFile = filename.includes('/services/') || filename.includes('\\services\\');
      if (!isServiceFile) {
        return {};
      }

      // Skip model files themselves and test files
      if (filename.includes('/models/') || filename.includes('\\models\\') ||
          filename.includes('.test.js') || filename.includes('.spec.js')) {
        return {};
      }

      return {
        // Check for MemberExpression like Model.sequelize.models.OtherModel
        MemberExpression(node) {
          // Check if this is accessing .sequelize.models
          if (node.property && node.property.name === 'models') {
            // Check if parent is .sequelize
            if (node.object && node.object.type === 'MemberExpression' &&
                node.object.property && node.object.property.name === 'sequelize') {
              // This is Model.sequelize.models
              context.report({
                node,
                messageId: 'noSequelizeModels'
              });
            }
          }
        }
      };
    }
  }
};
