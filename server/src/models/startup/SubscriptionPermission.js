const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPermission = sequelize.define('SubscriptionPermission', {
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nbnext_subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nbnext_permissions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'not_subscribed',
      validate: {
        isIn: {
          args: [['subscribed', 'not_subscribed', 'hidden']],
          msg: 'Status must be one of: subscribed, not_subscribed, hidden'
        }
      }
    }
  }, {
    tableName: 'nbnext_subscription_permission_mapping',
    underscored: true,
    timestamps: true,
    indexes: [
      // {
      //   unique: true,
      //   fields: ['subscription_id', 'permission_id']
      // },
      {
        fields: ['subscription_id']
      },
      {
        fields: ['permission_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  SubscriptionPermission.associate = (models) => {
    SubscriptionPermission.belongsTo(models.Subscription, {
      foreignKey: 'subscription_id',
      as: 'subscription'
    });

    SubscriptionPermission.belongsTo(models.Permission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  };

  return SubscriptionPermission;
};

