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

Para a **Edge Function `ai-chat`** (Cibélia) funcionar, configure no projeto Supabase:

1. **Dashboard** → [Supabase](https://supabase.com/dashboard) → projeto (ex.: `kneaniaifzgqibpajyji`) → **Project Settings** → **Edge Functions** → **Secrets**.
2. Adicione:
   - **Nome:** `OPENROUTER_API_KEY` (ou `OPENROUTER_KEY`)
   - **Valor:** sua chave da API [OpenRouter](https://openrouter.ai/keys) (usada para o modelo DeepSeek da Cibélia).

Sem essa chave, a Cibélia retorna "Configuração interna ausente." ou "Serviço de IA indisponível."
