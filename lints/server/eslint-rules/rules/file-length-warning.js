// File length warning rule
module.exports = {
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
