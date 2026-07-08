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
