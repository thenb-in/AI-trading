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
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Company location latitude (decimal degrees, -90..90)'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Company location longitude (decimal degrees, -180..180)'
    },
    geofence_radius_meters: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500,
      comment: 'Punch geofence radius (meters) around the company coordinates'
    }
  }, {
    tableName: 'nbnext_company',
    underscored: true
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, { foreignKey: 'company_id', as: 'users' });
    Company.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    Company.hasOne(models.CompanyProfile, { foreignKey: 'company_id', as: 'companyProfile' });
    Company.belongsToMany(models.Subscription, {
      through: models.CompanySubscription,
      foreignKey: 'company_id',
      otherKey: 'subscription_id',
      as: 'subscriptions'
    });
  };

  return Company;
};
