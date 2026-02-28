-- Create a function to check if user is a global admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Create the simulators table
CREATE TABLE public.simulators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  access_level text NOT NULL DEFAULT 'public',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulators ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Anyone can read simulators"
ON public.simulators
FOR SELECT
USING (true);

-- Policy: Only admins can insert
CREATE POLICY "Admins can insert simulators"
ON public.simulators
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Policy: Only admins can update
CREATE POLICY "Admins can update simulators"
ON public.simulators
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Policy: Only admins can delete
CREATE POLICY "Admins can delete simulators"
ON public.simulators
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_simulators_updated_at
BEFORE UPDATE ON public.simulators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();