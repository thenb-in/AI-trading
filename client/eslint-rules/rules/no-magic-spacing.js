// No magic spacing numbers rule
// Disallows hardcoded spacing numbers in className, style props, or sx props

export default {
  'no-magic-spacing': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow magic spacing numbers - use theme.spacing values',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        magicSpacing: 'Magic spacing number detected. Use theme.spacing values from theme.js instead.'
      }
    },
    create(context) {
      /**
       * Check if a number is likely a spacing value
       * Common spacing values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, etc.
       */
      function isSpacingNumber(value) {
        if (typeof value !== 'number') return false;
        // Check if it's a common spacing value (divisible by 4 and reasonable range)
        return value > 0 && value <= 200 && value % 4 === 0;
      }

      /**
       * Check if a string contains spacing numbers (e.g., "p-4", "m-8", "gap-16")
       */
      function containsSpacingNumber(str) {
        if (typeof str !== 'string') return false;
        // Match patterns like: p-4, m-8, gap-16, px-12, py-20, etc.
        const spacingPattern = /\b(p|m|gap|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|space-[xy])-(\d+)\b/;
        if (spacingPattern.test(str)) {
          const match = str.match(spacingPattern);
          const num = parseInt(match[2], 10);
          return isSpacingNumber(num);
        }
        return false;
      }

      /**
       * Check object properties for spacing values
       */
      function checkObjectForSpacing(node) {
        if (node.type !== 'ObjectExpression') return;

        node.properties.forEach(prop => {
          if (prop.type === 'Property' && prop.value) {
            // Check numeric values
            if (prop.value.type === 'Literal' && isSpacingNumber(prop.value.value)) {
              // Check if it's a spacing-related property
              const key = prop.key.name || (prop.key.type === 'Literal' && prop.key.value);
              const spacingProps = ['margin', 'padding', 'gap', 'top', 'bottom', 'left', 'right', 
                                    'mt', 'mb', 'ml', 'mr', 'pt', 'pb', 'pl', 'pr', 'mx', 'my', 'px', 'py',
                                    'm', 'p', 'spacing'];
              
              if (spacingProps.includes(key) || 
                  (typeof key === 'string' && (key.includes('margin') || key.includes('padding') || key.includes('gap')))) {
                context.report({
                  node: prop.value,
                  messageId: 'magicSpacing'
                });
              }
            }

            // Check string values for Tailwind classes
            if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
              if (containsSpacingNumber(prop.value.value)) {
                context.report({
                  node: prop.value,
                  messageId: 'magicSpacing'
                });
              }
            }

            // Recursively check nested objects
            if (prop.value.type === 'ObjectExpression') {
              checkObjectForSpacing(prop.value);
            }
          }
        });
      }

      return {
        // NOTE: We intentionally do NOT check className strings because Tailwind utility classes
        // (like "my-8", "mb-6", etc.) are valid and should be allowed.
        // Only check style objects and sx props for magic spacing numbers.
        JSXAttribute(node) {
          // Check style prop
          if (node.name.name === 'style' && node.value && node.value.type === 'JSXExpressionContainer') {
            if (node.value.expression.type === 'ObjectExpression') {
              checkObjectForSpacing(node.value.expression);
            }
          }

          // Check sx prop (Material-UI)
          if (node.name.name === 'sx' && node.value && node.value.type === 'JSXExpressionContainer') {
            if (node.value.expression.type === 'ObjectExpression') {
              checkObjectForSpacing(node.value.expression);
            }
          }
        }
      };
    }
  }
};

