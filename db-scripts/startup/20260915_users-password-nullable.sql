-- nbnext_users.password: nullable, as models/User.js declares.
--
-- A user provisioned through SSO signs in with the wallet account and has no
-- local password. The column was created NOT NULL, so creating such a user
-- fails with 'null value in column "password" violates not-null constraint'.
-- (email is already nullable: 20260909_add-email-to-users.sql adds it without
-- a constraint.)

ALTER TABLE nbnext_users ALTER COLUMN password DROP NOT NULL;
