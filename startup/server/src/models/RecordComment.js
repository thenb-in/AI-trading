const { ownedAuditFields, associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

/**
 * A comment left on one record of any master. It points at the record the way
 * NBnextDrive does — what kind of thing it is (`objectName`, the master's name)
 * and which one (`objectId`) — so a record's files and what people said about
 * it are keyed alike, and no master needs a comments table of its own.
 */
module.exports = (sequelize, DataTypes) => {
  const RecordComment = sequelize.define('RecordComment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    ...ownedAuditFields(DataTypes)
  }, {
    tableName: 'record_comment',
    timestamps: true,
    underscored: true,
    indexes: [
      // How the panel reads them: this record's comments, newest last.
      { fields: ['object_name', 'object_id'] },
      { fields: ['company_id'] },
      { fields: ['created_by'] }
    ]
  });

  RecordComment.associate = (models) => associateOwnedAuditModel(RecordComment, models);

  return RecordComment;
};
