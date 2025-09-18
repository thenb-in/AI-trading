const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
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
    }
  }, {
    tableName: 'roles'
  });

  Role.associate = (models) => {
    // A Role can have many Users
    Role.hasMany(models.User, {
      foreignKey: 'roleId',
      as: 'users'
    });

    // A Role can have many Permissions (through RolePermission join table)
    Role.belongsToMany(models.Permission, {
      through: 'role_permission_mapping',
      as: 'permissions',
      foreignKey: 'roleId'
    });
  };

  return Role;
};
