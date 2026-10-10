// Trading-specific columns added to the framework's CompanyProfile model.
//
// Registered via registerModelFields('CompanyProfile', companyProfileTradingFields)
// in registerAppModelFields.js, so these columns live on the existing
// company_profiles table — there is no separate trading table.
//
// This is the company-level HOME for everything that is company-specific
// trading config: non-secret broker references, the traded symbols, the IST
// market-session window, the trade/execution mode, and the strategy tunables.
// Secrets (API secret, access token, mailer key) stay in env and are NEVER
// stored here — only non-secret references and a "credentials configured" flag.
//
// Defaults below are the exact validated values carried over from the legacy
// app's .env.example / service fallbacks (do not change without a strategy review).
const companyProfileTradingFields = (DataTypes) => ({
  // --- Broker references (non-secret) ---------------------------------------
  zerodha_user_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Zerodha/Kite login user id (e.g. AB1234) — a non-secret account reference, display only.'
  },
  zerodha_api_key_label: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Human label naming which Kite Connect app/API key this company runs on. NOT the API key value — that stays in env.'
  },
  zerodha_credentials_configured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the Zerodha API key/secret/access token are present in env for this deployment. Status flag only; the secrets themselves are never stored here.'
  },

  // --- Traded symbols -------------------------------------------------------
  trading_symbols: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['NIFTY', 'BANKNIFTY', 'SENSEX'],
    comment: 'Index symbols this company trades/monitors. Legacy default: NIFTY, BANKNIFTY, SENSEX.'
  },

  // --- Market session window (IST) ------------------------------------------
  market_open_time: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '09:15',
    comment: 'Market open, IST, HH:MM 24h. Legacy hardcoded 09:15.'
  },
  market_close_time: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '15:30',
    comment: 'Market close, IST, HH:MM 24h. Legacy hardcoded 15:30.'
  },
  session_block_opening: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Block the 09:15-09:30 opening volatility trap. Legacy SESSION_BLOCK_OPENING default true.'
  },
  session_block_lunch: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Block the 12:30-13:30 lunch dead zone. Legacy SESSION_BLOCK_LUNCH default true.'
  },
  session_block_closing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Block the closing window (15:15, or 15:00 on expiry). Legacy SESSION_BLOCK_CLOSING default true.'
  },
  session_expiry_day_special: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Apply the earlier expiry-day closing block. Legacy SESSION_EXPIRY_DAY_SPECIAL default true.'
  },

  // --- Trade / execution mode -----------------------------------------------
  execution_mode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'off',
    validate: {
      isIn: {
        args: [['off', 'dry', 'live']],
        msg: 'execution_mode must be off, dry (paper) or live'
      }
    },
    comment: 'Auto-order execution switch: off | dry (paper) | live. Legacy app_settings.auto_trade_mode, default off.'
  },
  signal_trade_mode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'selective',
    validate: {
      isIn: {
        args: [['selective', 'medium']],
        msg: 'signal_trade_mode must be selective or medium'
      }
    },
    comment: 'Signal selectivity (legacy TRADE_MODE env): selective | medium. Default selective. NOT the same as execution_mode.'
  },

  // --- Strategy tunables (numeric) ------------------------------------------
  macd_fast: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12, comment: 'MACD fast EMA period. Legacy MACD_FAST=12.' },
  macd_slow: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 26, comment: 'MACD slow EMA period. Legacy MACD_SLOW=26.' },
  macd_signal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 9, comment: 'MACD signal EMA period. Legacy MACD_SIGNAL=9.' },
  supertrend_atr_period: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, comment: 'SuperTrend ATR period. Legacy SUPERTREND_ATR_PERIOD=10.' },
  supertrend_multiplier: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 3, comment: 'SuperTrend ATR multiplier. Legacy SUPERTREND_MULTIPLIER=3.' },
  vix_high_threshold: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20, comment: 'India VIX high threshold. Legacy VIX_HIGH_THRESHOLD=20.' },
  vix_low_threshold: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 11, comment: 'India VIX low threshold. Legacy VIX_LOW_THRESHOLD=11.' },
  volume_breakout_multiplier: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5, comment: 'Volume breakout confirmation multiplier. Legacy VOLUME_BREAKOUT_MULTIPLIER=1.5.' },
  cpr_narrow_threshold_pct: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.003, comment: 'CPR "narrow" width as a fraction of price. Legacy CPR_NARROW_THRESHOLD_PCT=0.003.' },
  signal_use_pcr_weighting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Weight signals by Put/Call ratio. Legacy SIGNAL_USE_PCR_WEIGHTING default true.' },

  // --- Confidence weights (per factor, points into the 8-factor score) ------
  macd_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8, comment: 'MACD factor weight. Legacy MACD_CONFIDENCE_WEIGHT=8.' },
  vix_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, comment: 'VIX factor weight. Legacy VIX_CONFIDENCE_WEIGHT=10.' },
  volume_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, comment: 'Volume factor weight. Legacy VOLUME_CONFIDENCE_WEIGHT=5.' },
  supertrend_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, comment: 'SuperTrend factor weight. Legacy SUPERTREND_CONFIDENCE_WEIGHT=10.' },
  oi_change_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8, comment: 'OI-change factor weight. Legacy OI_CHANGE_CONFIDENCE_WEIGHT=8.' },
  oi_sr_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7, comment: 'OI support/resistance factor weight. Legacy OI_SR_CONFIDENCE_WEIGHT=7.' },
  max_pain_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, comment: 'Max-pain factor weight. Legacy MAX_PAIN_CONFIDENCE_WEIGHT=5.' },
  pdh_pdl_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7, comment: 'Prev-day high/low factor weight. Legacy PDH_PDL_CONFIDENCE_WEIGHT=7.' },
  cpr_confidence_weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, comment: 'CPR factor weight. Legacy CPR_CONFIDENCE_WEIGHT=5.' }
});

module.exports = { companyProfileTradingFields };
