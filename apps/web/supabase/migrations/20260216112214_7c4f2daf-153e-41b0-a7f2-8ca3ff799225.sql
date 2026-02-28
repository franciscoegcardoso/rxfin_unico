
-- Add friendly_name column to lancamentos_realizados
ALTER TABLE public.lancamentos_realizados 
ADD COLUMN friendly_name TEXT DEFAULT NULL;

-- Create table for lancamento friendly name rules (similar to store_friendly_name_rules)
CREATE TABLE IF NOT EXISTS public.lancamento_friendly_name_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  normalized_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  friendly_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, normalized_name)
);

-- Enable RLS
ALTER TABLE public.lancamento_friendly_name_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own rules"
  ON public.lancamento_friendly_name_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
  ON public.lancamento_friendly_name_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON public.lancamento_friendly_name_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON public.lancamento_friendly_name_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_lancamento_friendly_name_rules_updated_at
  BEFORE UPDATE ON public.lancamento_friendly_name_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to apply a friendly name rule: saves rule + updates all matching lancamentos
CREATE OR REPLACE FUNCTION public.apply_lancamento_friendly_name_rule(
  p_normalized_name TEXT,
  p_original_name TEXT,
  p_friendly_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated int;
BEGIN
  -- Upsert the rule
  INSERT INTO lancamento_friendly_name_rules (user_id, normalized_name, original_name, friendly_name)
  VALUES (v_user_id, p_normalized_name, p_original_name, p_friendly_name)
  ON CONFLICT (user_id, normalized_name)
  DO UPDATE SET friendly_name = EXCLUDED.friendly_name, original_name = EXCLUDED.original_name;

  -- Update all matching lancamentos
  UPDATE lancamentos_realizados
  SET friendly_name = p_friendly_name,
      updated_at = now()
  WHERE user_id = v_user_id
    AND lower(trim(nome)) = lower(trim(p_normalized_name));

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;
