ALTER TABLE public.nbnext_permissions
ADD COLUMN IF NOT EXISTS type VARCHAR NULL;


ALTER TABLE public.nbnext_users
ADD COLUMN IF NOT EXISTS "is_sadmin" BOOLEAN DEFAULT FALSE;

-- Insert default permission entries
INSERT INTO public.nbnext_permissions (name, description, type, created_at, updated_at)
VALUES
  ('view_user_module', 'Allows viewing the User Management module', 'module', NOW(), NOW()),
  ('view_company_module', 'Allows viewing the Company Management module', 'module', NOW(), NOW()),
  ('view_role_permission_module', 'Allows viewing the Role & Permission Management module', 'module', NOW(), NOW()),
  ('create_company', 'Allows creating a new company', 'action', NOW(), NOW());

