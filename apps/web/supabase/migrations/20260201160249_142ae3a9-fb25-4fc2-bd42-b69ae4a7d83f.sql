-- Add phone and status fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for valid status values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'active', 'suspended'));

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update existing users to active status (they're already confirmed)
UPDATE public.profiles SET status = 'active' WHERE status = 'pending';