ALTER TABLE public.nbnext_license_local
ADD COLUMN IF NOT EXISTS subscription_id INTEGER;

ALTER TABLE public.nbnext_license_local
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.nbnext_license_local
ADD COLUMN IF NOT EXISTS permission_caps JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.nbnext_license_local.subscription_id IS
  'Subscription the license was issued against; NULL for licenses that carry none';
COMMENT ON COLUMN public.nbnext_license_local.permissions IS
  'Flat permission list mirrored from the license token';
COMMENT ON COLUMN public.nbnext_license_local.permission_caps IS
  'Per-permission numeric caps mirrored from the license token';
