'use strict';

module.exports = (sequelize, DataTypes) => {
  const AppSetting = sequelize.define('AppSetting', {
    key:   { type: DataTypes.STRING(64), primaryKey: true },
    value: { type: DataTypes.JSONB,      allowNull: false },
  }, {
    tableName: 'app_settings',
    timestamps: true,
    underscored: false,
  });

  return AppSetting;
};
