// App-owned columns for the UserProfile model.
//
// The framework's UserProfile carries only the identity columns (id, userId,
// currentCompany); anything product-specific — office location, app metadata,
// tiers — is declared here and injected via registerAppModelFields, so startup
// never has to know about it.
//
// Same shape as any Sequelize attribute map:
//
//   office_latitude: {
//     type: DataTypes.DECIMAL(10, 7),
//     allowNull: true,
//     comment: 'Office location latitude (decimal degrees, -90..90)'
//   }
//
// Empty in the reference scaffold — apps add their own, with a matching
// db-scripts migration.

// eslint-disable-next-line no-unused-vars
const userProfileFields = (DataTypes) => ({

});

module.exports = { userProfileFields };
