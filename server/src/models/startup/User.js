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
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    companyId: {
      type: DataTypes.UUID,  // type UUID because foreign key is a UUID
      allowNull: false
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
    isSadmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'nbnext_users',
    timestamps: false, // Disable automatic created_at/updated_at columns
    underscored: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });

    // Data access configuration per user (same company scope)
    User.hasOne(models.UserProfile, { foreignKey: 'userId', as: 'userProfile' });
  };

  return User;
};
