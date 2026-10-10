'use strict';

/**
 * First observed OI per contract per day — the 9:15 anchor that makes the
 * chain's "OI change" column mean what a trader means by it (change since
 * open), surviving server restarts instead of resetting to zero.
 */
module.exports = (sequelize, DataTypes) => {
  const ChainOiBaseline = sequelize.define('ChainOiBaseline', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    date:          { type: DataTypes.DATEONLY, allowNull: false },
    tradingsymbol: { type: DataTypes.STRING(32), allowNull: false },
    oi:            { type: DataTypes.BIGINT, allowNull: false },
    captured_at:   { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'chain_oi_baselines',
    timestamps: false,
    indexes: [{ unique: true, fields: ['date', 'tradingsymbol'] }]
  });

  return ChainOiBaseline;
};
