/**
 * Sequelize "object ownership + audit trail" fields shared by Activity, NBnextDrive, and similar
 * tables: who created it (`createdBy` -> users), what entity it points to (`objectName`/`objectId`),
 * and what company it belongs to (`companyId` -> company). Spread into the attributes object alongside
 * any table-specific columns.
 *
 * `associateOwnedAuditModel(Model, models)` wires the two belongsTo edges
 * (`createdByUser`, `company`) the same way every owned-audit model needs.
 * The constraints mirror the column-level ones above so a SET NULL / RESTRICT
 * mismatch can't drift between the column and the FK.
 */
function ownedAuditFields(DataTypes) {
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
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: { model: 'nbnext_users', key: 'id' },
      onDelete: 'SET NULL'
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: { model: 'nbnext_company', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    }
  };
}

function associateOwnedAuditModel(Model, models) {
  Model.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'createdByUser',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
  Model.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
}

module.exports = { ownedAuditFields, associateOwnedAuditModel };
