// Soft deletes are retired. `paranoid: true` keeps a deleted row in the table
// with a `deleted_at` stamp, which sounds free but is not: the row still holds
// its slot in every unique index, so a deleted holiday type keeps its name
// forever and recreating it fails with an opaque validation error. The feature
// was also only half honoured — most delete paths passed `force: true` and
// several reads passed `paranoid: false` — so "deleted" meant different things
// in different places. Deletes are permanent now; anything that genuinely
// needs a reversible state should model that state explicitly (a status
// column), not lean on the ORM's tombstones.
//
// Also flags query-level `paranoid: false`, which only exists to see through
// soft deletes that no longer happen.
module.exports = {
  'no-paranoid-models': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow Sequelize soft deletes (paranoid). Deletes are permanent; model reversible states explicitly.',
        category: 'Architecture',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        paranoidTrue: 'Do not use `paranoid: true`. Soft-deleted rows still occupy unique indexes, so the deleted value can never be reused. Delete for real, or add an explicit status column if the state must be reversible.',
        paranoidFalseOption: 'Drop `paranoid: false` from this query — no model is paranoid, so it does nothing.',
        forceDestroy: 'Drop `force: true` from this destroy — no model is paranoid, so every delete is already permanent.'
      }
    },
    create(context) {
      const isTrue = (node) => node.value === true;
      // A model definition states `paranoid: false` on purpose, so the next
      // person adding a model copies the right thing. Anywhere else it is a
      // query option seeing through soft deletes that no longer happen.
      const isModelFile = /[\\/]models[\\/]/.test(context.getFilename());

      return {
        Property(node) {
          const name = node.key && (node.key.name || node.key.value);

          if (name === 'paranoid' && node.value.type === 'Literal') {
            if (isTrue(node.value)) {
              context.report({ node, messageId: 'paranoidTrue' });
            } else if (!isModelFile) {
              context.report({ node, messageId: 'paranoidFalseOption' });
            }
            return;
          }

          // `force: true` is only meaningful against a paranoid model. Narrow to
          // destroy calls so unrelated `force` options elsewhere are left alone.
          if (name !== 'force' || node.value.type !== 'Literal' || !isTrue(node.value)) {
            return;
          }
          const objectExpression = node.parent;
          const call = objectExpression && objectExpression.parent;
          if (
            call &&
            call.type === 'CallExpression' &&
            call.callee.type === 'MemberExpression' &&
            call.callee.property.name === 'destroy'
          ) {
            context.report({ node, messageId: 'forceDestroy' });
          }
        }
      };
    }
  }
};
