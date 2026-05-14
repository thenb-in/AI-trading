/**
 * Sequelize attribute schema shared by Subscription and Role — both are name-scoped-to-company
 * entities with the same id/name/description/companyId columns. Spread the result into
 * `sequelize.define`'s attributes argument; each caller still owns its own tableName, indexes,
 * and associations.
 */
function namedCompanyScopedEntityFields(DataTypes) {
  return {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'nbnext_company', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  };
}

module.exports = { namedCompanyScopedEntityFields };
