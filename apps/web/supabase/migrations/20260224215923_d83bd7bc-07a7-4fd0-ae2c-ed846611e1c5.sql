
-- Table for storing user key-value data (replaces localStorage)
CREATE TABLE public.user_kv_store (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- RLS
ALTER TABLE public.user_kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own kv data"
  ON public.user_kv_store FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kv data"
  ON public.user_kv_store FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kv data"
  ON public.user_kv_store FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kv data"
  ON public.user_kv_store FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_kv_store_updated_at
  BEFORE UPDATE ON public.user_kv_store
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_user_kv_store_user_key ON public.user_kv_store(user_id, key);
