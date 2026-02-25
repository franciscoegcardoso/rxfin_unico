
-- Table to store user's customized home quick action shortcuts
CREATE TABLE public.user_home_shortcuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Store the slugs for customizable slots (positions 3 and 4; positions 1-2 are fixed)
  slot_3 TEXT NOT NULL DEFAULT 'planejamento',
  slot_4 TEXT, -- null means auto-select from priority list
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_home_shortcuts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own shortcuts"
  ON public.user_home_shortcuts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shortcuts"
  ON public.user_home_shortcuts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shortcuts"
  ON public.user_home_shortcuts FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_home_shortcuts_updated_at
  BEFORE UPDATE ON public.user_home_shortcuts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
