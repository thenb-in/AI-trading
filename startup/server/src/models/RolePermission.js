const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nbnext_roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nbnext_permissions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'nbnext_role_permission_mapping',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id']
      },
      {
        fields: ['role_id']
      },
      {
        fields: ['permission_id']
      }
    ]
  });

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });

    RolePermission.belongsTo(models.Permission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  };

  return RolePermission;
};
