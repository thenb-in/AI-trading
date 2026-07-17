const { companyProfileFields } = require('./mixins/companyProfileFields');

module.exports = (sequelize, DataTypes) => {
  const CompanyProfile = sequelize.define('CompanyProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    ...companyProfileFields(DataTypes)
  }, {
    tableName: 'company_profiles',
    timestamps: true,
    underscored: true
  });

  CompanyProfile.associate = (models) => {
    CompanyProfile.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return CompanyProfile;
};
