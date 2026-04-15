-- Rename is_sadmin column to is_support_user in nbnext_users table
ALTER TABLE nbnext_users
RENAME COLUMN is_sadmin TO is_support_user;
