// Disallow applying fallback defaults to env.* values outside config/env.js
module.exports = {
  'no-env-defaults-outside-env-js': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow fallback defaults on env.* values outside config/env.js — all defaults belong in env.js',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noEnvDefault:
          'Do not apply a default to "{{ prop }}" here. Move the default into config/env.js so it is centrally defined.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const isEnvConfig =
        filename.endsWith('/config/env.js') ||
        filename.endsWith('\\config\\env.js') ||
        filename.includes('/config/env.js');

      if (isEnvConfig) {
        return {};
      }

      return {
        LogicalExpression(node) {
          if (node.operator !== '||' && node.operator !== '??') {
            return;
          }

          const left = node.left;

          // Only flag direct member access: env.SOMETHING || ...
          // Exclude chained logicals on the left (e.g. env.A || env.B || fallback)
          // so we only report on the innermost env.* usage, not the wrapper.
          if (
            left.type === 'MemberExpression' &&
            left.object.type === 'Identifier' &&
            left.object.name === 'env'
          ) {
            const prop =
              left.property.type === 'Identifier'
                ? left.property.name
                : left.property.value;

            context.report({
              node,
              messageId: 'noEnvDefault',
              data: { prop: `env.${prop}` }
            });
          }
        }
      };
    }
  }
};
