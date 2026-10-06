/**
 * A master's name as its permissions spell it: "Cost Center" is cost_center
 * (create_cost_center). Accepts both the display name ("Purchase Order") and the
 * PascalCase model name a document is filed under ("PurchaseOrder") — both become
 * purchase_order, so the attachment_/comment_ check on a record's files and
 * comments resolves to the same permission create_master_permission declared.
 * (Master display names always separate words with spaces, so this only ever adds
 * the underscore a PascalCase model name is missing.)
 */
const masterKeyOf = (masterName) => masterName
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/ /g, '_')
  .toLowerCase();

module.exports = { masterKeyOf };
