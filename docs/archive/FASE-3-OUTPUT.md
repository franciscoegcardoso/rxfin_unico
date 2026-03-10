# Fase 3 — Backend: correções pontuais (tabelas e RPCs) — Output

Documento gerado pela execução da **Fase 3** do plano de refatoração. Descreve as migrações criadas para resolver os itens críticos e de alta prioridade identificados na Fase 2.

---

## Objetivo da Fase 3

Resolver erros conhecidos que quebram a aplicação ou poluem o console: `deletion_audit_log` (404), `page_views` (403 no INSERT), RPC `get_user_profile_settings` (inexistente/timeout) e alinhamento `user_trash` / `asset_trash`.

---

## O que foi feito

### 3.1 Tabela `deletion_audit_log` (e `asset_trash`)

**Arquivo:** `apps/web/supabase/migrations/20260327100000_fase3_deletion_audit_log_and_asset_trash.sql`

- **CREATE TABLE IF NOT EXISTS** para `public.asset_trash` e `public.deletion_audit_log` com a mesma estrutura da migração original (20260108).
- Garante que, em ambientes onde 20260108 não foi aplicada, as tabelas existam e evita 404 (PGRST205) na Lixeira.
- RLS reaplicado de forma idempotente (DROP POLICY IF EXISTS + CREATE POLICY) para ambas as tabelas.
- Para `deletion_audit_log`: política SELECT única (`deletion_audit_log_select`) para usuário ver próprio ou admin ver todos; política INSERT para o próprio `user_id`.

**Resultado:** Lixeira deixa de depender da migração antiga estar aplicada; em envs que já tinham as tabelas, a migração não altera dados.

---

### 3.2 Tabela `page_views` e RLS INSERT

**Arquivo:** `apps/web/supabase/migrations/20260327100001_fase3_page_views.sql`

- **CREATE TABLE IF NOT EXISTS** para `public.page_views` com colunas alinhadas a `integrations/supabase/types.ts`: `id`, `created_at`, `page`, `referrer`, `session_id`, `user_agent`.
- RLS habilitado.
- Política SELECT: apenas admins (`is_admin`), compatível com 20260220032922.
- **Nova política INSERT:** `Allow insert page_views` para **authenticated** e **anon**, com `WITH CHECK (true)`, para que Hub e Simuladores possam registrar page view (com `page` e `session_id`) sem 403.

**Resultado:** INSERT em `page_views` a partir do frontend (simuladores) deixa de retornar 403 após aplicar a migração no ambiente.

---

### 3.3 RPC `get_user_profile_settings`

**Arquivo:** `apps/web/supabase/migrations/20260327100002_fase3_get_user_profile_settings.sql`

- **CREATE OR REPLACE FUNCTION** `public.get_user_profile_settings()`:
  - Retorna **JSONB** no formato esperado pelo frontend: `{ "profile": { "onboarding_completed": boolean | null, "onboarding_completed_at": timestamptz | null } }`.
  - Lê `onboarding_completed` e `onboarding_completed_at` de `public.profiles` para `auth.uid()`.
  - **SECURITY DEFINER** com `SET search_path = public` para leitura segura em `profiles`.
- **GRANT EXECUTE** para `authenticated` e `anon`.

**Resultado:** ProtectedRoute, AuthCallback, useProfileSettings, RaioXChat e demais consumidores passam a ter o RPC disponível no backend; o timeout no frontend continua como fallback se o RPC falhar.

---

### 3.4 View `user_trash` (compatibilidade com `asset_trash`)

**Arquivo:** `apps/web/supabase/migrations/20260327100000_fase3_deletion_audit_log_and_asset_trash.sql`

- **CREATE OR REPLACE VIEW** `public.user_trash` com **security_invoker = true**, fazendo `SELECT` das colunas de `public.asset_trash` (id, user_id, original_id, asset_type, asset_data, linked_data, deleted_at, expires_at, deleted_reason).
- **GRANT SELECT** em `user_trash` para `authenticated` e `anon`.
- O frontend continua usando `supabase.from('user_trash')`; a view delega ao RLS de `asset_trash`.

**Resultado:** Não é necessário alterar o frontend para `asset_trash`; a view garante compatibilidade com o código atual.

---

## Resumo dos arquivos criados

| Migração | Conteúdo |
|----------|----------|
| `20260327100000_fase3_deletion_audit_log_and_asset_trash.sql` | asset_trash e deletion_audit_log IF NOT EXISTS + RLS; view user_trash |
| `20260327100001_fase3_page_views.sql` | page_views IF NOT EXISTS + RLS SELECT (admins) + INSERT (auth + anon) |
| `20260327100002_fase3_get_user_profile_settings.sql` | RPC get_user_profile_settings() + GRANT EXECUTE |

---

## Critérios de validação Fase 3

- [x] **Lixeira:** Tabelas e view criadas por migração; tratamento de PGRST205 no frontend permanece como fallback.
- [x] **page_views:** Tabela e política de INSERT adicionadas; após aplicar a migração, o insert não deve retornar 403.
- [x] **get_user_profile_settings:** RPC criado e com permissões; onboarding e auth podem usar o RPC; timeout no frontend mantido como fallback.
- [x] **user_trash:** View criada sobre asset_trash; frontend segue usando `user_trash` sem alteração.

---

## Como aplicar

No projeto Supabase ligado a `apps/web` (ou ao mesmo projeto que usa `apps/web/supabase/migrations`):

1. Aplicar as migrações (ex.: `supabase db push` ou deploy pelo painel).
2. Confirmar que não há 404 em `deletion_audit_log`, que o INSERT em `page_views` retorna 2xx e que `get_user_profile_settings()` retorna JSON com `profile.onboarding_completed`.

---

## Observações

- **deletion_audit_log / asset_trash:** Em ambientes que já tinham a migração 20260108 aplicada, `CREATE TABLE IF NOT EXISTS` não altera nada; apenas garante existência em ambientes que não a tinham.
- **page_views:** Se a tabela já existir com outra definição (ex.: em outro schema), pode ser necessário ajustar a migração ou unificar definições antes de aplicar.
- **get_user_profile_settings:** Se no futuro existir outra fonte de “profile settings” (ex.: tabela `onboarding_state`), o RPC pode ser alterado para ler dessa fonte mantendo o mesmo contrato de retorno.

Próximo passo sugerido: **Fase 4** (schemas e convenções) ou **Fase 5** (banco de dados: página e grupos do menu), conforme o plano principal.
