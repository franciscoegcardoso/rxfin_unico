# AUDITORIA P0-6: service_role key no frontend

**Data:** 2026-03  
**Projeto:** rxfin_unico

---

## PASSO 1 — Busca por termos proibidos

Busca global por: `service_role`, `SERVICE_ROLE`, `serviceRole`, `SUPABASE_SERVICE`, `service_key`

### ✅ PERMITIDO (sem ação)

| Local | Motivo |
|-------|--------|
| `supabase/functions/**` e `apps/web/supabase/functions/**` | Edge Functions rodam server-side (Deno), nunca no browser |
| `supabase/functions/__tests__/helpers.ts` | Testes server-side |
| `CONTEXT.md` | Documentação |
| `apps/web/src/components/admin/architecture/architectureData.ts` (linha 37) | Texto de checklist: "Confirmar que service_role key NÃO está no frontend" — não é a key, é descrição do item |
| `apps/web/dist/**` | Build output; contém o mesmo texto do checklist (string de UI), não a key |

### ❌ PROIBIDO

Nenhum arquivo em `apps/web/src/`, `apps/landing/src/` ou `apps/mobile/` utiliza ou expõe a service_role key.

---

## PASSO 2 — Clientes Supabase no frontend

| Arquivo | Key usada | autoRefreshToken | detectSessionInUrl |
|---------|-----------|------------------|---------------------|
| `apps/web/src/integrations/supabase/client.ts` | anon (VITE_SUPABASE_ANON_KEY ou fallback anon hardcoded) | ✅ true | ✅ true |
| `apps/web/src/integrations/client.ts` | anon (NEXT_PUBLIC_* ou fallback anon) | ✅ true | ✅ true |
| `apps/landing/src/integrations/supabase/client.ts` | publishable/anon hardcoded | ✅ true | ✅ true (ajustado) |
| `apps/mobile/lib/supabase.ts` | EXPO_PUBLIC_SUPABASE_ANON_KEY (anon) | ✅ true | false (correto para native) |

Nenhum segundo client com service_role no frontend.

---

## PASSO 3 — Arquivos .env

- `git ls-files | grep .env`: apenas `apps/landing/.env.example` e `apps/web/.env.example` (sem segredos).
- Nenhum `.env` ou `.env.local` commitado.
- Nenhuma variável `VITE_*SERVICE_ROLE*` encontrada no projeto.
- `apps/web/.env.example` contém apenas comentário educativo: `# SUPABASE_SERVICE_ROLE_KEY=NUNCA_COLOQUE_AQUI_NO_CLIENT`.

---

## PASSO 4 — .gitignore

Padrões presentes/ajustados:

- `.env`
- `.env.local`
- `.env.*` (adicionado para cobrir .env.development, .env.production, etc.)
- `.env*.local`
- `.env.*.local`

---

## PASSO 5 — P0-8 autoRefreshToken

| Arquivo | autoRefreshToken |
|---------|------------------|
| apps/web/src/integrations/supabase/client.ts | ✅ true |
| apps/web/src/integrations/client.ts | ✅ true |
| apps/landing/src/integrations/supabase/client.ts | ✅ true |
| apps/mobile/lib/supabase.ts | ✅ true |

---

## CONCLUSÃO

**service_role key:** NÃO EXPOSTA no frontend ✅  

**Ações realizadas:**

1. **.gitignore:** Inclusão do padrão `.env.*` para cobrir todos os arquivos `.env.*` (ex.: `.env.development`, `.env.production`).
2. **Landing client:** Inclusão de `detectSessionInUrl: true` nas opções de auth para alinhar com OAuth (login Google) e boas práticas.

Nenhuma exposição da service_role key foi encontrada no frontend. Uso de service_role permanece restrito a Edge Functions (server-side).
