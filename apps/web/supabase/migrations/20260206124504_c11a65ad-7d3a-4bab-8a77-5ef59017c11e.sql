
-- Tabela de controle de sincronização FIPE
CREATE TABLE public.fipe_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,          -- 'references', 'catalog', 'prices', 'monthly'
  vehicle_type SMALLINT,            -- 1=carros, 2=motos, 3=caminhoes
  ref_code INTEGER,                 -- tabela de referencia processada
  batch_key TEXT,                   -- identificador do lote (ex: 'brand_21')
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',    -- 'pending', 'running', 'completed', 'error'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB
);

-- Indices para performance
CREATE INDEX idx_fipe_sync_type_status ON public.fipe_sync_log(sync_type, status);
CREATE INDEX idx_fipe_sync_ref ON public.fipe_sync_log(ref_code);
CREATE INDEX idx_fipe_sync_batch ON public.fipe_sync_log(sync_type, batch_key);

-- RLS: apenas admins podem ler/escrever (via service_role nas edge functions)
ALTER TABLE public.fipe_sync_log ENABLE ROW LEVEL SECURITY;

-- Política para admins lerem logs de sync
CREATE POLICY "Admins can read sync logs"
  ON public.fipe_sync_log FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Edge functions usam service_role, então não precisam de policy para INSERT/UPDATE
-- Mas adicionamos para admins poderem gerenciar via dashboard
CREATE POLICY "Admins can manage sync logs"
  ON public.fipe_sync_log FOR ALL
  USING (public.is_admin(auth.uid()));
