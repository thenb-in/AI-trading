module.exports = (sequelize, DataTypes) => {
  const GroupOfCompaniesUser = sequelize.define('GroupOfCompaniesUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'group_id'
    },
    userId: {
      type: DataTypes.UUID,  // type UUID because the user primary key is a UUID
      allowNull: false,
      field: 'user_id'
    }
  }, {
    tableName: 'nbnext_group_of_companies_users',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['group_id', 'user_id'] },
      { fields: ['user_id'] }
    ]
  });

  GroupOfCompaniesUser.associate = (models) => {
    GroupOfCompaniesUser.belongsTo(models.GroupOfCompanies, {
      foreignKey: 'groupId',
      as: 'group',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    GroupOfCompaniesUser.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return GroupOfCompaniesUser;
};
