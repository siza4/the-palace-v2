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
