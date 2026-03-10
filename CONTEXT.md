# RXfin — Contexto do Projeto

> Este arquivo é a fonte de verdade sobre o projeto RXfin.
> Usado por assistentes IA (Claude, Copilot) e novos desenvolvedores.
> **Mantenha atualizado.**

## O Que É o RXfin

Plataforma brasileira de finanças pessoais com foco em:
- Orçamento mensal (receitas × despesas)
- Cartões de crédito (faturas, parcelas, categorização)
- Open Banking via Pluggy (sincronização automática de bancos)
- Simuladores públicos (FIPE, custo-hora, comparativo de carros)
- Gestão de ativos (veículos, imóveis, seguros, consórcios, financiamentos)
- IR (importação de declaração, comprovantes, chat fiscal com IA)
- App mobile (React Native/Expo) 

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend Web   │     │   App Mobile      │     │  Simuladores │
│   apps/web/     │     │   (Expo/RN)       │     │  (Públicos)  │
│   (Vite/React)  │     │   apps/mobile/    │     │              │
└────────┬─────────┘     └────────┬──────────┘     └──────┬───────┘
         │                        │                        │
         └────────────┬───────────┴────────────────────────┘
                      │
              ┌───────▼────────┐
              │   Supabase     │
              │   sa-east-1    │
              │                │
              │ • Auth         │
              │ • PostgreSQL   │
              │ • Edge Funcs   │
              │ • Storage      │
              │ • Realtime     │
              └───────┬────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼───┐  ┌─────▼────┐ ┌────▼─────┐
    │ Pluggy  │  │   n8n    │ │   Guru   │
    │ (Open   │  │  Cloud   │ │ (Pagto)  │
    │ Banking)│  │ (Emails) │ │          │
    └─────────┘  └──────────┘ └──────────┘
