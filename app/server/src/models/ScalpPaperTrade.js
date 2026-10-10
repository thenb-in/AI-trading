'use strict';

/**
 * Forward paper-trade log for the scalp engine.
 *
 * Backtests on 5-minute bars with Black-Scholes premiums cannot resolve a
 * 2-point target, so they can neither confirm nor refute what actually happens
 * when the trade is taken live. This table records what the engine WOULD have
 * done, minute by minute, against real quoted premiums — so the question gets
 * settled by evidence rather than by either model's assumptions.
 */
module.exports = (sequelize, DataTypes) => {
  const ScalpPaperTrade = sequelize.define('ScalpPaperTrade', {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    entry_time:     { type: DataTypes.DATE, allowNull: false },
    exit_time:      { type: DataTypes.DATE, allowNull: true },
    status:         { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'open' }, // open/win/loss/timeout
    direction:      { type: DataTypes.STRING(8),  allowNull: false },   // BUY / SELL
    option_type:    { type: DataTypes.STRING(4),  allowNull: false },   // CE / PE
    tradingsymbol:  { type: DataTypes.STRING(32), allowNull: false },
    strike:         { type: DataTypes.INTEGER,    allowNull: true },
    spot_entry:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    spot_exit:      { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_entry:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    premium_target: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    premium_stop:   { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    premium_exit:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // Best and worst premium seen while the position was open. These say whether
    // a target was ever touched between polls — the thing coarse bars cannot see.
    premium_best:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_worst:  { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    polls:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    qty:            { type: DataTypes.INTEGER, allowNull: false },
    gross_rs:       { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    costs_rs:       { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    net_rs:         { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    held_seconds:   { type: DataTypes.INTEGER, allowNull: true },
    regime:         { type: DataTypes.JSONB, allowNull: true },   // band, efficiency, position
    reason:         { type: DataTypes.STRING(160), allowNull: true }
  }, {
    tableName: 'scalp_paper_trades',
    timestamps: false,
    underscored: false,
    indexes: [
      { fields: ['entry_time'] },
      { fields: ['status'] },
      { fields: ['tradingsymbol'] }
    ]
  });

  return ScalpPaperTrade;
};
