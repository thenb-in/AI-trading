// Business layer for the company-level trading config stored on CompanyProfile.
// One model per service: CompanyProfile only.
const { CompanyProfile } = require('../models');

// The trading columns this service owns (added by companyProfileTradingFields).
// Kept as a plain list so read/update stay generic — add a column here and it
// flows through both ends without touching the controller/view.
const TRADING_FIELDS = [
  'zerodha_user_id', 'zerodha_api_key_label', 'zerodha_credentials_configured',
  'trading_symbols',
  'market_open_time', 'market_close_time',
  'session_block_opening', 'session_block_lunch', 'session_block_closing', 'session_expiry_day_special',
  'execution_mode', 'signal_trade_mode',
  'macd_fast', 'macd_slow', 'macd_signal',
  'supertrend_atr_period', 'supertrend_multiplier',
  'vix_high_threshold', 'vix_low_threshold',
  'volume_breakout_multiplier', 'cpr_narrow_threshold_pct', 'signal_use_pcr_weighting',
  'macd_confidence_weight', 'vix_confidence_weight', 'volume_confidence_weight',
  'supertrend_confidence_weight', 'oi_change_confidence_weight', 'oi_sr_confidence_weight',
  'max_pain_confidence_weight', 'pdh_pdl_confidence_weight', 'cpr_confidence_weight'
];

const pickTradingFields = (source) => TRADING_FIELDS.reduce((acc, key) => {
  if (source[key] !== undefined) {
    acc[key] = source[key];
  }
  return acc;
}, {});

const companyProfileTradingService = {

  // Returns only the trading slice (plus id) for the company. The CompanyProfile
  // row always exists for a provisioned company; if it somehow does not yet, we
  // create it on first read so the settings screen opens on the column defaults.
  async getTradingConfig(companyId) {
    let profile = await CompanyProfile.findOne({ where: { companyId } });
    if (!profile) {
      profile = await CompanyProfile.create({ companyId });
    }
    const json = profile.toJSON();
    return pickTradingFields(json);
  },

  async updateTradingConfig(companyId, payload) {
    const values = pickTradingFields(payload);
    const [profile] = await CompanyProfile.findOrCreate({
      where: { companyId },
      defaults: { companyId, ...values }
    });
    if (Object.keys(values).length) {
      await profile.update(values);
    }
    return pickTradingFields(profile.toJSON());
  }
};

module.exports = companyProfileTradingService;
