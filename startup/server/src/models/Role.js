const { namedCompanyScopedEntityFields } = require('./mixins/namedCompanyScopedEntity');

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', namedCompanyScopedEntityFields(DataTypes), {
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

    // A Role can have many Permissions (through the RolePermission join model).
    // Pass the model, not the table name — a string `through` makes Sequelize
    // define a second, id-less model on the same table, and sync() then drops
    // the join table's primary key.
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
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
