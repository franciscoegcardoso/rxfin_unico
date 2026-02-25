
-- Table for storing friendly name rules per store (auto-apply to future imports)
CREATE TABLE public.store_friendly_name_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  normalized_store_name TEXT NOT NULL,
  original_store_name TEXT NOT NULL,
  friendly_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_store_friendly UNIQUE (user_id, normalized_store_name)
);

ALTER TABLE public.store_friendly_name_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendly name rules"
  ON public.store_friendly_name_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own friendly name rules"
  ON public.store_friendly_name_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendly name rules"
  ON public.store_friendly_name_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendly name rules"
  ON public.store_friendly_name_rules FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_store_friendly_name_rules_updated_at
  BEFORE UPDATE ON public.store_friendly_name_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to apply a friendly name rule: saves the rule and updates all matching transactions
CREATE OR REPLACE FUNCTION public.apply_store_friendly_name_rule(
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
  INSERT INTO store_friendly_name_rules (user_id, normalized_store_name, original_store_name, friendly_name)
  VALUES (v_user_id, p_normalized_name, p_original_name, p_friendly_name)
  ON CONFLICT (user_id, normalized_store_name)
  DO UPDATE SET friendly_name = EXCLUDED.friendly_name, original_store_name = EXCLUDED.original_store_name;

  -- Update all matching transactions
  UPDATE credit_card_transactions
  SET friendly_name = p_friendly_name,
      updated_at = now()
  WHERE user_id = v_user_id
    AND normalize_store_name_sql(store_name) ILIKE '%' || p_normalized_name || '%';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;
