module.exports = (sequelize, DataTypes) => {
  const GroupOfCompaniesCompany = sequelize.define('GroupOfCompaniesCompany', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'group_id'
    },
    companyId: {
      type: DataTypes.UUID,  // type UUID because the company primary key is a UUID
      allowNull: false,
      field: 'company_id'
    }
  }, {
    tableName: 'nbnext_group_of_companies_companies',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['group_id', 'company_id'] },
      { fields: ['company_id'] }
    ]
  });

  GroupOfCompaniesCompany.associate = (models) => {
    GroupOfCompaniesCompany.belongsTo(models.GroupOfCompanies, {
      foreignKey: 'groupId',
      as: 'group',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    GroupOfCompaniesCompany.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return GroupOfCompaniesCompany;
};
