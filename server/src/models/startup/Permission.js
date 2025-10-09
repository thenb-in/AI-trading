const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type:{
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'nbnext_permissions',
    timestamps: true
  });

  Permission.associate = (models) => {
    // A Permission can belong to many Roles (through role_permission_mapping join table)
    Permission.belongsToMany(models.Role, {
      through: 'nbnext_role_permission_mapping',
      as: 'roles',
      foreignKey: 'permissionId'
    });
  };

  return Permission;
};
