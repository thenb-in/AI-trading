'use strict';

/**
 * 1-minute index candles, DB copy of the file archive. One row per
 * (symbol, minute); coarser intervals (2,3,5,10,15 min, ...) are resampled
 * from these on demand — 1-minute is the ground truth, everything else is
 * derived, so no derived interval is ever stored and none can drift.
 * Index candles carry no volume (exchanges do not publish it for indices).
 */
module.exports = (sequelize, DataTypes) => {
  const IndexCandle = sequelize.define('IndexCandle', {
    id:     { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    symbol: { type: DataTypes.STRING(16), allowNull: false },   // NIFTY / BANKNIFTY / SENSEX
    time:   { type: DataTypes.BIGINT, allowNull: false },        // unix seconds, candle open
    open:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    high:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    low:    { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    close:  { type: DataTypes.DECIMAL(12, 2), allowNull: false }
  }, {
    tableName: 'index_candles',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['symbol', 'time'] }
    ]
  });

  return IndexCandle;
};
