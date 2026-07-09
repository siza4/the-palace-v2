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
