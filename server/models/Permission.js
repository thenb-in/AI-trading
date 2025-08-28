const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  Permission.associate = (models) => {
    // A Permission can belong to many Roles (through RolePermission join table)
    Permission.belongsToMany(models.Role, {
      through: 'RolePermission',
      as: 'roles',
      foreignKey: 'permissionId',
    });
  };

  return Permission;
};