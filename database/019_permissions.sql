-- Migration 019: Permissions System
-- Creates permission management for role-based access control

CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    category text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id uuid REFERENCES public.royal_roles(id) ON DELETE CASCADE NOT NULL,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read permissions"
ON public.permissions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow public read role permissions"
ON public.role_permissions
FOR SELECT
TO anon
USING (true);

-- Insert core permissions
INSERT INTO public.permissions (name, description, category)
VALUES
('view_chamber', 'Access to view chamber content', 'chamber'),
('post_in_chamber', 'Ability to post content in chambers', 'chamber'),
('create_chamber', 'Create new royal chambers', 'chamber'),
('view_announcement', 'View official announcements', 'announcement'),
('create_announcement', 'Post official announcements', 'announcement'),
('manage_members', 'Add/remove members and assign roles', 'member_management'),
('manage_permissions', 'Modify role permissions', 'member_management'),
('approve_membership', 'Approve pending membership applications', 'member_management'),
('view_activity_log', 'Access activity logs and audit trails', 'admin'),
('manage_settings', 'Modify Palace settings and configuration', 'admin'),
('manage_treasury', 'Handle payments and subscriptions', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Royal Member role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Royal Member'
AND p.name IN ('view_chamber', 'post_in_chamber', 'view_announcement')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Royal Council role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Royal Council'
AND p.name IN (
    'view_chamber', 'post_in_chamber', 'create_chamber',
    'view_announcement', 'create_announcement',
    'manage_members', 'approve_membership', 'view_activity_log'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Palace Authority role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority'
AND p.name IN (
    'view_chamber', 'post_in_chamber', 'create_chamber',
    'view_announcement', 'create_announcement',
    'manage_members', 'manage_permissions', 'approve_membership',
    'view_activity_log', 'manage_settings', 'manage_treasury'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create index for efficient permission lookups
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);