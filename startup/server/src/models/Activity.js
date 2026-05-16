const { ownedAuditFields, associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

module.exports = (sequelize, DataTypes) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    head: {
      type: DataTypes.STRING,
      allowNull: false
    },
    log: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: () => Date.now()
    },
    ...ownedAuditFields(DataTypes),
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_confirmed'
    },
    type: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      comment: '1 for create, 0 for update, -1 for delete'
    }
  }, {
    tableName: 'activity',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['head']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['object_name']
      },
      {
        fields: ['object_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['is_confirmed']
      }
    ]
  });

  Activity.associate = (models) => associateOwnedAuditModel(Activity, models);

  return Activity;
};
