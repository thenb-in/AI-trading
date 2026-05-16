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
    epf_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'EPF establishment / employer code for this company'
    },
    sac_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'GST Service Accounting Code (SAC) for the services this company provides'
    }
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
