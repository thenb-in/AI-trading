/**
 * Shared field definitions and associations for models that are
 * company-scoped and user-owned (createdBy + companyId + optional object link).
 */

function companyOwnedFields(DataTypes) {
  return {
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'created_by'
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    }
  };
}

function objectLinkFields(DataTypes) {
  return {
    objectName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'object_name'
    },
    objectId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'object_id'
    }
  };
}

function associateCompanyOwned(Model, models) {
  Model.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'createdByUser',
    constraints: false
  });

  Model.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
}

module.exports = { companyOwnedFields, objectLinkFields, associateCompanyOwned };
