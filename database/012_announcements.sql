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
