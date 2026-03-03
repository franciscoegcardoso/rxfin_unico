-- F6: Consolidar políticas SELECT em pluggy_category_map (RXFin)
-- Supabase project_id: kneaniaifzgqibpajyji, region: sa-east-1
--
-- Problema: Duas políticas SELECT permissivas (Admins + Everyone) são avaliadas
-- para cada linha, dobrando o custo. Solução: uma única política USING (true).
--
-- VALIDAÇÃO PRÉVIA (rodar no SQL Editor antes de aplicar, se quiser):
--   SELECT policyname, roles, cmd, qual
--   FROM pg_policies WHERE tablename = 'pluggy_category_map';
--
-- 1) Remover as duas políticas de SELECT (nomes exatos do Supabase/RLS)
DROP POLICY IF EXISTS "Admins can manage pluggy category map" ON public.pluggy_category_map;
DROP POLICY IF EXISTS "Everyone can read pluggy category map" ON public.pluggy_category_map;

-- 2) Uma única política SELECT: tabela pública de leitura (todos podem ver)
CREATE POLICY "pluggy_category_map_select"
  ON public.pluggy_category_map
  FOR SELECT
  USING (true);

-- 3) INSERT/UPDATE/DELETE: não alteradas nesta migração.
--    Se já existirem políticas restritas a admins (ex.: service_role ou role admin),
--    mantê-las. Caso contrário, criar em migração separada.

-- VALIDAÇÃO PÓS (rodar após aplicar):
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'pluggy_category_map';
--   Esperado: uma linha com cmd = 'SELECT' (pluggy_category_map_select) + eventualmente
--   políticas para INSERT/UPDATE/DELETE apenas para admins.
