CREATE TABLE IF NOT EXISTS public.admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admins table is readable by everyone for auth checks, but only modified by service role
CREATE POLICY "Admins are readable by authenticated users" 
ON public.admins FOR SELECT 
TO authenticated 
USING (true);
