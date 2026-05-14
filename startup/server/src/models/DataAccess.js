module.exports = (sequelize, DataTypes) => {
  const DataAccess = sequelize.define('DataAccess', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'nbnext_users', key: 'id' }
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'company',
      validate: {
        isIn: {
          args: [['company', 'department', 'employee']],
          msg: 'Level must be one of: company, department, employee'
        }
      }
    },
    scope: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { departmentIds: [], employeeIds: [] }
    }
  }, {
    tableName: 'nbnext_user_data_access',
    timestamps: true
  });

  DataAccess.associate = (models) => {
    DataAccess.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return DataAccess;
};