```

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend Web | React + TypeScript (Vite, monorepo) |
| App Mobile | React Native + Expo |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Banco de Dados | PostgreSQL 17 (Supabase) |
| Autenticação | Supabase Auth (email/senha, OTP, magic link) |
| Open Banking | Pluggy API |
| Pagamentos | Guru + Pagar.me |
| Emails | n8n Cloud → Resend |
| IA | DeepSeek (chat fiscal, categorização) |
| Veículos | API FIPE (547k+ registros de preços) |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo |

## Projetos Supabase

| Projeto | ID | Região | Uso |
|---------|-----|--------|-----|
| Rxfin (prod) | `kneaniaifzgqibpajyji` | sa-east-1 | Produção |
| rxfin-staging | `rxefngokspcaibkvbjtt` | sa-east-1 | Staging/testes |

## Estrutura do Banco (Resumo)

**85+ tabelas.** Principais domínios:

- **Auth/Users:** `profiles`, `user_roles`, `user_consents`, `login_attempts`
- **Workspace:** `workspaces`, `workspace_members`, `subscription_plans`, `expiration_actions`
- **Orçamento:** `user_income_items`, `user_expense_items`, `user_monthly_entries`, `monthly_goals`
- **Lançamentos:** `lancamentos_realizados`, `lancamento_metadata`, `contas_pagar_receber`
- **Cartão de Crédito:** `credit_card_transactions`, `credit_card_bills`, `credit_card_imports`
- **Open Banking:** `pluggy_connections`, `pluggy_accounts`, `pluggy_transactions`, `pluggy_investments`
- **Ativos:** `user_assets`, `consorcios`, `financiamentos`, `seguros`
- **FIPE:** `fipe_catalog` (23k), `fipe_price_history` (547k), `fipe_reference`, `fipe_model_year_window`
- **IR:** `ir_imports`, `ir_comprovantes`, `ir_fiscal_chat`
- **IA:** `ai_chat_sessions`, `ai_chat_messages`, `ai_query_audit`, `ai_feedback`
- **Email:** `email_campaigns`, `email_queue`, `email_templates`, `email_unsubscribes`
- **Admin:** `pages`, `page_groups`, `app_settings`, `audit_logs`, `deploy_history`

**RLS ativo em todas as tabelas.**

## Edge Functions (50+)

**Principais por domínio:**

- **Auth:** `auth-email-hook`, `send-email-verification`, `verify-email-otp`, `send-password-reset`, `manage-guest-invitation`, `send-invitation`, `admin-invite-users`, `delete-own-account`, `save-user-cpf`
- **Open Banking:** `pluggy-connect`, `pluggy-sync`, `pluggy-worker`, `pluggy-trigger-sync`, `pluggy-sync-accounts`, `pluggy-sync-bills`, `pluggy-sync-transactions`
- **FIPE:** `fipe-proxy`, `fipe-history-v2`, `fipe-full-history`, `fipe-bulk-import`, `fipe-monthly-sync`, `fipe-orchestrator`, `fipe-auto-runner`, `fipe-phase3-runner`, `fipe-cache-warmup`, `fipe-cohort-matrix`, `fipe-cohort-standard-curve`, `fipe-sibling-history`, `fipe-discover-popular`
- **IA:** `categorize-transactions`, `budget-insights`, `car-comparison-verdict`, `fiscal-organizer`, `ir-analysis`, `ir-investment-type-suggestions`, `ir-link-suggestions`, `property-insights`, `vehicle-insights`
- **Email:** `send-email-n8n`, `send-campaign-email`, `check-expiration-notifications`
- **Push:** `send-push-notification`, `check-due-dates-push`, `weekly-summary-push`
- **Pagamentos:** `guru-webhook`, `creditos`
- **Parsing:** `parse-credit-card-statement`, `parse-income-document`, `parse-receipt`, `process-ir-import`, `bill-sanity-check`

## n8n Cloud

- URL: `rxfin.app.n8n.cloud`
- Função: gateway de emails (verificação, campanhas, convites, reset de senha)
- Integração: Edge Function `send-email-n8n` → webhook n8n → Resend
- Todos os emails passam pelo n8n (centralizado)

## Convenções de Código

### Commits (Conventional Commits)
```
feat: nova funcionalidade
fix: correção de bug
refactor: refatoração sem mudança de comportamento
docs: documentação
chore: manutenção (deps, configs)
ci: mudanças no CI/CD
perf: otimização de performance
```

### Branches
- `main` — produção (protegida)
- `develop` — integração/staging
- `feature/*` — novas funcionalidades
- `fix/*` — correções
- `hotfix/*` — correções urgentes em produção

### Nomenclatura
- Tabelas: `snake_case` em português (ex: `lancamentos_realizados`)
- Edge Functions: `kebab-case` em inglês (ex: `pluggy-sync-accounts`)
- Componentes React: `PascalCase`
- Variáveis/funções: `camelCase`

## Planos de Assinatura

| Plano | Slug | Preço |
|-------|------|-------|
| Free | `free` | R$ 0 |
| Starter | `starter` | variável |
| Pro | `pro` | variável |
| Admin | `admin` | interno |

## Variáveis de Ambiente Importantes

### Supabase Secrets (Edge Functions)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`
- `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`
- `OPENROUTER_API_KEY` (para DeepSeek)
- `RESEND_API_KEY`

### GitHub Actions Secrets (configurar)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` (prod)
- `SUPABASE_STAGING_PROJECT_ID` (staging)

## Status de Governança do Repositório

**Auditoria de estrutura concluída em março/2026** (commits `90310da` → `1411a9a` → `6e83b54` → fase 4).

### Estrutura pós-auditoria

```
rxfin_unico/
├── .cursor/rules/        ← Regras Cursor AI (padrão 0.43+)
├── .github/
│   ├── CODEOWNERS        ← Responsáveis por área
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   └── workflows/        ← 4 workflows CI/CD
├── apps/
│   ├── web/              ← App principal (Vite + React + Supabase)
│   ├── landing/          ← Landing page (Vite + React)
│   └── mobile/           ← App mobile (Expo, embrionário)
├── docs/
│   ├── adr/              ← Decisões de arquitetura
│   ├── archive/          ← Outputs de sprints antigos
│   ├── audits/           ← Audits e verificações
│   └── guides/           ← Guias operacionais
├── n8n/workflows/        ← Backup workflows n8n Cloud
├── packages/shared/      ← Tipos TypeScript compartilhados
├── scripts/              ← Scripts utilitários
├── supabase/             ← 3 Edge Functions ativas no CI/CD
└── apps/web/supabase/    ← Conjunto completo (⚠️ ver nota abaixo)
```

### Decisão arquitetural pendente

`apps/web/supabase/` contém o conjunto **completo** de Edge Functions (dezenas) e o histórico completo de migrations. `supabase/` na raiz contém apenas 3 functions e é o que o CI/CD deploya hoje.

**Ação futura necessária:** consolidar tudo em `supabase/` na raiz, atualizar os workflows `.github/workflows/deploy-functions-*.yml`, e então remover `apps/web/supabase/`.
