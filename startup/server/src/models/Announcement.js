const { associateOwnedAuditModel } = require('./mixins/ownedAuditFields');

module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // info | warning | critical — how loudly the banner is drawn.
    severity: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'info'
    },
    // Whose banner this is. Empty means everyone in the company, which is what
    // an announcement usually is.
    roleIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'role_ids'
    },
    // The window it runs in. Null at either end means "from now" / "until
    // someone stops it", so a permanent notice needs no dates at all.
    startsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'starts_at'
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ends_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'nbnext_announcement',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id', 'is_active'] }
    ]
  });

  Announcement.associate = (models) => associateOwnedAuditModel(Announcement, models);

  return Announcement;
};
