-- Moves the Zerodha broker credentials out of env and onto company_profiles,
-- scoped per company. Drops the old non-secret label + status-flag columns and
-- adds the actual credential columns (api key, api secret, access token).
-- The access token is written at login and refreshed daily (see
-- config/brokerCredentials.js). Fresh installs get these columns from the model
-- via SYNC_DB; this script upgrades existing databases.
-- Idempotent: safe to re-run.
-- NOTE(security): these credential columns are plaintext at rest — encryption
-- at rest is a follow-up (see companyProfileTradingFields.js header TODO).

-- Drop the old non-secret references that are being replaced
ALTER TABLE company_profiles DROP COLUMN IF EXISTS zerodha_api_key_label;
ALTER TABLE company_profiles DROP COLUMN IF EXISTS zerodha_credentials_configured;

-- Add the Zerodha credential columns
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_api_key VARCHAR(100);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_api_secret VARCHAR(200);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS zerodha_access_token VARCHAR(200);
