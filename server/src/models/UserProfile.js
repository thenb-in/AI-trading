module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.UUID,  // type UUID because foreign key is a UUID
      allowNull: false
    },
    currentCompany: {
      type: DataTypes.UUID,  // type UUID because foreign key is a UUID
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
