module.exports = (sequelize, DataTypes) => {
  const GroupOfCompanies = sequelize.define('GroupOfCompanies', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'nbnext_group_of_companies',
    timestamps: true,
    underscored: true
  });

  GroupOfCompanies.associate = (models) => {
    // The member companies of the group, and the users the group lends a face
    // in the multi-company assignment screen. The join rows live in their own
    // models so a membership can be added or dropped on its own.
    // foreignKey/otherKey name the through model's own attributes (camelCase),
    // not its columns — otherwise Sequelize injects duplicate snake_case
    // attributes on the same columns and set() leaves the real ones null.
    GroupOfCompanies.belongsToMany(models.Company, {
      through: models.GroupOfCompaniesCompany,
      foreignKey: 'groupId',
      otherKey: 'companyId',
      as: 'companies'
    });
    GroupOfCompanies.belongsToMany(models.User, {
      through: models.GroupOfCompaniesUser,
      foreignKey: 'groupId',
      otherKey: 'userId',
      as: 'users'
    });
    GroupOfCompanies.belongsTo(models.User, { foreignKey: 'createdBy', as: 'createdByUser' });
  };

  return GroupOfCompanies;
};
