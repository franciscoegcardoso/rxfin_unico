-- Create table for user feature preferences per workspace
CREATE TABLE public.workspace_feature_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_slug TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_slug)
);

-- Enable RLS
ALTER TABLE public.workspace_feature_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own feature preferences"
ON public.workspace_feature_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own feature preferences"
ON public.workspace_feature_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own feature preferences"
ON public.workspace_feature_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own feature preferences"
ON public.workspace_feature_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workspace_feature_preferences_updated_at
BEFORE UPDATE ON public.workspace_feature_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();