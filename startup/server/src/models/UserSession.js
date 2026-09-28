module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'nbnext_users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    previous_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rotated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Set on logout or reuse detection; a revoked session can no longer refresh.
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    device_label: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    last_active: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'nbnext_user_session',
    timestamps: false,
    underscored: true
  });

  UserSession.associate = (models) => {
    UserSession.belongsTo(models.User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
  };

  return UserSession;
};
