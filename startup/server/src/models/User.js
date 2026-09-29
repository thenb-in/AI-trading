// todo: create a user profile
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      // type UUID because this is a important field and can have security implications from frontend as well. normally, id should be just a number.
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING,
      // unique: true,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'nbnext_roles',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nbnext_company',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    last_active: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tokens_valid_after: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mobileApp: {
      type: DataTypes.BOOLEAN
    },
    desktopWeb: {
      type: DataTypes.BOOLEAN
    },
    mobileWeb: {
      type: DataTypes.BOOLEAN
    },
    isSupportUser: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    wallet_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true
    },
    totp_secret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_totp_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Account deletion requested from the Call Buddy mobile app. Access is
    // revoked at request time (is_approved -> false); these two record the
    // request so the purge can run on the published 30-day cycle. See
    // db-scripts/20260817_02_add_account_deletion_to_users.sql.
    deletion_requested_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletion_scheduled_purge_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'nbnext_users',
    timestamps: false, // Disable automatic created_at/updated_at columns
    underscored: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });

    // Data access configuration per user (same company scope)
    User.hasOne(models.UserProfile, { foreignKey: 'user_id', as: 'userProfile' });
    User.hasMany(models.Layout, { foreignKey: 'user_id', as: 'layouts' });

    // One row per active login (device). Replaces the single refresh_token.
    User.hasMany(models.UserSession, { foreignKey: 'user_id', as: 'sessions' });
  };

  return User;
};
