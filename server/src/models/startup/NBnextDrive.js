module.exports = (sequelize, DataTypes) => {
  const NBnextDrive = sequelize.define('NBnextDrive', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size'
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mime_type'
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
    tableName: 'nbnext_drive',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['file_name']
      },
      {
        fields: ['object_name']
      },
      {
        fields: ['object_id']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  NBnextDrive.associate = (models) => {
    NBnextDrive.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    NBnextDrive.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  };

  return NBnextDrive;
};

