'use strict';

/**
 * Persisted scalp backtest reports — every run is saved so results are
 * comparable across days, shapes and data sources instead of living in
 * terminal scrollback.
 */
module.exports = (sequelize, DataTypes) => {
  const ScalpReport = sequelize.define('ScalpReport', {
    id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    kind:       { type: DataTypes.STRING(24), allowNull: false },   // real-premium | bs-1min
    label:      { type: DataTypes.STRING(80), allowNull: false },   // e.g. "+2/-5 real premiums"
    params:     { type: DataTypes.JSONB, allowNull: false },        // targetPts, stopPts, qty, cap, slippage, window
    summary:    { type: DataTypes.JSONB, allowNull: false },        // trades, winRate, requiredWinRate, netRs, ...
    by_day:     { type: DataTypes.JSONB, allowNull: true },         // [{date, trades, wins, netRs}]
    trades:     { type: DataTypes.JSONB, allowNull: true }         // capped trade log
  }, {
    tableName: 'scalp_reports',
    timestamps: false,
    indexes: [{ fields: ['created_at'] }, { fields: ['kind'] }]
  });

  return ScalpReport;
};
