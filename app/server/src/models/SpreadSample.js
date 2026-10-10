'use strict';

/**
 * Per-minute bid-ask spread aggregates from the websocket depth feed.
 *
 * This table exists to replace the single most load-bearing ASSUMPTION in
 * the project: every backtest charges 0.25 pts of slippage per side, and the
 * scalp's breakeven moves from 86% to 93% between 0.25 and 0.5. Recording
 * the real spread on the exact strikes we trade turns that guess into data.
 */
module.exports = (sequelize, DataTypes) => {
  const SpreadSample = sequelize.define('SpreadSample', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    minute:        { type: DataTypes.BIGINT, allowNull: false },        // unix, floor to minute
    tradingsymbol: { type: DataTypes.STRING(32), allowNull: false },
    symbol:        { type: DataTypes.STRING(16), allowNull: false },    // NIFTY / BANKNIFTY
    strike:        { type: DataTypes.INTEGER, allowNull: true },
    type:          { type: DataTypes.STRING(2), allowNull: true },
    ltp:           { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // last in the minute
    avg_spread:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    min_spread:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    max_spread:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    ticks:         { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'spread_samples',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['minute', 'tradingsymbol'] },
      { fields: ['symbol', 'minute'] },
    ],
  });

  return SpreadSample;
};
