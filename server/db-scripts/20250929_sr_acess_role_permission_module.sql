INSERT INTO permissions (name, description, "createdAt", "updatedAt")
VALUES (
    'has_role_permission',
    'Check if a role has a specific permission',
    NOW(),
    NOW()
)
ON CONFLICT (name) DO NOTHING;
