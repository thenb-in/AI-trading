// App-specific extra columns for the User Management table.
//
// The framework's UserManagement renders these after its own columns. Apps add
// domain-specific cells here (e.g. home/office location, price tier, employee
// creation). Empty in the reference scaffold — those are app customizations and
// are not part of the base template.

const getUserManagementExtraColumns = () => ([]);

export { getUserManagementExtraColumns };
