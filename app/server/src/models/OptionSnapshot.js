'use strict';

module.exports = (sequelize, DataTypes) => {
  const OptionSnapshot = sequelize.define('OptionSnapshot', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    expiry: { type: DataTypes.DATEONLY, allowNull: false },
    strike: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('CE', 'PE'), allowNull: false },
    oi: { type: DataTypes.BIGINT, allowNull: false },
    ltp: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'option_snapshots',
    timestamps: false,
    underscored: false,
    indexes: [
      { fields: ['expiry'] },
      { fields: ['strike'] },
      { fields: ['type'] },
      { fields: ['timestamp'] },
      { fields: ['expiry', 'strike', 'type', 'timestamp'] },
    ],
  });

  return OptionSnapshot;
};
