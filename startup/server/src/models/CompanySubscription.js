const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanySubscription = sequelize.define('CompanySubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nbnext_subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'nbnext_company_subscription',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'subscription_id']
      }
    ]
  });

  CompanySubscription.associate = (models) => {
    CompanySubscription.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    CompanySubscription.belongsTo(models.Subscription, {
      foreignKey: 'subscription_id',
      as: 'subscription',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return CompanySubscription;
};

