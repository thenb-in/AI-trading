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
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Django/external system username for company credentials'
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Django/external system password for company credentials'
    },
    manualAttendanceCommentCompulsory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    enable_cof: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    holiday_mode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '1=Fixed, 2=Adjacent day basis, 3=% present round to 0.5, 4=% present round to 1'
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
    },
    attendance_aliases: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Company-specific display aliases for attendance status abbreviations'
    },
    // --- Statutory compliance defaults ---
    // Default state used for state-specific statutory compliance (Professional Tax,
    // Labour Welfare Fund) when an employee has no `state` of their own.
    default_state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Default state for statutory compliance when employee.state is null (PT, LWF)'
    },
    // Establishment headcount, used to determine PF/ESIC applicability
    // (PF: mandatory at 20+, ESIC: mandatory at 10+). Null = treat as applicable.
    establishment_employee_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total employees in the establishment; drives PF/ESIC applicability thresholds'
    },
    // Income-tax regime used for the TDS estimate. 'new' (115BAC) is the default regime.
    tds_regime: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'new',
      comment: 'Income-tax regime for TDS estimation: \'new\' (115BAC default) or \'old\''
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
