-- Group of Companies: a named grouping of companies that also lends a set of
-- business users a face in the multi-company user-assignment screen.
--
-- A group owns nothing a company owns; it is a support-staff construct that
-- lives above all companies (no company_id). Membership is two join tables so a
-- company or a user can be added to, or dropped from, a group on its own.
--
-- Access to this master is gated on support-user status in the app, not on
-- subscription permissions, so no permission rows are seeded here.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS nbnext_group_of_companies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_by  UUID NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nbnext_group_of_companies_companies (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES nbnext_group_of_companies (id) ON UPDATE CASCADE ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES nbnext_company (id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A company listed twice under the same group is the same membership typed
-- twice; the lookup "which groups is this company in" wants company_id on its own.
CREATE UNIQUE INDEX IF NOT EXISTS nbnext_group_of_companies_companies_uniq
  ON nbnext_group_of_companies_companies (group_id, company_id);
CREATE INDEX IF NOT EXISTS nbnext_group_of_companies_companies_company
  ON nbnext_group_of_companies_companies (company_id);

CREATE TABLE IF NOT EXISTS nbnext_group_of_companies_users (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES nbnext_group_of_companies (id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nbnext_group_of_companies_users_uniq
  ON nbnext_group_of_companies_users (group_id, user_id);
CREATE INDEX IF NOT EXISTS nbnext_group_of_companies_users_user
  ON nbnext_group_of_companies_users (user_id);
