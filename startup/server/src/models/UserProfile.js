module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,  // type UUID because foreign key is a UUID
      allowNull: false,
      references: { model: 'nbnext_users', key: 'id' }
    },
    currentCompany: {
      type: DataTypes.UUID,  // type UUID because foreign key is a UUID
      allowNull: true
    },

    home_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    office_latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Office location latitude (decimal degrees, -90..90)'
    },
    office_longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Office location longitude (decimal degrees, -180..180)'
    },
    price_tier: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [
        {
          type: 'car',
          tiers: [{ fromKm: 0, toKm: 100, pricePerKm: 8, incentive: 0 }]
        },
        {
          type: 'bike',
          tiers: [{ fromKm: 0, toKm: 100, pricePerKm: 3.5, incentive: 0 }]
        }
      ]
    },
    default_screen_mode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'location_mode',
      validate: {
        isIn: {
          args: [['location_mode', 'call_mode', 'salarymitra_mode']],
          msg: 'Default screen mode must be one of: location_mode, call_mode, salarymitra_mode'
        }
      }
    },
    app_version: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    app_permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    unsynced_call_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    app_info_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'nbnext_user_profiles',
    timestamps: false
  });

  UserProfile.associate = (models) => {
    UserProfile.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserProfile;
};
