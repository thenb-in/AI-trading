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
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'nbnext_roles',
    indexes: [
      {
        unique: true,
        fields: ['name', 'company_id']
      }
    ]
  });

  Role.associate = (models) => {
    // A Role can have many Users
    Role.hasMany(models.User, {
      foreignKey: 'role_id',
      as: 'users'
    });

    // A Role can have many Permissions (through RolePermission join table)
    Role.belongsToMany(models.Permission, {
      through: 'nbnext_role_permission_mapping',
      as: 'permissions',
      foreignKey: 'role_id'
    });

    // A Role belongs to a Company (optional)
    Role.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return Role;
};
