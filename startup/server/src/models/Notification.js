module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Recipient — who sees this notification.
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // Tenant scope — the company this notification belongs to.
    companyId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // Semantic event type, e.g. 'user_login'.
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Free-form context (actor id/name, related object, etc.).
    meta: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Seen flag — flips to true when the recipient reads it.
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'nbnext_notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['company_id'] },
      { fields: ['is_read'] },
      { fields: ['created_at'] }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Notification.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return Notification;
};
