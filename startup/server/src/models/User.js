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
    },
    // Which person on the payroll this login is. Null for plenty of accounts on purpose —
    // an HR operator, a support login or an integration is not an employee — and employee
    // self-service answers those accounts with an empty page rather than an error.
    //
    // Declared without a `references`: the foreign key is created by
    // db-scripts/20260806_09_link_user_to_employee.sql, and the employee table belongs to the
    // app rather than to this layer, so naming it here would point the framework at the app.
    employee_id: {
      type: DataTypes.STRING(36),
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
  };

  return User;
};
