module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobileApp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    desktopWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    mobileWeb: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
     roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 3,
    },
  }, {
    tableName: 'companies',
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, { foreignKey: 'companyId' });
     Company.belongsTo(models.Role, { foreignKey: "roleId", as: "role" });
  };

  return Company;
};
