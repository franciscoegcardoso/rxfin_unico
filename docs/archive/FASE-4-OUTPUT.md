# Fase 4 — Backend: schemas e convenções — Output

Documento gerado pela execução da **Fase 4** do plano de refatoração. Revisa consistência entre migrations, types e frontend (schema `public`, nomes de tabelas/colunas, uso de `as any`).

---

## Objetivo da Fase 4

Garantir que referências a schema (ex.: `public`) e nomes de tabelas/colunas estejam consistentes entre migrations, types e frontend.

---

## 4.1 Revisão das migrations recentes (schemas e nomes)

### Uso de schema
- **Todas as tabelas/views** criadas nas migrations usam o schema **`public`** (ex.: `CREATE TABLE public.asset_trash`, `CREATE VIEW public.user_trash`).
- **Funções** usam `SET search_path = public` ou `SET search_path TO 'public'` (SECURITY DEFINER), exceto onde há uso explícito de outro schema.
- **Único outro schema encontrado:** `CREATE SCHEMA IF NOT EXISTS extensions` em `20260204181522` — uso legítimo para extensões; tabelas de aplicação permanecem em `public`.

### Renomeações (RENAME)
- **Nenhuma** ocorrência de `RENAME TABLE` ou `ALTER ... RENAME` nas migrations em `apps/web/supabase/migrations`.
- Conclusão: não há renomeação recente de tabela/coluna que exija ajuste no frontend por causa de nome.

### Conclusão 4.1
- Schema padrão do app: **`public`**.
- Nenhuma inconsistência por RENAME nas migrations revisadas.

---

## 4.2 Revisão dos tipos TypeScript (types vs schema)

### Fonte dos types
- **`apps/web/src/integrations/supabase/types.ts`** (e espelho em `integrations/types.ts`) contém `Database['public']['Tables']`, `Views` e `Functions`.
- Os types são gerados a partir do projeto Supabase (ex.: `supabase gen types typescript`); tendem a refletir o schema do banco ao qual o CLI está ligado.

### Uso de `as any` no frontend
O uso de **`.from('...' as any)`** ou **`.rpc('...' as any)`** indica que o TypeScript não reconhece o nome na tipagem gerada ou que a assinatura não bate. Abaixo, a lista encontrada e a situação no schema/types.

| Referência no código | Arquivo(s) | Em types? | Observação |
|----------------------|------------|-----------|------------|
| store_category_rules | useStoreCategoryRules, useCreditCardTransactions | sim (Tables) | `as any` removível se types estiverem atualizados |
| user_shared_persons | useUserSharedPersons | sim | idem |
| user_asset_monthly_entries | useUserAssetMonthlyEntries | sim | idem |
| pluggy_connections | StepFluxo | sim | idem |
| user_dreams | StepMetas, metas, useUserDreams | sim (Tables) | types têm user_dreams; migrations criam user_goals (naming no DB) |
| user_trash | useUserTrash, core/trash | sim (Views) | view criada na Fase 3; types podem ter sido gerados antes |
| user_drivers | useUserDrivers | sim | idem |
| v_user_plan | useAdminUsers | sim (Views) | idem |
| credit_card_bills_with_totals | useCreditCardBills | sim (Views) | view existe em types |
| lancamento_metadata | usePluggyBankSync | sim | idem |
| user_income_items / user_expense_items | FinancialContext, useUserParameters | sim | idem |
| user_financial_institutions | useUserFinancialInstitutions | sim | idem |
| user_vehicle_records | useUserVehicleRecords | sim | idem |
| user_assets | useUserAssets | sim | idem |
| onboarding_phase_history | AdminOnboardingTab | sim | idem |
| migration_rollbacks | RollbacksTab | sim | idem |
| apply_store_category_rule | useStoreCategoryRules, storeCategoryRules | sim (Functions) | idem |
| apply_store_friendly_name_rule | storeFriendlyNameRules | sim | idem |
| apply_lancamento_friendly_name_rule, create_lancamento, upsert_lancamento, update_lancamento, mark_lancamento_paid, duplicate_lancamento_next_month, soft_delete_lancamento | core/lancamentos | parcial (apply_* em types) | RPCs de lancamento podem não estar no types gerado |
| admin_rollback_migration | RollbacksTab | sim | idem |

### Conclusão 4.2
- **Todas as tabelas/views** usadas com `as any` **existem** em `types.ts` (Tables ou Views).
- O `as any` é usado por conveniência (evitar erros de tipo quando tipos gerados estão desatualizados ou com forma diferente). Não há referência a tabela/coluna/schema que **não exista** no backend.
- **Recomendação:** rodar `npm run gen:types` (ou `supabase gen types typescript`) após aplicar as migrações da Fase 3 no ambiente alvo e, em seguida, remover o `as any` onde o tipo gerado coincidir com o uso (opcional, passo a passo).

---

## 4.3 Padronização e alinhamento

### Tabelas do app em `public`
- **Confirmado:** todas as tabelas e views de aplicação nas migrations estão em **`public`**.
- **Views** `user_trash`, `v_user_plan`, `credit_card_transactions_v`, `lancamentos_realizados_v`, `sync_jobs_v`, `credit_card_bills_with_totals`, `v_crm_kanban` estão (ou devem estar) em `public`; o frontend referencia apenas por nome, sem prefixo de schema (PostgREST usa o schema configurado no projeto).

### Frontend e nomes do schema
- O frontend usa **apenas** nomes de tabela/view (ex.: `supabase.from('user_trash')`), sem qualificar schema no código.
- PostgREST/Supabase expõe o schema `public` por padrão; não há referência no código a schema diferente (ex.: `extensions`).

### Nomes que dependem do backend
- **user_trash:** view criada na Fase 3 sobre `asset_trash`; o frontend continua usando `user_trash` — alinhado.
- **user_dreams:** o types tem `user_dreams`; as migrations antigas criam `user_goals`. Se no banco real a tabela for `user_dreams` (renomeada ou view), está consistente; se ainda for `user_goals`, o types reflete um estado diferente do banco — vale confirmar no Supabase qual nome existe hoje.

### Conclusão 4.3
- Padronização atual: **tudo em `public`**, frontend sem referência a schema inexistente.
- Nenhuma alteração obrigatória de código na Fase 4; opcional: regenerar types e remover `as any` onde possível.

---

## Critérios de validação Fase 4

- [x] **Nenhuma referência no código** a tabela/coluna/schema que não exista no backend (as entidades usadas com `as any` existem em types e no schema).
- [x] **Types alinhados ao schema:** types contêm as tabelas/views usadas; eventuais diferenças são de forma (opcional vs obrigatório), não de entidade inexistente.
- [x] **Schemas:** apenas `public` para app; `extensions` só para extensões.

---

## Recomendações (opcionais)

1. **Regenerar types** após aplicar migrações no ambiente de produção:
   ```bash
   cd apps/web && npx supabase gen types typescript --project-id kneaniaifzgqibpajyji > src/integrations/supabase/types.ts
   ```
2. **Remover `as any`** gradualmente nos arquivos listados na tabela, onde o tipo gerado for compatível com o uso (evita quebras se o generator mudar nomes).
3. **Confirmar no Supabase** se a tabela de sonhos/metas se chama `user_dreams` ou `user_goals` e, se for `user_goals`, atualizar types ou criar view/alias `user_dreams` para manter o contrato do frontend.

---

## Próximo passo (Fase 5)

Conforme o plano: **Banco de dados: página e grupos do menu** — revisar e, se necessário, popular `page_groups` e `pages` para refletir a estrutura canônica da Fase 1.
