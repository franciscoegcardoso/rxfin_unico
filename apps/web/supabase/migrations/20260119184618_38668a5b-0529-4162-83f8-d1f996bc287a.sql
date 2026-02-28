-- Create table for FGTS monthly movements (deposits and yields)
CREATE TABLE public.fgts_monthly_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  previous_balance NUMERIC(15,2) DEFAULT 0,
  deposit NUMERIC(15,2) DEFAULT 0,
  yield NUMERIC(15,2) DEFAULT 0,
  final_balance NUMERIC(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_id, month)
);

-- Enable RLS
ALTER TABLE public.fgts_monthly_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own FGTS entries"
ON public.fgts_monthly_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FGTS entries"
ON public.fgts_monthly_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FGTS entries"
ON public.fgts_monthly_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FGTS entries"
ON public.fgts_monthly_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_fgts_monthly_entries_updated_at
BEFORE UPDATE ON public.fgts_monthly_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();