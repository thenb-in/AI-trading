'use strict';

module.exports = (sequelize, DataTypes) => {
  const TradeSignal = sequelize.define('TradeSignal', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    timestamp:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    direction:     { type: DataTypes.STRING(8),  allowNull: false },   // BUY / SELL
    action:        { type: DataTypes.STRING(64), allowNull: true },
    tradingsymbol: { type: DataTypes.STRING(32), allowNull: true },
    option_type:   { type: DataTypes.STRING(4),  allowNull: true },    // CE / PE
    strike:        { type: DataTypes.INTEGER,    allowNull: true },
    expiry:        { type: DataTypes.DATEONLY,   allowNull: true },
    spot_price:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_entry: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_sl:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_t1:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_t2:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    premium_t3:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    ul_sl:         { type: DataTypes.INTEGER,    allowNull: true },
    ul_t1:         { type: DataTypes.INTEGER,    allowNull: true },
    ul_t2:         { type: DataTypes.INTEGER,    allowNull: true },
    confidence:    { type: DataTypes.INTEGER,    allowNull: true },
    ema20:         { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    ema50:         { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    rsi:           { type: DataTypes.DECIMAL(6, 2),  allowNull: true },
    pcr:           { type: DataTypes.DECIMAL(6, 3),  allowNull: true },
    reasons:       { type: DataTypes.JSONB,      allowNull: true },    // array of reason strings
  }, {
    tableName: 'trade_signals',
    timestamps: false,
    underscored: false,
    indexes: [
      { fields: ['timestamp'] },
      { fields: ['direction'] },
      { fields: ['tradingsymbol'] },
    ],
  });

  return TradeSignal;
};
