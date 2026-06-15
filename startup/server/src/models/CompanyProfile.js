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
