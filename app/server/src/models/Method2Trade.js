'use strict';

/**
 * Method 2 trade lifecycle. A recommendation is not a mood — once called, it
 * becomes a trade with FROZEN entry, stop and targets, and it stays active
 * until its own levels resolve it: stop structure breaks, targets complete,
 * the thesis genuinely reverses, or the session ends. A premium dip inside
 * the levels is drawdown to be reported calmly, not a reason to flicker.
 */
module.exports = (sequelize, DataTypes) => {
  const Method2Trade = sequelize.define('Method2Trade', {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    entry_time:     { type: DataTypes.DATE, allowNull: false },
    exit_time:      { type: DataTypes.DATE, allowNull: true },
    status:         { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'active' },
    // active | stopped | target | invalidated | eod
    resolve_reason: { type: DataTypes.STRING(200), allowNull: true },
    direction:      { type: DataTypes.STRING(8),  allowNull: false },
    tradingsymbol:  { type: DataTypes.STRING(32), allowNull: false },
    option_type:    { type: DataTypes.STRING(4),  allowNull: false },
    strike:         { type: DataTypes.INTEGER,    allowNull: true },
    expiry:         { type: DataTypes.STRING(16), allowNull: true },
    confidence:     { type: DataTypes.INTEGER,    allowNull: true },
    spot_entry:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    entry_premium:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    sl_premium:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },   // original
    trail_sl:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },   // ratchets up as targets hit
    t1_premium:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    t2_premium:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    t3_premium:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    ul_levels:      { type: DataTypes.JSONB, allowNull: true },   // {sl, t1, t2, t3, basis, iv}
    targets_hit:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_premium:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    max_premium:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    min_premium:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    exit_premium:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    entry_reasons:  { type: DataTypes.JSONB, allowNull: true }
  }, {
    tableName: 'method2_trades',
    timestamps: false,
    indexes: [{ fields: ['status'] }, { fields: ['entry_time'] }]
  });

  return Method2Trade;
};
