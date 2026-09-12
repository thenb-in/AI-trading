ALTER TABLE public.nbnext_users
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.nbnext_users
ADD COLUMN IF NOT EXISTS deletion_scheduled_purge_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.nbnext_users.deletion_requested_at IS
  'Set when the user requests account deletion from the mobile app. NULL = no request outstanding.';

COMMENT ON COLUMN public.nbnext_users.deletion_scheduled_purge_at IS
  'When this account and its personal data must be purged (request + 30 days).';

