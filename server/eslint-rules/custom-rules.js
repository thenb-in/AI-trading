// Custom ESLint rules for project-specific linting requirements

const customRules = {
  'no-console-usage': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow console usage in favor of logger',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noConsole: 'Use logger instead of console.{{method}}. Replace with logger.{{loggerMethod}}'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console') {
            const method = node.callee.property.name;
            const loggerMethod = method === 'log' ? 'info' : method;

            // Skip if it's a console override (console.log = ...)
            if (node.parent && node.parent.type === 'AssignmentExpression') {
              return;
            }

            context.report({
              node,
              messageId: 'noConsole',
              data: {
                method,
                loggerMethod
              }
            });
          }
        }
      };
    }
  },

  'no-logger-commas': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow commas in logger calls - use template literals instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noCommas: 'Logger calls should use single argument with template literals instead of multiple arguments'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger' &&
              node.arguments.length > 1) {
            context.report({
              node,
              messageId: 'noCommas'
            });
          }
        }
      };
    }
  },

  'no-direct-dotenv': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow direct dotenv usage - use centralized config/env.js',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noDirectDotenv: 'Use centralized environment config instead of direct dotenv. Replace with: const env = require("./config/env")'
      }
    },
    create(context) {
      const filename = context.getFilename();
      return {
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal') {
            const arg = node.arguments[0].value;
            if (arg === 'dotenv' || arg === 'dotenv-safe') {
              // Allow dotenv usage in the centralized config file
              if (filename.includes('config/env.js') || filename.endsWith('config/env.js') || filename.includes('\\config\\env.js') || filename.includes('/config/env.js')) {
                return;
              }
              context.report({
                node,
                messageId: 'noDirectDotenv'
              });
            }
          }
        }
      };
    }
  },

  'no-hardcoded-logger-strings': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow hardcoded strings in logger calls and error messages - use variables or template literals with variables',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noHardcodedStrings: 'Logger calls should use variables or template literals with variables instead of hardcoded strings',
        noHardcodedErrorStrings: 'Error messages should use variables or template literals with variables instead of hardcoded strings',
        noHardcodedTemplateStrings: 'Template literals should contain variables - avoid hardcoded template strings'
      }
    },
    create(context) {
      // Helper function to check if a template literal contains variables
      function hasTemplateVariables(templateLiteral) {
        return templateLiteral.expressions && templateLiteral.expressions.length > 0;
      }

      // Helper function to check if a string is hardcoded (no variables)
      function isHardcodedString(arg) {
        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          return true;
        }

        if (arg.type === 'TemplateLiteral') {
          return !hasTemplateVariables(arg);
        }

        return false;
      }

      return {
        CallExpression(node) {
          // Check logger calls
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger' &&
              node.arguments.length === 1) {
            const arg = node.arguments[0];

            if (isHardcodedString(arg)) {
              context.report({
                node,
                messageId: arg.type === 'TemplateLiteral' ? 'noHardcodedTemplateStrings' : 'noHardcodedStrings'
              });
            }
          }

          // Check error constructor calls (new Error(), new TypeError(), etc.)
          if (node.callee.type === 'NewExpression' &&
              node.callee.callee.name &&
              node.callee.callee.name.endsWith('Error') &&
              node.arguments.length === 1) {
            const arg = node.arguments[0];

            if (isHardcodedString(arg)) {
              context.report({
                node,
                messageId: arg.type === 'TemplateLiteral' ? 'noHardcodedTemplateStrings' : 'noHardcodedErrorStrings'
              });
            }
          }
        },

        // Check throw statements with string literals directly
        ThrowStatement(node) {
          if (node.argument && isHardcodedString(node.argument)) {
            context.report({
              node,
              messageId: node.argument.type === 'TemplateLiteral' ? 'noHardcodedTemplateStrings' : 'noHardcodedErrorStrings'
            });
          }
        }
      };
    }
  },

  'no-json-stringify-in-logs': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow JSON.stringify in logger calls above debug level - use lower levels for JSON.stringify',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noJsonStringifyInLogs: 'JSON.stringify should only be used in debug level or lower logger calls. Move to logger.silly() or use a lower log level',
        noJsonStringifyInNonDebug: 'JSON.stringify detected in {{logLevel}} level. Use lower levels for JSON.stringify to avoid exposing sensitive data'
      }
    },
    create(context) {
      // Define log levels in order of severity (debug is lowest, error is highest)
      const logLevels = {
        'verbose': 0,
        'trace': 0,
        'silly': 0,
        'debug': 1,
        'info': 2,
        'warn': 3,
        'warning': 3,
        'error': 4,
        'fatal': 5
      };

      // Helper function to check if a logger call contains JSON.stringify
      function containsJsonStringify(node) {
        if (!node || !node.arguments || node.arguments.length === 0) {
          return false;
        }

        // Check all arguments for JSON.stringify usage
        for (const arg of node.arguments) {
          if (arg.type === 'CallExpression' &&
              arg.callee.type === 'MemberExpression' &&
              arg.callee.object.name === 'JSON' &&
              arg.callee.property.name === 'stringify') {
            return true;
          }

          // Check template literals for JSON.stringify
          if (arg.type === 'TemplateLiteral' && arg.expressions) {
            for (const expr of arg.expressions) {
              if (expr.type === 'CallExpression' &&
                  expr.callee.type === 'MemberExpression' &&
                  expr.callee.object.name === 'JSON' &&
                  expr.callee.property.name === 'stringify') {
                return true;
              }
            }
          }
        }
        return false;
      }

      // Helper function to get log level from logger call
      function getLogLevel(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'logger') {
          return node.callee.property.name;
        }
        return null;
      }

      return {
        CallExpression(node) {
          // Check logger calls
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger') {

            const logLevel = getLogLevel(node);
            const hasJsonStringify = containsJsonStringify(node);

            if (hasJsonStringify && logLevel) {
              const levelValue = logLevels[logLevel];

              // Allow debug, verbose, trace levels (level 0)
              if (levelValue > 0) {
                context.report({
                  node,
                  messageId: 'noJsonStringifyInNonDebug',
                  data: {
                    logLevel: logLevel
                  }
                });
              }
            }
          }
        }
      };
    }
  },

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
  },

  'file-length-warning': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Warn when files exceed 300 lines (warning threshold)',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [
        {
          type: 'object',
          properties: {
            warningLines: {
              type: 'number',
              default: 300
            }
          },
          additionalProperties: false
        }
      ],
      messages: {
        fileTooLongWarning: 'File has {{lineCount}} lines, which exceeds the recommended limit of {{warningLines}} lines. Consider refactoring.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const sourceCode = context.getSourceCode();
      const lines = sourceCode.lines;
      const lineCount = lines.length;

      // Configuration
      const options = context.options[0] || {};
      const warningLines = options.warningLines || 300;

      // Skip certain file types or patterns
      const skipPatterns = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        'logs',
        '.env',
        'package-lock.json',
        'yarn.lock'
      ];

      // Skip if file matches any skip pattern
      if (skipPatterns.some(pattern => filename.includes(pattern))) {
        return {};
      }

      return {
        Program(node) {
          if (lineCount > warningLines && lineCount <= 500) {
            context.report({
              node,
              messageId: 'fileTooLongWarning',
              data: {
                lineCount,
                warningLines
              }
            });
          }
        }
      };
    }
  }
};

module.exports = {
  rules: customRules
};
