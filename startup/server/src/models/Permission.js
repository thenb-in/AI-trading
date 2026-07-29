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
    display_name: {
      type: DataTypes.STRING,
      allowNull: true
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
    // A Permission can belong to many Roles (through the RolePermission join model).
    // Pass the model, not the table name — see the matching note in Role.js.
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      as: 'roles',
      foreignKey: 'permission_id'
    });
  };

  return Permission;
};
