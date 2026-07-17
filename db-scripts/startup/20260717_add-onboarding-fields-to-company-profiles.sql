-- Adds the onboarding-captured columns to company_profiles.
--
-- Context: CompanyProfile's model gained default_state and
-- establishment_employee_count (written by the self-serve onboarding flow in
-- startup/server/src/onboarding/onboarding.workspace.service.js), but the app
-- boots with sequelize.sync({ alter: false }), which never adds columns to an
-- existing table. Run this once against any DB provisioned before these
-- columns existed.
--
-- Idempotent: IF NOT EXISTS guards make re-runs a no-op.

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS default_state VARCHAR(255);

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS establishment_employee_count INTEGER;
