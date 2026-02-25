-- Create table for tour analytics
CREATE TABLE public.tour_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'step_viewed', 'skipped', 'completed')),
  step_index INTEGER,
  step_target TEXT,
  total_steps INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  is_mobile BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.tour_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own analytics
CREATE POLICY "Users can insert own tour analytics"
ON public.tour_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own analytics
CREATE POLICY "Users can view own tour analytics"
ON public.tour_analytics
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_tour_analytics_user_id ON public.tour_analytics(user_id);
CREATE INDEX idx_tour_analytics_event_type ON public.tour_analytics(event_type);
CREATE INDEX idx_tour_analytics_created_at ON public.tour_analytics(created_at DESC);