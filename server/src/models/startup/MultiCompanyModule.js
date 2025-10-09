const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MultiCompanyModule = sequelize.define('MultiCompanyModule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'nbnext_multi_company_module',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'companyId'] },
      { fields: ['userId'] },
      { fields: ['companyId'] }
    ]
  });

  MultiCompanyModule.associate = (models) => {
    MultiCompanyModule.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    MultiCompanyModule.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return MultiCompanyModule;
};


