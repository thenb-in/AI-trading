module.exports = (sequelize, DataTypes) => {
  const CompanyDetails = sequelize.define(
    'CompanyDetails',
    {
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
      company_email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true }
      },
      phone: { type: DataTypes.STRING, allowNull: true },
      alternate_phone: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      district: { type: DataTypes.STRING, allowNull: true },
      // Tax
      company_gstin: { type: DataTypes.STRING(15), allowNull: true },
      pan_no: { type: DataTypes.STRING(10), allowNull: true },
      // Bank
      bank_account_holder_name: { type: DataTypes.STRING, allowNull: true },
      bank_account_number: { type: DataTypes.STRING, allowNull: true },
      bank_name: { type: DataTypes.STRING, allowNull: true },
      bank_ifsc_code: { type: DataTypes.STRING(11), allowNull: true },
      bank_branch_name: { type: DataTypes.STRING, allowNull: true },
      // Statutory codes (moved here from CompanyProfile)
      epf_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'EPF establishment / employer code for this company'
      },
      sac_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment:
          'GST Service Accounting Code (SAC) for the services this company provides'
      }
    },
    {
      tableName: 'company_details',
      timestamps: true,
      underscored: true
    }
  );

  CompanyDetails.associate = (models) => {
    CompanyDetails.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    models.Company.hasOne(CompanyDetails, {
      foreignKey: 'company_id',
      as: 'companyDetails'
    });
  };

  return CompanyDetails;
};
