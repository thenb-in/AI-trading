// App-owned columns (office location, price tiers, mobile-app metadata, etc.)
// are injected via the model field registry — startup must not import @appServer.
// The app registers them from registerAppData before this model is defined; a
// framework-only process just gets the base identity columns below.
const { getModelFields } = require('./register/modelFieldRegistry');

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
      allowNull: false
    },
    ...getModelFields('UserProfile', DataTypes)
  }, {
    tableName: 'nbnext_user_profiles',
    timestamps: false
  });

  UserProfile.associate = (models) => {
    UserProfile.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserProfile;
};
