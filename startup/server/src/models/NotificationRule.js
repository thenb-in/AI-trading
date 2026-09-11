const { associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

module.exports = (sequelize, DataTypes) => {
  const NotificationRule = sequelize.define('NotificationRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    recipients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    channels: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    // Who a message is for
    onlyTheSubject: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'only_the_subject'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'nbnext_notification_rule',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'name']
      }
    ]
  });


  NotificationRule.associate = (models) => associateOwnedAuditModel(NotificationRule, models);

  return NotificationRule;
};
