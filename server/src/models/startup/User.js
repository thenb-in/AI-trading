// todo: create a user profile
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
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
      type: DataTypes.UUID,
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
      type: DataTypes.STRING,
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
    }
  }, {
    tableName: 'nbnext_users'
  });

  User.associate = (models) => {
    User.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
  };

  return User;
};
