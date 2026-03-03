-- =============================================================================
-- F6: Consolidar políticas SELECT em pluggy_category_map — EXECUTAR NO SQL EDITOR
-- Supabase: kneaniaifzgqibpajyji (sa-east-1)
-- Colar este bloco inteiro no SQL Editor e rodar.
-- =============================================================================

-- 1) Listar políticas atuais (antes)
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pluggy_category_map';

-- 2) Remover as duas políticas de SELECT
DROP POLICY IF EXISTS "Admins can manage pluggy category map" ON public.pluggy_category_map;
DROP POLICY IF EXISTS "Everyone can read pluggy category map" ON public.pluggy_category_map;

-- 3) Uma única política SELECT (todos podem ler)
CREATE POLICY "pluggy_category_map_select"
  ON public.pluggy_category_map
  FOR SELECT
  USING (true);

-- 4) INSERT/UPDATE/DELETE: não alteradas (mantidas para admins se já existirem).

-- 5) Confirmar políticas após alteração
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'pluggy_category_map';
