# RXFin — Deploy Pipeline (n8n)

Workflow para automação de deploy: recebe webhook do GitHub Actions, opcionalmente roda migrações no Supabase, aguarda o deploy na Vercel e envia notificação (sucesso ou falha).

## Importar o workflow

1. No n8n: **Workflows** → **Import from File** (ou colar o JSON).
2. Selecione o arquivo `RXFin - Deploy Pipeline.json`.

## URL do Webhook (N8N_WEBHOOK_URL)

Após importar e **ativar** o workflow, a URL do webhook é exibida no nó **GitHub Push**:

- **Produção:** `https://<seu-n8n>/webhook/rxfin-deploy`
- **Teste:** `https://<seu-n8n>/webhook-test/rxfin-deploy`

Use a URL de **produção** como valor do secret **N8N_WEBHOOK_URL** no GitHub (Settings → Secrets and variables → Actions).

Ao chamar o webhook, o request deve ser:

- **Method:** POST  
- **Header:** `x-webhook-secret: <valor de WEBHOOK_SECRET>`  
- **Body (JSON):** `{ "branch", "commit", "has_migrations", "pusher" }`

## Variáveis de ambiente no n8n

Configure no n8n (Settings → Variables ou no ambiente de execução):

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_ACCESS_TOKEN` | Token da Supabase Management API (Account → Access Tokens). |
| `VERCEL_TOKEN` | Token da Vercel (Account → Tokens). |
| `WEBHOOK_SECRET` | String aleatória para validar o webhook; use o mesmo valor no GitHub (header `x-webhook-secret`). |

## Configuração após importar

1. **Webhook (GitHub Push)**  
   - Em **Authentication**, escolha **Header Auth**.  
   - Crie uma credencial com:
     - **Name:** `x-webhook-secret`  
     - **Value:** o mesmo valor da variável `WEBHOOK_SECRET` (ou use `{{ $env.WEBHOOK_SECRET }}` se o n8n suportar).

2. **Run Supabase Migration**  
   - O nó usa `Authorization: Bearer {{ $env.SUPABASE_ACCESS_TOKEN }}`.  
   - Garanta que `SUPABASE_ACCESS_TOKEN` está definido nas variáveis do n8n.

3. **Check Vercel Deploy**  
   - Se usar **Team**, preencha `teamId` na URL (parâmetro `teamId=`).  
   - O nó usa `Authorization: Bearer {{ $env.VERCEL_TOKEN }}`.

4. **Notify Success / Notify Failure**  
   - Os nós enviam **e-mail** para **contato@rxfin.com.br**. Conecte uma credencial **SMTP** (Send Email) no n8n. Opcionalmente defina a variável `N8N_FROM_EMAIL` para o endereço remetente (senão usa `n8n@rxfin.com.br`).

## Fluxo do workflow

1. **GitHub Push** — Webhook POST em `rxfin-deploy` (Header Auth com `x-webhook-secret`).
2. **Has Migrations?** — `body.has_migrations === true`?
3. **Run Supabase Migration** (branch TRUE) — POST na API Supabase para aplicar migrações.
4. **Merge** — Junta o branch com migração e o branch sem migração.
5. **Wait for Vercel** — Espera 30 segundos.
6. **Check Vercel Deploy** — GET em `/v13/deployments?teamId=&limit=1`.
7. **Deploy Ready?** — `deployments[0].state === 'READY'`?
8. **Notify Success** (TRUE) ou **Notify Failure** (FALSE).

## GitHub Actions

No repositório, o secret **N8N_WEBHOOK_URL** deve ser a URL de produção do webhook acima.  
O secret **x-webhook-secret** (valor) deve ser o mesmo que **WEBHOOK_SECRET** no n8n (enviado no header `x-webhook-secret` pelo workflow `.github/workflows/deploy.yml`).
