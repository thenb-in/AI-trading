-- company_profiles.debug_mode_shortcut — per-company debug-mode key combo.
--
-- models/CompanyProfile.js gained this column when the hard-coded Alt+D toggle
-- in useDebugMode became configurable per company (Company Settings ->
-- Engineering). companyService.getCompanySettings selects it and
-- updateCompanySettings writes it, so without the column both fail.
--
-- Default 'Alt+D' preserves the old behaviour for existing companies; NULL
-- means the company cleared it and debug mode cannot be toggled at all.

BEGIN;

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS debug_mode_shortcut VARCHAR(50) DEFAULT 'Alt+D';

COMMIT;
