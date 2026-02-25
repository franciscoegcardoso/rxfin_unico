-- Cache para dados de siblings FIPE (reduz chamadas à API)
CREATE TABLE public.fipe_sibling_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fipe_code TEXT NOT NULL,
  model_year INTEGER NOT NULL,
  sibling_years INTEGER[] NOT NULL,
  avg_monthly_decay_rate NUMERIC,
  samples_used INTEGER NOT NULL DEFAULT 0,
  pandemic_filtered BOOLEAN NOT NULL DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  
  -- Unique constraint para evitar duplicatas
  CONSTRAINT fipe_sibling_cache_unique UNIQUE (fipe_code, model_year)
);

-- Index para buscas rápidas
CREATE INDEX idx_fipe_sibling_cache_lookup ON public.fipe_sibling_cache (fipe_code, model_year);
CREATE INDEX idx_fipe_sibling_cache_expires ON public.fipe_sibling_cache (expires_at);

-- RLS: Cache é público (apenas leitura anônima, escrita via service role)
ALTER TABLE public.fipe_sibling_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is readable by everyone"
ON public.fipe_sibling_cache
FOR SELECT
USING (true);

-- Comentário explicativo
COMMENT ON TABLE public.fipe_sibling_cache IS 'Cache de longo prazo para análise de coorte FIPE. Expira em 30 dias.';