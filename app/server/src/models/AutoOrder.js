'use strict';

/**
 * Every order the auto-trader places (or would place, in dry-run) — the
 * audit trail real money demands. One row per order action, never updated
 * destructively: rejections and errors are rows too.
 */
module.exports = (sequelize, DataTypes) => {
  const AutoOrder = sequelize.define('AutoOrder', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trade_id:      { type: DataTypes.INTEGER, allowNull: false },      // method2_trades.id
    kind:          { type: DataTypes.STRING(16), allowNull: false },   // entry | sl | sl-modify | exit | cancel
    mode:          { type: DataTypes.STRING(8),  allowNull: false },   // dry | live
    tradingsymbol: { type: DataTypes.STRING(32), allowNull: false },
    transaction:   { type: DataTypes.STRING(4),  allowNull: false },   // BUY | SELL
    qty:           { type: DataTypes.INTEGER,    allowNull: false },
    order_type:    { type: DataTypes.STRING(8),  allowNull: false },   // MARKET | SL
    trigger_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    limit_price:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    broker_order_id: { type: DataTypes.STRING(32), allowNull: true },
    status:        { type: DataTypes.STRING(16), allowNull: false },   // dry | placed | modified | cancelled | rejected | error
    detail:        { type: DataTypes.STRING(400), allowNull: true },
  }, { tableName: 'auto_orders', underscored: true });

  return AutoOrder;
};
