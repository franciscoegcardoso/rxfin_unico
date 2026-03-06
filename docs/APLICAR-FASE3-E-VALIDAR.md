# Aplicar migrações Fase 3 e validar

O `supabase db push` falhou porque o **remoto** tem 24 migrações (20260303*, 20260304*) que **não existem** no repositório local — o histórico de migrações está divergente. Para aplicar apenas as alterações da **Fase 3** sem mexer nesse histórico, use uma das opções abaixo.

---

## Opção A — Aplicar pelo SQL Editor (recomendado)

1. Abra o **Supabase Dashboard** do projeto (project_id: `kneaniaifzgqibpajyji`).
2. Vá em **SQL Editor** → **New query**.
3. Copie todo o conteúdo do arquivo:
   ```
   apps/web/supabase/migrations/APPLY_FASE3_MANUAL.sql
   ```
4. Cole no editor e clique em **Run** (ou Ctrl+Enter).
5. Confirme que a execução termina **sem erro** (todas as instruções em verde).

---

## Opção B — Reparar histórico e dar push (avançado)

Se quiser alinhar o histórico do remoto ao local (e aceitar marcar as 24 migrações “só no remoto” como revertidas):

```bash
cd apps/web
npx supabase migration repair --status reverted 20260303230436 20260303231757 20260303232405 20260303233010 20260303233331 20260303234055 20260303234135 20260303234143 20260304001039 20260304001155 20260304001230 20260304001259 20260304001946 20260304002029 20260304002134 20260304004657 20260304004726 20260304004734 20260304010051 20260304010105 20260304012029 20260304012342 20260304012401 20260304012730 20260304215602 20260304215812 20260304215851
npx supabase db push --linked
```

**Atenção:** isso não desfaz alterações já aplicadas no DB pelas 24 migrações; apenas ajusta a tabela de histórico. O `db push` em seguida tentará aplicar **todas** as migrações locais na ordem; se o schema remoto já estiver parecido com o do repo, várias podem dar “object already exists”. Use só se souber o que está fazendo.

---

## Validação após aplicar (Opção A ou B)

Execute no **SQL Editor** ou via CLI.

### 1. Tabelas e view

```sql
-- Devem retornar 1 linha cada (existem)
SELECT 'deletion_audit_log' AS obj, count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_audit_log'
UNION ALL
SELECT 'asset_trash', count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_trash'
UNION ALL
SELECT 'page_views', count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_views'
UNION ALL
SELECT 'user_trash (view)', count(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_trash';
```

Esperado: as quatro linhas com `count = 1`.

### 2. RPC get_user_profile_settings

```sql
SELECT public.get_user_profile_settings();
```

- **Sem usuário (anon):** deve retornar algo como `{"profile": null}`.
- **Autenticado:** faça login no app e, no SQL Editor com “Run as user” (se existir) ou via uma chamada do app, a resposta deve ser `{"profile": {"onboarding_completed": true|false, "onboarding_completed_at": ...}}`.

### 3. INSERT em page_views (simular app)

```sql
-- Como anon ou authenticated; deve completar sem erro 403
INSERT INTO public.page_views (page, session_id) VALUES ('/test-fase3', 'test-session-' || gen_random_uuid()::text);
```

Depois pode apagar: `DELETE FROM public.page_views WHERE page = '/test-fase3';`

### 4. No frontend (validação manual)

- **Lixeira:** abrir a tela da Lixeira — não deve aparecer erro 404 no console (deletion_audit_log / user_trash).
- **Simuladores:** abrir Hub ou Simulador FIPE — no Network, o POST para `page_views` deve retornar **201** (ou 2xx), não 403.
- **Onboarding / Início:** fazer login e acessar `/inicio` — a página deve carregar sem travar; no Network, a chamada a `get_user_profile_settings` deve retornar 200 e JSON com `profile.onboarding_completed`.

---

## Resumo

| O que fazer | Onde |
|-------------|------|
| Aplicar SQL da Fase 3 | Dashboard → SQL Editor → colar `APPLY_FASE3_MANUAL.sql` → Run |
| Validar tabelas/view | SQL Editor: query de `information_schema` acima |
| Validar RPC | SQL Editor: `SELECT public.get_user_profile_settings();` |
| Validar INSERT page_views | SQL Editor: INSERT de teste acima |
| Validar no app | Lixeira, Simuladores, Login/Início (console e Network) |

Se algo falhar, confira mensagens de erro no SQL Editor e no console/Network do navegador e ajuste permissões (RLS) ou existência de funções (ex.: `is_admin`) conforme o seu projeto.
