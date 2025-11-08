module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      // type UUID because this is a important field and can have security implications from frontend as well. normally, id should be just a number.
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    mobileApp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    desktopWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    mobileWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'nbnext_company'
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, { foreignKey: 'companyId', as: 'users' });
    Company.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
  };

  return Company;
};
