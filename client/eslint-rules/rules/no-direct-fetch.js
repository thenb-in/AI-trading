// No direct fetch rule
// Disallows direct fetch calls in components - must use ApiService wrapper

export default {
  'no-direct-fetch': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow direct fetch calls - use ApiService wrapper instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        directFetch: 'Direct fetch calls are not allowed. Use ApiService from services/startup/ApiService.js instead.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      
      // Allow fetch in ApiService itself
      if (filename.includes('ApiService') || filename.includes('api-service')) {
        return {};
      }

      // Allow fetch in service files
      if (filename.includes('/services/')) {
        return {};
      }

      return {
        CallExpression(node) {
          // Check for fetch() calls
          if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
            context.report({
              node,
              messageId: 'directFetch'
            });
          }

          // Check for window.fetch, global.fetch
          if (node.callee.type === 'MemberExpression') {
            const object = node.callee.object;
            const property = node.callee.property;
            
            if (property && property.name === 'fetch' && 
                (object.name === 'window' || object.name === 'global')) {
              context.report({
                node,
                messageId: 'directFetch'
              });
            }
          }
        }
      };
    }
  }
};

