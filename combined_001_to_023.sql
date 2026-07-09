-- Migration 001: Members (RECONSTRUCTED)
-- The original 001_members.sql committed to the repo was empty (0 bytes).
-- This table clearly exists and is in active use (queried throughout
-- lib/services/member.service.js, lib/engine/admission.js, entry.js, etc.)
-- so it was almost certainly created directly via the Supabase dashboard
-- rather than through a committed migration. Reconstructed here from
-- observed application usage so the schema is reproducible from source.
--
-- If your live schema differs from this, run:
--   pg_dump --schema-only -t members <connection>
-- and reconcile before applying.

CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    royal_id text UNIQUE NOT NULL,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    country text,
    membership_level text DEFAULT 'Citizen',
    status text DEFAULT 'Pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public reads are limited to what later migrations (see 021, and the
-- application-layer PUBLIC_FIELDS selection in app/identity/[id]/page.js)
-- treat as safe. RLS here intentionally does NOT grant blanket anon SELECT --
-- full_name and email are legal identity per the Charter Appendix and must
-- stay server-side / service-role only.
CREATE POLICY "Members can read their own record"
ON public.members
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = email);

CREATE INDEX IF NOT EXISTS idx_members_royal_id ON public.members(royal_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
-- Migration 002: Royal Passes (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/services/pass.service.js usage.

CREATE TABLE IF NOT EXISTS public.royal_passes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    qr_data text NOT NULL,
    barcode_data text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.royal_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own pass"
ON public.royal_passes
FOR SELECT
TO authenticated
USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email')
);

CREATE INDEX IF NOT EXISTS idx_royal_passes_member_id ON public.royal_passes(member_id);
-- Migration 003: Notifications (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/engine/notifications.js usage.

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text,
    type text DEFAULT 'system',
    priority text DEFAULT 'normal',
    icon text DEFAULT '🔔',
    action_url text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email')
);

CREATE INDEX IF NOT EXISTS idx_notifications_member_id ON public.notifications(member_id);
-- Migration 004: Activity Logs (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/engine/activity.js usage. This is the audit-trail
-- table the Charter (21.13) requires behind every sensitive action.

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
    action text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- No public read policy — activity logs are an internal audit trail.
-- Access is service-role only (Butler's Office tooling), never anon/authenticated.

CREATE INDEX IF NOT EXISTS idx_activity_logs_member_id ON public.activity_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
-- Migration 005: Member Profiles (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/services/profile.service.js and lib/engine/profile.js.

CREATE TABLE IF NOT EXISTS public.member_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name text,
    royal_title text DEFAULT 'Citizen',
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of display profile fields"
ON public.member_profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON public.member_profiles(member_id);
-- Migration 006: Memberships (SUPERSEDED)
-- Original file was empty. No code in the repo references a "memberships"
-- table directly — the concept was fully rebuilt in migrations 017-021
-- (membership_plans, subscriptions, and the access_level/membership_status
-- columns added to members). This migration is kept as a placeholder for
-- historical numbering only. No table is created here.
-- Migration 007: Permissions (SUPERSEDED)
-- Original file was empty. The permissions system was fully built in
-- migration 019_permissions.sql (permissions + role_permissions tables).
-- This migration is kept as a placeholder for historical numbering only.
-- No table is created here.
alter table notifications
add column if not exists priority text default 'normal';

alter table notifications
add column if not exists icon text default '🔔';

alter table notifications
add column if not exists action_url text;

alter table notifications
add column if not exists expires_at timestamptz;
create table if not exists activity_logs (

    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete cascade,

    action text not null,

    description text,

    metadata jsonb default '{}'::jsonb,

    created_at timestamptz default now()

);
create table if not exists member_profiles (

    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete cascade,

    display_name text,

    royal_title text default 'Citizen',

    bio text,

    avatar_url text,

    language text default 'English',

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);
ALTER TABLE members
ADD COLUMN IF NOT EXISTS royal_office text DEFAULT 'Observer';


ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'ACTIVE';
CREATE TABLE IF NOT EXISTS public.announcements (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    title text NOT NULL,

    message text NOT NULL,

    issued_by text DEFAULT 'The Palace',

    required_office text DEFAULT 'Observer',

    created_at timestamp with time zone DEFAULT now()

);


ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow public read announcements"

ON public.announcements

FOR SELECT

TO anon

USING (true);
CREATE TABLE public.chambers (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    name text NOT NULL,

    description text,

    required_office text DEFAULT 'Royal Member',

    created_at timestamp with time zone DEFAULT now()

);



CREATE TABLE public.member_chambers (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,

    chamber_id uuid REFERENCES public.chambers(id) ON DELETE CASCADE,

    access_level text DEFAULT 'Member',

    created_at timestamp with time zone DEFAULT now()

);



ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.member_chambers ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Allow public read chambers"

ON public.chambers

FOR SELECT

TO anon

USING (true);



CREATE POLICY "Allow public read member chambers"

ON public.member_chambers

FOR SELECT

TO anon

USING (true);
CREATE TABLE IF NOT EXISTS public.chamber_posts (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    chamber_id uuid REFERENCES public.chambers(id) ON DELETE CASCADE,

    title text NOT NULL,

    content text NOT NULL,

    issued_by text DEFAULT 'Royal Council',

    created_at timestamp with time zone DEFAULT now()

);



ALTER TABLE public.chamber_posts ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Allow chamber posts read"

ON public.chamber_posts

FOR SELECT

TO anon

USING (true);
CREATE TABLE IF NOT EXISTS public.royal_roles (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    name text UNIQUE NOT NULL,

    description text,

    created_at timestamp with time zone DEFAULT now()

);



INSERT INTO public.royal_roles
(
name,
description
)

VALUES

(
'Royal Member',
'Recognised member of The Palace'
),

(
'Royal Council',
'Authority responsible for Palace decisions'
),

(
'Palace Authority',
'Full administrative authority'
);



ALTER TABLE public.royal_roles ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Allow public read royal roles"

ON public.royal_roles

FOR SELECT

TO anon

USING (true);
CREATE TABLE IF NOT EXISTS public.member_roles (

    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,

    role_id uuid REFERENCES public.royal_roles(id) ON DELETE CASCADE,

    created_at timestamp with time zone DEFAULT now()

);



ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Allow public read member roles"

ON public.member_roles

FOR SELECT

TO anon

USING (true);
-- Migration 017: Membership Plans
-- Creates the foundation for tiered membership offerings

CREATE TABLE IF NOT EXISTS public.membership_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    price numeric(10, 2),
    billing_period text DEFAULT 'month',
    access_level integer DEFAULT 1,
    requires_approval boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read membership plans"
ON public.membership_plans
FOR SELECT
TO anon
USING (active = true);

-- Insert default membership tiers
INSERT INTO public.membership_plans
(name, description, price, billing_period, access_level, requires_approval, active)
VALUES
('Royal Visitor', 'Browse and observe The Palace', 0.00, 'lifetime', 1, false, true),
('Royal Member', 'Full member access to chambers and announcements', 9.99, 'month', 2, false, true),
('Royal Circle', 'Inner circle access with special privileges', 29.99, 'month', 3, true, true),
('Royal Council', 'Council authority and decision-making power', 99.99, 'month', 4, true, true),
('Palace Authority', 'Full administrative control', 299.99, 'month', 5, true, true);-- Migration 018: Subscriptions
-- Tracks member subscriptions to membership plans

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.membership_plans(id) ON DELETE RESTRICT NOT NULL,
    status text DEFAULT 'pending',
    started_at timestamp with time zone,
    expires_at timestamp with time zone,
    payment_status text DEFAULT 'unpaid',
    stripe_subscription_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read subscriptions"
ON public.subscriptions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated users read own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Index for common queries
CREATE INDEX idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);-- Migration 019: Permissions System
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
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);-- Migration 020: Approval Requests
-- Tracks membership applications requiring approval

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.membership_plans(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending',
    reason text,
    requested_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    decided_by uuid REFERENCES public.members(id),
    decision_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read approval requests"
ON public.approval_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated users read own requests"
ON public.approval_requests
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Index for efficient queries
CREATE INDEX idx_approval_requests_member_id ON public.approval_requests(member_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_requested_at ON public.approval_requests(requested_at);-- Migration 021: Alter Members Table
-- Add subscription and membership references to members

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS membership_plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS access_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'pending';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_members_access_level ON public.members(access_level);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON public.members(membership_status);-- Migration 022: Royal Standing System
-- Implements Charter Vol II Ch5 / Vol II Ch12 (§12.14 "The Golden Membership Rule":
-- Membership creates belonging. Standing creates recognition. Offices create
-- responsibility. Never combine these into one simple "role" field.)
--
-- This is deliberately independent of membership_plans/subscriptions.
-- membership_plans/access_level = what you're paying for (product/Chamber access).
-- standing = your earned institutional relationship (Visitor/Member/Circle/
-- Council/Authority), which per §12.10 advances on
-- Contribution + Time + Trust + Responsibility — never on payment alone.

CREATE TABLE IF NOT EXISTS public.standing_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    rank integer UNIQUE NOT NULL, -- ordering only, not a numeric "power level"
    description text,
    auto_grantable boolean DEFAULT false, -- true only for Visitor/Member (§12.4)
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.standing_levels (name, rank, description, auto_grantable) VALUES
('Visitor Standing', 0, 'Discovered The Palace but has not entered membership. Views the entrance, not the institution.', true),
('Member Standing', 1, 'The foundation. First recognised relationship — Royal Identity, Throne, Member Chambers, official communication.', true),
('Circle Standing', 2, 'Deeper participation, considering continued membership, contribution history, participation quality, institutional trust.', false),
('Council Standing', 3, 'Institutional responsibility. Requires history, demonstrated responsibility, and appointment approval — never purchased.', false),
('Authority Standing', 4, 'Institutional guardianship. Requires appointment, trust, proven responsibility, and understanding of the Charter.', false)
ON CONFLICT (name) DO NOTHING;

-- A member's current Standing. One row per member — Standing is a state,
-- not a log (history lives in standing_history below).
CREATE TABLE IF NOT EXISTS public.member_standing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL UNIQUE,
    standing_level_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    status text DEFAULT 'active', -- active, suspended (§12.12 — preserves history, not deletion)
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid REFERENCES public.members(id), -- null when auto-granted (Visitor/Member)
    grant_method text DEFAULT 'automatic', -- automatic | review | appointment
    notes text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Full history of Standing changes — grants, suspensions, restorations.
-- Distinct from activity_logs: this is the institutional record of the
-- relationship itself (§12.4 "Institutional History"), not a generic action log.
CREATE TABLE IF NOT EXISTS public.standing_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    from_standing_id uuid REFERENCES public.standing_levels(id),
    to_standing_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    change_type text NOT NULL, -- granted | advanced | suspended | restored
    changed_by uuid REFERENCES public.members(id),
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- Requests to advance Standing (Circle/Council/Authority). Deliberately
-- separate from approval_requests (which governs membership_plans/product
-- access) — Standing advancement is a Charter-governed institutional
-- decision, not a plan upgrade, even though both flow through review.
CREATE TABLE IF NOT EXISTS public.standing_advancement_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    requested_standing_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    reason text,
    status text DEFAULT 'pending', -- pending | approved | rejected
    requested_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    decided_by uuid REFERENCES public.members(id),
    decision_notes text
);

ALTER TABLE public.standing_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_standing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_advancement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of standing levels"
ON public.standing_levels FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Members read their own standing"
ON public.member_standing FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Members read their own standing history"
ON public.standing_history FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Members read their own advancement requests"
ON public.standing_advancement_requests FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

-- New permission specifically for Standing decisions — distinct from
-- approve_membership (plan/product access), per the Golden Membership Rule.
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_standing', 'Grant, advance, suspend, or restore a member''s Standing', 'member_management')
ON CONFLICT (name) DO NOTHING;

-- Only Palace Authority holds this by default — matches §7.29 "Authority
-- Standing... requires appointment, trust, proven responsibility."
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name = 'manage_standing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_member_standing_member_id ON public.member_standing(member_id);
CREATE INDEX IF NOT EXISTS idx_standing_history_member_id ON public.standing_history(member_id);
CREATE INDEX IF NOT EXISTS idx_standing_advancement_status ON public.standing_advancement_requests(status);
-- Migration 023: Royal Offices System
-- Implements Charter Vol II Ch6: "Offices represent responsibility. A person
-- does not simply receive a badge. They receive a function."
--
-- Previously: members.royal_office was a single free-text column defaulting
-- to 'Observer' — not even one of the Charter-defined Offices, no purpose,
-- no assignment record, no revocation, nothing stopping a member from
-- holding multiple functions or losing them without a trace.

CREATE TABLE IF NOT EXISTS public.offices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    purpose text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.offices (name, purpose) VALUES
('Royal Member Office', 'Represent ordinary institutional membership.'),
('Council Office', 'Provide advisory participation.'),
('Admissions Office', 'Review and manage admission processes.'),
('Treasury Office', 'Maintain financial operations.'),
('Butler''s Office', 'Administrative management of Palace operations.'),
('Authority Office', 'Protect institutional standards.')
ON CONFLICT (name) DO NOTHING;

-- A member may hold zero or more Offices simultaneously (e.g. a Council
-- member appointed to also serve Admissions). Each assignment is its own
-- auditable record — Offices are revocable without deleting history.
CREATE TABLE IF NOT EXISTS public.member_offices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    office_id uuid REFERENCES public.offices(id) NOT NULL,
    active boolean DEFAULT true,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid REFERENCES public.members(id),
    revoked_at timestamp with time zone,
    revoked_by uuid REFERENCES public.members(id),
    notes text,
    UNIQUE(member_id, office_id)
);

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of office definitions"
ON public.offices FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Members read their own office assignments"
ON public.member_offices FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

-- Office assignment is a sensitive institutional action, distinct from
-- Standing (recognition) and Permissions (granular grants). Per Charter
-- 21.13: "No user can... grant themselves Office."
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_offices', 'Assign or revoke a member''s Office', 'member_management')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name = 'manage_offices'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_member_offices_member_id ON public.member_offices(member_id);
CREATE INDEX IF NOT EXISTS idx_member_offices_office_id ON public.member_offices(office_id);
CREATE INDEX IF NOT EXISTS idx_member_offices_active ON public.member_offices(active);

-- members.royal_office is kept as a cached display convenience only
-- (e.g. for the identity card) — member_offices is now the source of
-- truth. A trigger keeps the cache roughly in sync with the member's
-- most recently assigned active Office.
CREATE OR REPLACE FUNCTION public.sync_royal_office_cache()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.members
    SET royal_office = (
        SELECT o.name
        FROM public.member_offices mo
        JOIN public.offices o ON o.id = mo.office_id
        WHERE mo.member_id = COALESCE(NEW.member_id, OLD.member_id)
          AND mo.active = true
        ORDER BY mo.assigned_at DESC
        LIMIT 1
    )
    WHERE id = COALESCE(NEW.member_id, OLD.member_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_royal_office_cache ON public.member_offices;
CREATE TRIGGER trg_sync_royal_office_cache
AFTER INSERT OR UPDATE OR DELETE ON public.member_offices
FOR EACH ROW EXECUTE FUNCTION public.sync_royal_office_cache();

-- manage_treasury permission, added alongside Offices since Treasury
-- Office (Chapter 6) is the Office this permission conceptually belongs
-- to. Granted to Palace Authority by default only — refunds are
-- financial-integrity-sensitive.
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_treasury', 'Issue refunds and manage Treasury operations', 'admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name = 'manage_treasury'
ON CONFLICT (role_id, permission_id) DO NOTHING;
