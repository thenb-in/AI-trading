// Use searchable dropdown rule
// Every select box must be the base SearchableDropdown so search, keyboard
// navigation, loading and empty states behave the same everywhere.

// MUI exports these as drop-in select boxes; TextField becomes one via `select`.
const MUI_SELECT_COMPONENTS = new Set(['Select', 'NativeSelect']);
const MUI_SELECT_SOURCES = /^@mui\/(material|base|joy)/;
const SEARCHABLE_DROPDOWN_IMPORT =
  "@startup/components/base_components/fields/SearchableDropdown";

export default {
  'use-searchable-dropdown': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow native and MUI select boxes - use the base SearchableDropdown instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        nativeSelect: `<select> is not allowed. Use SearchableDropdown from '${SEARCHABLE_DROPDOWN_IMPORT}' instead.`,
        muiSelect: `<{{name}}> is not allowed. Use SearchableDropdown from '${SEARCHABLE_DROPDOWN_IMPORT}' instead.`,
        muiTextFieldSelect: `<{{name}} select> renders a select box. Use SearchableDropdown from '${SEARCHABLE_DROPDOWN_IMPORT}' instead.`
      }
    },
    create(context) {
      const filename = context.getFilename();

      // SearchableDropdown builds the replacement, so it may use the primitives.
      if (filename.includes('SearchableDropdown')) {
        return {};
      }

      // Local name -> imported name, so aliased imports are still caught.
      const muiSelectLocals = new Map();
      const muiTextFieldLocals = new Set();

      function collectMuiImport(node) {
        if (!node.source || !MUI_SELECT_SOURCES.test(node.source.value)) {
          return;
        }
        for (const specifier of node.specifiers) {
          // `import Select from '@mui/material/Select'` has no imported name.
          const importedName =
            specifier.imported?.name ??
            node.source.value.split('/').pop();

          if (MUI_SELECT_COMPONENTS.has(importedName)) {
            muiSelectLocals.set(specifier.local.name, importedName);
          }
          if (importedName === 'TextField') {
            muiTextFieldLocals.add(specifier.local.name);
          }
        }
      }

      function hasSelectAttribute(node) {
        return node.attributes.some(
          (attribute) =>
            attribute.type === 'JSXAttribute' && attribute.name.name === 'select'
        );
      }

      return {
        ImportDeclaration: collectMuiImport,

        JSXOpeningElement(node) {
          if (node.name.type !== 'JSXIdentifier') {
            return;
          }
          const name = node.name.name;

          if (name === 'select') {
            context.report({ node, messageId: 'nativeSelect' });
            return;
          }

          if (muiSelectLocals.has(name)) {
            context.report({ node, messageId: 'muiSelect', data: { name } });
            return;
          }

          if (muiTextFieldLocals.has(name) && hasSelectAttribute(node)) {
            context.report({ node, messageId: 'muiTextFieldSelect', data: { name } });
          }
        }
      };
    }
  }
};
