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
    },
    // Groups the rows written by one user gesture (a 200-row import is 200
    // requests, hence 200 rows) so the whole gesture can be undone as a unit.
    batchId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'batch_id'
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
      },
      {
        fields: ['batch_id']
      },
      {
        fields: ['created_by', 'timestamp']
      }
    ]
  });

  Activity.associate = (models) => associateOwnedAuditModel(Activity, models);

  return Activity;
};
