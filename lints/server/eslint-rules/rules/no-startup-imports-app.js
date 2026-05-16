// Enforce framework→app boundary: startup/server must not import from app/server.
// app is the runnable; startup is the framework. Anything app-specific that
// startup needs should be passed in via a startup hook/factory (see buildApp).
module.exports = {
  'no-startup-imports-app': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow startup/server importing from app/server. Pass dependencies via startup hooks instead.',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        startupImportsApp: 'startup/server must not import from app/server ("{{importPath}}"). Pass this dependency in via a startup hook (see buildApp options) or move the consumer into app/server.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const isInStartup = filename.includes('/startup/server/') || filename.includes('\\startup\\server\\');
      if (!isInStartup) {
        return {};
      }

      function check(node, importPath) {
        if (typeof importPath !== 'string') {
          return;
        }
        // Only flag relative paths that traverse into app/server.
        // Bare specifiers (npm packages) and other absolute-ish ids are not flagged.
        if (!importPath.startsWith('.')) {
          return;
        }
        // Match either "app/server" or "app\\server" anywhere in the path.
        if (!/(^|\/|\\)app(\/|\\)server(\/|\\|$)/.test(importPath)) {
          return;
        }
        context.report({
          node,
          messageId: 'startupImportsApp',
          data: { importPath }
        });
      }

      return {
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length >= 1 &&
              node.arguments[0].type === 'Literal') {
            check(node.arguments[0], node.arguments[0].value);
          }
        },
        ImportDeclaration(node) {
          if (node.source && node.source.type === 'Literal') {
            check(node.source, node.source.value);
          }
        },
        ImportExpression(node) {
          if (node.source && node.source.type === 'Literal') {
            check(node.source, node.source.value);
          }
        }
      };
    }
  }
};
