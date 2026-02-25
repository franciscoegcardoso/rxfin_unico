-- Create trash bin table for soft-deleted assets
CREATE TABLE public.asset_trash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_data JSONB NOT NULL,
  linked_data JSONB DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  deleted_reason TEXT
);

-- Enable RLS
ALTER TABLE public.asset_trash ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own trash" ON public.asset_trash FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trash" ON public.asset_trash FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trash" ON public.asset_trash FOR DELETE USING (auth.uid() = user_id);

-- Create audit log table for tracking deletions
CREATE TABLE public.deletion_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  linked_records_deleted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own audit logs" ON public.deletion_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own audit logs" ON public.deletion_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);