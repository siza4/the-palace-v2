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
