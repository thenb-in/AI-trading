const { associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

module.exports = (sequelize, DataTypes) => {
  const Geography = sequelize.define('Geography', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id'
    },
    // Null for a top level place. A place points at the one that contains it,
    // which is the whole of the tree — nothing stores a path or a depth, so
    // moving a branch is one row changing.
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    // What other systems call this place — an ISO code, a plant code.
    code: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    // What a place is called at its depth: Country, State, City. A label, not a
    // rule — nothing in the framework reads it back.
    level: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'nbnext_geography',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id', 'parent_id'] }
    ]
  });

  Geography.associate = (models) => {
    associateOwnedAuditModel(Geography, models);
    Geography.belongsTo(Geography, { foreignKey: 'parentId', as: 'parent' });
    Geography.hasMany(Geography, { foreignKey: 'parentId', as: 'children' });
  };

  return Geography;
};
