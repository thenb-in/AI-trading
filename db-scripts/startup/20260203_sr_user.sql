ALTER TABLE nbnext_users
ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE nbnext_user_profiles
ALTER COLUMN current_company DROP NOT NULL;