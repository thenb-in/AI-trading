'use strict';

/**
 * Stores the full NFO instruments snapshot from Zerodha.
 * A nightly job saves all active NFO contracts with their instrument_token
 * so that future backtests can look up tokens for options that are now expired.
 *
 * Row uniqueness: (instrument_token, snapshot_date) — one token per day.
 */
module.exports = (sequelize, DataTypes) => {
  const NfoInstrument = sequelize.define('NfoInstrument', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    snapshot_date:    { type: DataTypes.DATEONLY, allowNull: false },        // YYYY-MM-DD (IST)
    instrument_token: { type: DataTypes.BIGINT,  allowNull: false },
    exchange_token:   { type: DataTypes.BIGINT,  allowNull: true },
    tradingsymbol:    { type: DataTypes.STRING(64), allowNull: false },
    name:             { type: DataTypes.STRING(32), allowNull: true },       // NIFTY / BANKNIFTY
    expiry:           { type: DataTypes.DATEONLY, allowNull: true },
    strike:           { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    lot_size:         { type: DataTypes.INTEGER, allowNull: true },
    instrument_type:  { type: DataTypes.STRING(8),  allowNull: true },       // CE / PE / FUT
    segment:          { type: DataTypes.STRING(16), allowNull: true },
    exchange:         { type: DataTypes.STRING(8),  allowNull: true },
  }, {
    tableName: 'nfo_instruments',
    timestamps: false,
    underscored: false,
    indexes: [
      { fields: ['snapshot_date'] },
      { fields: ['tradingsymbol'] },
      { fields: ['name', 'expiry', 'strike', 'instrument_type'] },
      { unique: true, fields: ['instrument_token', 'snapshot_date'] },
    ],
  });

  return NfoInstrument;
};
