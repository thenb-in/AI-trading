const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'nbnext_subscriptions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'company_id']
      }
    ]
  });

  Subscription.associate = (models) => {
    // A Subscription can have many Permissions (through SubscriptionPermission join table)
    Subscription.belongsToMany(models.Permission, {
      through: models.SubscriptionPermission,
      as: 'permissions',
      foreignKey: 'subscription_id',
      otherKey: 'permission_id'
    });

    // A Subscription belongs to a Company (optional)
    Subscription.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // A Subscription can belong to many Companies (through CompanySubscription join table)
    Subscription.belongsToMany(models.Company, {
      through: models.CompanySubscription,
      foreignKey: 'subscription_id',
      otherKey: 'company_id',
      as: 'companies'
    });
  };

  return Subscription;
};

