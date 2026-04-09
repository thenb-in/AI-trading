const { companyOwnedFields, objectLinkFields, associateCompanyOwned } = require('./mixins/companyOwned');

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
    ...objectLinkFields(DataTypes),
    ...companyOwnedFields(DataTypes)
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
    associateCompanyOwned(NBnextDrive, models);
  };

  return NBnextDrive;
};
