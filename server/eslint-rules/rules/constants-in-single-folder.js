// Constants in single folder rule
module.exports = {
  'constants-in-single-folder': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce that all constants (except logger) are defined in the constants folder',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        constantsInSingleFolder: 'Constants should be defined in the constants folder. Move {{constantName}} to constants/index.js and import it from there',
        noInlineConstants: 'Avoid inline constants. Define {{constantName}} in constants/index.js and import it'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const isConstantsFile = filename.includes('/constants/') || filename.includes('\\constants\\');
      const isLoggerFile = filename.includes('logger.js') || filename.includes('logger.ts');

      // Skip if this is the constants file itself or logger file
      if (isConstantsFile || isLoggerFile) {
        return {};
      }

      // Helper function to check if a variable declaration is a constant
      function isConstantDeclaration(node) {
        return node.type === 'VariableDeclaration' && node.kind === 'const';
      }

      // Helper function to check if a variable name follows constant naming convention
      function isConstantName(name) {
        return /^[A-Z_][A-Z0-9_]*$/.test(name);
      }

      // Helper function to check if a constant is defined inline (not imported)
      function isInlineConstant(node) {
        // Check if it's a simple assignment
        if (node.declarations && node.declarations.length === 1) {
          const declaration = node.declarations[0];
          if (declaration.init) {
            // Check if it's a literal value or simple expression
            return declaration.init.type === 'Literal' ||
                   declaration.init.type === 'TemplateLiteral' ||
                   (declaration.init.type === 'CallExpression' &&
                    declaration.init.callee.type === 'MemberExpression' &&
                    declaration.init.callee.object.name === 'process' &&
                    declaration.init.callee.property.name === 'env');
          }
        }
        return false;
      }

      return {
        VariableDeclaration(node) {
          if (isConstantDeclaration(node)) {
            for (const declaration of node.declarations) {
              if (declaration.id.type === 'Identifier' &&
                  isConstantName(declaration.id.name) &&
                  isInlineConstant(node)) {

                context.report({
                  node: declaration.id,
                  messageId: 'constantsInSingleFolder',
                  data: {
                    constantName: declaration.id.name
                  }
                });
              }
            }
          }
        },

        // Check for object property assignments that look like constants
        AssignmentExpression(node) {
          if (node.left.type === 'MemberExpression' &&
              node.left.object.type === 'Identifier' &&
              node.left.property.type === 'Identifier' &&
              isConstantName(node.left.property.name)) {

            context.report({
              node: node.left.property,
              messageId: 'noInlineConstants',
              data: {
                constantName: node.left.property.name
              }
            });
          }
        }
      };
    }
  }
};
