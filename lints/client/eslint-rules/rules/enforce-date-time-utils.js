/**
 * Enforces centralized date handling via dateTimeUtils (client/src/utils/startup/dateTimeUtils.js).
 * Prevents timezone bugs from direct toISOString / string parsing / manual ISO construction.
 */

const DEFAULT_EXCLUDE_PATTERNS = [];

function filenameMatchesAnyPattern(filename, patterns) {
  if (!filename || !patterns?.length) return false;
  const normalized = filename.replace(/\\/g, '/');
  return patterns.some((p) => {
    const needle = p.replace(/\\/g, '/');
    return normalized.includes(needle);
  });
}

function isDateTimeUtilsModule(filename) {
  return /[/\\]utils[/\\]dateTimeUtils\.js$/i.test(filename);
}

function isDateNowCall(node) {
  return (
    node?.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object?.name === 'Date' &&
    node.callee.property?.name === 'now'
  );
}

function isGetTimeCall(node) {
  return (
    node?.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property?.name === 'getTime'
  );
}

/**
 * Single-arg new Date(x) is allowed only when x is provably a numeric instant (ms),
 * not a date string from APIs or forms.
 */
function isProvablyNumericMsArg(node) {
  if (!node) return false;
  if (node.type === 'Literal' && typeof node.value === 'number' && !Number.isNaN(node.value)) {
    return true;
  }
  if (node.type === 'UnaryExpression' && (node.operator === '+' || node.operator === '-')) {
    return node.argument?.type === 'Literal' && typeof node.argument.value === 'number';
  }
  if (isDateNowCall(node)) return true;
  if (isGetTimeCall(node)) return true;
  return false;
}

function isExcludedContext(context, excludePatterns) {
  const filename = context.getFilename?.() ?? '';
  if (isDateTimeUtilsModule(filename)) return true;
  return filenameMatchesAnyPattern(filename, excludePatterns);
}

export default {
  'no-direct-to-iso-string': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow Date.prototype.toISOString() outside dateTimeUtils; use dateTimeUtils.convertToISOString for API payloads.',
        category: 'Best Practices',
        recommended: true,
      },
      fixable: null,
      schema: [
        {
          type: 'object',
          properties: {
            excludePatterns: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        noDirectToIso:
          'Do not use toISOString() directly. Use dateTimeUtils.convertToISOString instead.',
      },
    },
    create(context) {
      const excludePatterns = [
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...(context.options?.[0]?.excludePatterns ?? []),
      ];

      if (isExcludedContext(context, excludePatterns)) {
        return {};
      }

      return {
        CallExpression(node) {
          if (node.callee?.type !== 'MemberExpression') return;
          const prop = node.callee.property;
          const isToIso =
            !node.callee.computed &&
            ((prop?.type === 'Identifier' && prop.name === 'toISOString') ||
              (prop?.type === 'Literal' && prop.value === 'toISOString'));
          if (!isToIso) return;

          context.report({ node, messageId: 'noDirectToIso' });
        },
      };
    },
  },

  'no-unsafe-new-date': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow new Date(singleArg) when the argument is not provably a numeric timestamp; use dateTimeUtils.parseDateValue or numeric ms.',
        category: 'Best Practices',
        recommended: true,
      },
      fixable: null,
      schema: [
        {
          type: 'object',
          properties: {
            excludePatterns: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        noParseWithNewDate:
          'Do not parse dates using new Date(string). Use dateTimeUtils.parseDateValue instead.',
      },
    },
    create(context) {
      const excludePatterns = [
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...(context.options?.[0]?.excludePatterns ?? []),
      ];

      if (isExcludedContext(context, excludePatterns)) {
        return {};
      }

      return {
        NewExpression(node) {
          if (node.callee?.type !== 'Identifier' || node.callee.name !== 'Date') return;
          if (node.arguments.length !== 1) return;
          const arg = node.arguments[0];
          if (isProvablyNumericMsArg(arg)) return;

          context.report({ node, messageId: 'noParseWithNewDate' });
        },
      };
    },
  },

  'no-manual-iso-string-concat': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow building ISO-like datetime strings with + and a literal "T" segment; use dateTimeUtils.',
        category: 'Best Practices',
        recommended: true,
      },
      fixable: null,
      schema: [
        {
          type: 'object',
          properties: {
            excludePatterns: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        noManualIso:
          'Do not construct ISO 8601 strings manually (e.g. concatenation with "T"). Use dateTimeUtils.convertToISOString or other dateTimeUtils helpers.',
      },
    },
    create(context) {
      const excludePatterns = [
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...(context.options?.[0]?.excludePatterns ?? []),
      ];

      if (isExcludedContext(context, excludePatterns)) {
        return {};
      }

      return {
        BinaryExpression(node) {
          if (node.operator !== '+') return;
          const leftIsT = node.left?.type === 'Literal' && node.left.value === 'T';
          const rightIsT = node.right?.type === 'Literal' && node.right.value === 'T';
          if (!leftIsT && !rightIsT) return;

          context.report({ node, messageId: 'noManualIso' });
        },
      };
    },
  },
};
