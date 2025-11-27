// Theme values only rule
// Ensures colors, spacing, and fontSize come from theme.js

export default {
  'theme-values-only': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Colors, spacing, and fontSize must come from theme.js',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        useThemeColors: 'Color values must come from theme.js. Import colors from utils/theme.js',
        useThemeSpacing: 'Spacing values must come from theme.js. Import spacing from utils/theme.js',
        useThemeFontSize: 'Font size values must come from theme.js. Import fontSize from utils/theme.js'
      }
    },
    create(context) {
      const filename = context.getFilename();
      
      // Skip theme.js itself
      if (filename.includes('theme.js')) {
        return {};
      }

      /**
       * Check if a string is a color value (hex, rgb, named colors)
       */
      function isColorValue(str) {
        if (typeof str !== 'string') return false;
        
        // Hex colors
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str)) return true;
        
        // RGB/RGBA
        if (/^rgba?\(/.test(str)) return true;
        
        // Named colors (common CSS colors)
        const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 
                            'black', 'white', 'gray', 'grey', 'transparent'];
        if (namedColors.includes(str.toLowerCase())) return true;
        
        return false;
      }

      /**
       * Check if a value is a spacing number
       */
      function isSpacingValue(value) {
        if (typeof value === 'number') {
          return value > 0 && value <= 200 && value % 4 === 0;
        }
        if (typeof value === 'string') {
          // Check for rem, px, em values
          return /^\d+(\.\d+)?(rem|px|em)$/.test(value);
        }
        return false;
      }

      /**
       * Check if a value is a font size
       */
      function isFontSizeValue(value) {
        if (typeof value === 'number') {
          return value >= 10 && value <= 100;
        }
        if (typeof value === 'string') {
          // Check for rem, px, em values
          return /^\d+(\.\d+)?(rem|px|em)$/.test(value);
        }
        return false;
      }


      /**
       * Check object properties for theme violations
       */
      function checkObjectForTheme(node, isSx = false) {
        if (node.type !== 'ObjectExpression') return;

        node.properties.forEach(prop => {
          if (prop.type === 'Property' && prop.value) {
            const key = prop.key.name || (prop.key.type === 'Literal' && prop.key.value);
            
            // Check color properties
            const colorKeys = ['color', 'backgroundColor', 'bgColor', 'borderColor', 
                              'fill', 'stroke', 'background'];
            if (colorKeys.includes(key) || (typeof key === 'string' && key.includes('color'))) {
              if (prop.value.type === 'Literal') {
                if (isColorValue(prop.value.value)) {
                  context.report({
                    node: prop.value,
                    messageId: 'useThemeColors'
                  });
                }
              }
            }

            // Check spacing properties
            const spacingKeys = ['margin', 'padding', 'gap', 'top', 'bottom', 'left', 'right',
                                'mt', 'mb', 'ml', 'mr', 'pt', 'pb', 'pl', 'pr', 'mx', 'my', 'px', 'py',
                                'm', 'p', 'spacing'];
            if (spacingKeys.includes(key) || (typeof key === 'string' && 
                (key.includes('margin') || key.includes('padding') || key.includes('gap')))) {
              if (prop.value.type === 'Literal' && isSpacingValue(prop.value.value)) {
                context.report({
                  node: prop.value,
                  messageId: 'useThemeSpacing'
                });
              }
            }

            // Check fontSize
            if (key === 'fontSize' || key === 'font-size') {
              if (prop.value.type === 'Literal' && isFontSizeValue(prop.value.value)) {
                context.report({
                  node: prop.value,
                  messageId: 'useThemeFontSize'
                });
              }
            }

            // Recursively check nested objects
            if (prop.value.type === 'ObjectExpression') {
              checkObjectForTheme(prop.value, isSx);
            }
          }
        });
      }

      return {
        // Check sx prop
        JSXAttribute(node) {
          if (node.name.name === 'sx' && node.value && node.value.type === 'JSXExpressionContainer') {
            if (node.value.expression.type === 'ObjectExpression') {
              checkObjectForTheme(node.value.expression, true);
            }
          }
        },

        // Check className for Tailwind color classes (we can't easily detect these, 
        // but we'll focus on style/sx props)
      };
    }
  }
};

