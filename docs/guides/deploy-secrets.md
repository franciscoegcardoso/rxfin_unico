# Secrets para deploy (GitHub Actions)   

Configure estes secrets no repositório em **Settings → Secrets and variables → Actions** para que os workflows de deploy e notificação funcionem.

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `N8N_WEBHOOK_URL` | Sim | URL do webhook do n8n que recebe o POST no push da `main` (branch, commit, has_migrations, pusher). |
| `SUPABASE_ACCESS_TOKEN` | Sim | Token de acesso da conta Supabase (gerado em [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)). |
| `SUPABASE_PROJECT_ID` | Sim | ID do projeto Supabase. **Valor:** `kneaniaifzgqibpajyji` (projeto RXFin). |
| `VERCEL_TOKEN` | Sim | Token da Vercel para deploy (gerado em [Vercel → Settings → Tokens](https://vercel.com/account/tokens)). |

## Como adicionar

1. No GitHub: repositório → **Settings** → **Secrets and variables** → **Actions**.
2. Clique em **New repository secret**.
3. Nome: um dos nomes da tabela (ex.: `N8N_WEBHOOK_URL`).
4. Valor: o valor correspondente (URL, token ou ID).

## Uso nos workflows

- **deploy.yml**: usa `N8N_WEBHOOK_URL` para enviar o payload do push (branch, commit, has_migrations, pusher).
- Outros workflows de deploy/migração podem usar `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` e `VERCEL_TOKEN` conforme necessário.

## Secrets no Supabase (Edge Functions)

Stack de IA: **OpenRouter** (Claude, Gemini, DeepSeek, etc.). Todas as Edge Functions de IA usam a mesma chave.

1. **Dashboard** → [Supabase](https://supabase.com/dashboard) → projeto → **Project Settings** → **Edge Functions** → **Secrets**.
2. Adicione:
   - **Nome:** `OPENROUTER_API_KEY` (ou `OPENROUTER_KEY`)
   - **Valor:** sua chave da API [OpenRouter](https://openrouter.ai/keys).

Funções que usam OpenRouter: `ai-chat` (Cibélia), `fiscal-organizer`, `parse-receipt`, `parse-credit-card-statement`, `parse-income-document`, `categorize-transactions`, `budget-insights`, `ir-analysis`, `ir-link-suggestions`, `ir-investment-type-suggestions`, `process-ir-import`, `vehicle-insights`, `property-insights`, `car-comparison-verdict`. Sem a chave, as features de IA retornam erro de configuração.

### Auth email hook (n8n)

Para o envio de e-mails de autenticação (confirmação, recuperação de senha, magic link, etc.) via **n8n**:

- **Nome:** `N8N_AUTH_EMAIL_WEBHOOK_URL`  
  **Valor:** URL do webhook do n8n que recebe `{ to, subject, html, email_action_type, confirmationUrl }` e envia o e-mail (ex.: via Resend/SendGrid).

- **Nome (opcional):** `AUTH_HOOK_SECRET`  
  **Valor:** segredo compartilhado; se definido, a Edge Function exige o header `x-auth-hook-secret` ou `Authorization: Bearer <valor>`.

- **Nome (opcional):** `SITE_URL`  
  **Valor:** URL base do app (ex.: `https://app.rxfin.com.br`), usada em redirects (ex.: `verify-email-otp`).
