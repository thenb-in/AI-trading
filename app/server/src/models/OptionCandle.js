'use strict';

/**
 * 1-minute REAL option candles with per-minute open interest — DB copy of the
 * harvested archive. Zerodha purges these at contract expiry, so this table
 * (and its file twin) is the only durable record of real premiums.
 */
module.exports = (sequelize, DataTypes) => {
  const OptionCandle = sequelize.define('OptionCandle', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tradingsymbol: { type: DataTypes.STRING(32), allowNull: false },
    expiry:        { type: DataTypes.DATEONLY, allowNull: false },
    strike:        { type: DataTypes.INTEGER, allowNull: false },
    type:          { type: DataTypes.STRING(2), allowNull: false },   // CE / PE
    time:          { type: DataTypes.BIGINT, allowNull: false },
    open:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    high:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    low:           { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    close:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    volume:        { type: DataTypes.BIGINT, allowNull: true },
    oi:            { type: DataTypes.BIGINT, allowNull: true },
  }, {
    tableName: 'option_candles',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['tradingsymbol', 'time'] },
      { fields: ['expiry', 'strike', 'type'] },
      { fields: ['time'] },
    ],
  });

  return OptionCandle;
};
