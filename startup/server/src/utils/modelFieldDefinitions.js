const { DataTypes } = require('sequelize');

/**
 * Shared field definitions for company-owned entities (Role, Subscription, etc.)
 * that have id, name, description, and companyId fields.
 */
const companyOwnedEntityFields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'nbnext_company',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }
};

module.exports = { companyOwnedEntityFields };
