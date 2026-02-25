# n8n Workflows

Workflows exportados do n8n Cloud (`rxfin.app.n8n.cloud`).

## Propósito

Este diretório serve como **backup versionado** dos workflows do n8n.
A edição principal continua sendo feita no painel do n8n Cloud.

## Como Exportar

### Via n8n Cloud UI
1. Abrir o workflow no n8n Cloud
2. Menu → Download → JSON
3. Salvar aqui com nome descritivo (ex: `email-gateway-webhook.json`)
4. Commit e push

### Via API (futuro)
```bash
# TODO: configurar n8n API key como GitHub secret
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://rxfin.app.n8n.cloud/api/v1/workflows \
  -o n8n/workflows/all-workflows.json
```

## Workflows Conhecidos

| Workflow | Trigger | Função |
|----------|---------|--------|
| Email Gateway | Webhook (POST) | Recebe requisições da Edge Function `send-email-n8n` e envia via Resend |

## Secrets Necessários no n8n

- `RESEND_API_KEY` — para envio de emails
- Webhook URL é chamada pela Edge Function com `N8N_WEBHOOK_SECRET` no header

## Convenção de Nomes

Salvar os JSONs com o padrão: `nome-do-workflow.json`
