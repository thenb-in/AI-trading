module.exports = (sequelize, DataTypes) => {
  const NamingSeries = sequelize.define('NamingSeries', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id'
    },
    master: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    template: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // The last number handed out; the next code is formatted from count + 1.
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'nbnext_naming_series',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'uniq_naming_series_one_default',
        unique: true,
        fields: ['company_id', 'master'],
        where: { is_default: true }
      }
    ]
  });

  NamingSeries.associate = (models) => {
    NamingSeries.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    NamingSeries.belongsTo(models.User, { foreignKey: 'createdBy', as: 'createdByUser' });
  };

  return NamingSeries;
};
