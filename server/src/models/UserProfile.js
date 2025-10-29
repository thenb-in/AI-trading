module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    currentCompany: {
      type: DataTypes.UUID,
      allowNull: false
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
