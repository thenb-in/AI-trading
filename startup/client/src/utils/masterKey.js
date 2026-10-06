/**
 * A master's name as its permissions spell it: "Cost Center" is cost_center
 * (create_cost_center). Accepts both the display name ("Purchase Order") and the
 * PascalCase name a record panel files its comments and attachments under
 * ("PurchaseOrder") — both become purchase_order, so the attachment_/comment_
 * permission gate resolves to the same name the server declared. (Master display
 * names always separate words with spaces, so this only ever adds the underscore
 * a PascalCase object name is missing.)
 */
const masterKeyOf = (masterName) => masterName
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/ /g, '_')
  .toLowerCase();

export { masterKeyOf };
