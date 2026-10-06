const { ownedAuditFields, associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

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
    // The master whose attachment permission answers for this file, when that
    // is not the object name itself. A letter head files its header and footer
    // apart (LetterHeadHeader / LetterHeadFooter), but both are the Letter Head
    // master — and the download request carries only the file id, so the gate
    // has nothing but the stored row to go on. Null means the object name is
    // the master, as it is for every ordinary record.
    permissionName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'permission_name'
    },
    ...ownedAuditFields(DataTypes)
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

  NBnextDrive.associate = (models) => associateOwnedAuditModel(NBnextDrive, models);

  return NBnextDrive;
};

