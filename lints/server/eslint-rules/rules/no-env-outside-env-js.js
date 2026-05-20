// Disallow env reads and env defaults outside config/env.js.
//
// All environment values must be read once in config/env.js and re-exported
// from there so defaults, parsing, and validation live in a single place.
//
// This rule catches two related antipatterns:
//   1. Raw `process.env.X` (or `process.env['X']`) access outside env.js.
//      Also catches `process.env.X = ...` writes — those belong in env.js
//      or in test setup files exempted by the eslint config.
//   2. Fallback defaults applied to `env.X` outside env.js, i.e.
//      `env.SOMETHING || 'default'` or `env.SOMETHING ?? 'default'`.
//      Defaults belong centrally in env.js so a reader has one place to
//      learn what the runtime config is.
module.exports = {
  'no-env-outside-env-js': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow process.env access and env.* defaults outside config/env.js — read env once in env.js and import from there',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noProcessEnv:
          'Do not read "process.env.{{ prop }}" here. Add it to config/env.js and import via `const env = require(".../config/env")`.',
        noProcessEnvComputed:
          'Do not read process.env[...] here. Add the value to config/env.js and import via `const env = require(".../config/env")`.',
        noProcessEnvWrite:
          'Do not assign to "process.env.{{ prop }}" outside config/env.js. Env mutations belong in env.js (or test setup files).',
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

      function isProcessEnv(node) {
        return (
          node &&
          node.type === 'MemberExpression' &&
          node.object &&
          node.object.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property &&
          ((node.property.type === 'Identifier' && node.property.name === 'env') ||
            (node.property.type === 'Literal' && node.property.value === 'env'))
        );
      }

      function propName(node) {
        if (!node) {
          return '<unknown>';
        }
        if (node.type === 'Identifier') {
          return node.name;
        }
        if (node.type === 'Literal') {
          return String(node.value);
        }
        return '<computed>';
      }

      return {
        MemberExpression(node) {
          if (!isProcessEnv(node.object)) {
            return;
          }

          // Skip the write-side of assignments — reported by AssignmentExpression
          // below so we get the clearer "do not assign" message.
          const parent = node.parent;
          if (
            parent &&
            parent.type === 'AssignmentExpression' &&
            parent.left === node
          ) {
            return;
          }

          if (node.computed) {
            context.report({ node, messageId: 'noProcessEnvComputed' });
            return;
          }

          context.report({
            node,
            messageId: 'noProcessEnv',
            data: { prop: propName(node.property) }
          });
        },
        AssignmentExpression(node) {
          if (
            node.left &&
            node.left.type === 'MemberExpression' &&
            isProcessEnv(node.left.object)
          ) {
            context.report({
              node: node.left,
              messageId: 'noProcessEnvWrite',
              data: { prop: propName(node.left.property) }
            });
          }
        },
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
            context.report({
              node,
              messageId: 'noEnvDefault',
              data: { prop: `env.${propName(left.property)}` }
            });
          }
        }
      };
    }
  }
};
