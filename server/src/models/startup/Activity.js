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
    objectName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'object_name'
    },
    objectId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'object_id'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'nbnext_users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
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
      }
    ]
  });

  Activity.associate = (models) => {

    Activity.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    Activity.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  };

  return Activity;
};
