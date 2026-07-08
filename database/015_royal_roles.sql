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
