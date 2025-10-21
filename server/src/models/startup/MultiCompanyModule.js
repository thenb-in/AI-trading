const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MultiCompanyModule = sequelize.define('MultiCompanyModule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
      { unique: true, fields: ['user_id', 'company_id'] },
      { fields: ['user_id'] },
      { fields: ['company_id'] }
    ]
  });

  MultiCompanyModule.associate = (models) => {
    MultiCompanyModule.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    MultiCompanyModule.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return MultiCompanyModule;
};


