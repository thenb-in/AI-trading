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
    job_offer_header_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded header image for job offer letter PDF'
    },
    job_offer_footer_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded footer image for job offer letter PDF'
    },
    job_offer_header_height_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 3.0,
      comment: 'Height of header image in centimeters for PDF generation'
    },
    job_offer_footer_height_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 3.0,
      comment: 'Height of footer image in centimeters for PDF generation'
    },
    // Drives how the ADMS deactivate flow disposes of an employee on devices:
    //   'identity_card'  → emp_code = personal identifier (e.g. national ID),
    //                      not reused after the person leaves → send
    //                      DATA DEL_USER and free the slot.
    //   'serial_number'  → emp_code = sequential slot number, may be reused
    //                      OR conflicts must be avoided → keep the user
    //                      record on device but strip card/password and
    //                      delete all bio templates so authentication fails.
    emp_code_basis: {
      type: DataTypes.ENUM('identity_card', 'serial_number'),
      allowNull: false,
      defaultValue: 'identity_card'
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
