const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Role',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permissionId: {  // todo: check why permission id is created capital when roleId is small
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Permission',
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
        fields: ['roleId', 'permissionId']
      },
      {
        fields: ['roleId']
      },
      {
        fields: ['permissionId']
      }
    ]
  });

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });

    RolePermission.belongsTo(models.Permission, {
      foreignKey: 'permissionId',
      as: 'permission'
    });
  };

  return RolePermission;
};
