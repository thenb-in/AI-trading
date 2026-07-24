// App-owned columns are injected via the model field registry
const { getModelFields } = require('./register/modelFieldRegistry');

module.exports = (sequelize, DataTypes) => {
  const CompanyProfile = sequelize.define('CompanyProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    debug_mode_shortcut: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Alt+D',
      validate: {
        is: {
          args: /^(?:(?:Ctrl|Alt|Shift|Meta)\+)+[A-Za-z0-9]+$/,
          msg: 'debug_mode_shortcut must be one or more modifiers and a key, e.g. Alt+D'
        }
      },
      comment: 'Keyboard shortcut that toggles debug mode for this company. Defaults to Alt+D; null means the company cleared it and debug mode cannot be toggled.'
    },
    ...getModelFields('CompanyProfile', DataTypes)
  }, {
    tableName: 'company_profiles',
    timestamps: true,
    underscored: true
  });

  CompanyProfile.associate = (models) => {
    CompanyProfile.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return CompanyProfile;
};
