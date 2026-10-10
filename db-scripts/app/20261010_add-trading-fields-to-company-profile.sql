-- Adds this trading app's company-level config columns to company_profiles.
-- Home for non-secret broker references, traded symbols, the IST market
-- session window, trade/execution mode, and the strategy tunables.
-- Secrets (API secret, access token, mailer key) stay in env and are NOT here.
-- Idempotent: safe to re-run. Defaults mirror the legacy .env.example / service
-- fallbacks exactly.

-- Broker references (non-secret)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_user_id VARCHAR(50);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_api_key_label VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_credentials_configured BOOLEAN NOT NULL DEFAULT FALSE;

-- Traded symbols
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trading_symbols JSONB NOT NULL DEFAULT '["NIFTY","BANKNIFTY","SENSEX"]'::jsonb;

-- Market session window (IST)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS market_open_time VARCHAR(5) NOT NULL DEFAULT '09:15';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS market_close_time VARCHAR(5) NOT NULL DEFAULT '15:30';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS session_block_opening BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS session_block_lunch BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS session_block_closing BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS session_expiry_day_special BOOLEAN NOT NULL DEFAULT TRUE;

-- Trade / execution mode
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(10) NOT NULL DEFAULT 'off';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS signal_trade_mode VARCHAR(10) NOT NULL DEFAULT 'selective';

-- Strategy tunables (numeric)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS macd_fast INTEGER NOT NULL DEFAULT 12;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS macd_slow INTEGER NOT NULL DEFAULT 26;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS macd_signal INTEGER NOT NULL DEFAULT 9;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS supertrend_atr_period INTEGER NOT NULL DEFAULT 10;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS supertrend_multiplier DOUBLE PRECISION NOT NULL DEFAULT 3;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS vix_high_threshold DOUBLE PRECISION NOT NULL DEFAULT 20;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS vix_low_threshold DOUBLE PRECISION NOT NULL DEFAULT 11;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS volume_breakout_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.5;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS cpr_narrow_threshold_pct DOUBLE PRECISION NOT NULL DEFAULT 0.003;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS signal_use_pcr_weighting BOOLEAN NOT NULL DEFAULT TRUE;

-- Confidence weights (per factor)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS macd_confidence_weight INTEGER NOT NULL DEFAULT 8;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS vix_confidence_weight INTEGER NOT NULL DEFAULT 10;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS volume_confidence_weight INTEGER NOT NULL DEFAULT 5;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS supertrend_confidence_weight INTEGER NOT NULL DEFAULT 10;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS oi_change_confidence_weight INTEGER NOT NULL DEFAULT 8;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS oi_sr_confidence_weight INTEGER NOT NULL DEFAULT 7;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS max_pain_confidence_weight INTEGER NOT NULL DEFAULT 5;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS pdh_pdl_confidence_weight INTEGER NOT NULL DEFAULT 7;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS cpr_confidence_weight INTEGER NOT NULL DEFAULT 5;
