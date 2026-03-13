# Workflow n8n — Email Nurturing Pós-Onboarding

Documentação do fluxo de automação de emails de nurturing para usuários que completaram o onboarding no RXFin. O n8n já está conectado ao Supabase.

---

## Contexto

- **Supabase:** tabela `onboarding_state` com `persona`, `onboarding_completed`, `onboarding_completed_at`, `open_finance_connected`, `ir_import_status`, `checklist_score`.
- **Supabase:** tabela `profiles` com `email`, `full_name`.
- **Objetivo:** disparar sequência de emails (D+1, D+3, D+7, D+14) conforme persona e condições, sem reenviar para quem já recebeu.

---

## 1. Estrutura do Workflow n8n

### Trigger

- **Opção A — Webhook / Supabase Trigger**  
  Evento: quando `onboarding_state.onboarding_completed` muda para `true` (Database Trigger no Supabase chamando o webhook do n8n).

- **Opção B — Cron (recomendado para simplicidade)**  
  Execução a cada **1 hora**, buscando usuários que completaram o onboarding na última hora.

### Query de entrada (nó Supabase)

Usar o nó **Supabase → Execute Query** (ou equivalente) com a query abaixo para obter os usuários elegíveis:

```sql
SELECT
  os.user_id,
  p.email,
  p.full_name,
  os.persona,
  os.open_finance_connected,
  os.ir_import_status,
  os.checklist_score
FROM onboarding_state os
JOIN profiles p ON p.id = os.user_id
WHERE os.onboarding_completed = true
  AND os.onboarding_completed_at >= now() - interval '1 hour'
  AND os.onboarding_completed_at < now()
  AND p.email IS NOT NULL
```

---

## 2. Sequência de emails por dia

| Dia   | Condição                          | Assunto (exemplo)                                      |
|-------|-----------------------------------|--------------------------------------------------------|
| **D+1** | Sempre                            | "Seu panorama financeiro está pronto 🎯"              |
| **D+3** | `open_finance_connected = false`  | "Conecte seus bancos e economize 2h por mês"           |
| **D+7** | `checklist_score < 80`            | "Seu checklist ainda tem espaço para crescer"          |
| **D+14** | Sempre                            | "14 dias usando o RXFin — o que mudou?"               |

- **D+1:** corpo personalizado por **persona** (4 variações).
- **D+3:** benefícios do Open Finance + CTA para conectar.
- **D+7:** resumo do que falta + link direto para o checklist.
- **D+14:** convite para review + benefícios do plano pago.

---

## 3. Nós necessários no workflow

| # | Nó                | Descrição |
|---|-------------------|-----------|
| 1 | **Cron Trigger**  | Agendamento a cada 1h (ou Webhook se usar Supabase Trigger). |
| 2 | **Supabase — Execute Query** | Executa a query de entrada acima. |
| 3 | **IF**            | `items.length > 0` para só seguir se houver registros. |
| 4 | **Split In Batches** | Tamanho do lote: 50 (evitar sobrecarga). |
| 5 | **Wait**          | Controle de delay entre envios (ex.: D+1 → D+3 → D+7 → D+14). |
| 6 | **Switch**        | Por `persona` (4 ramos: dividas, patrimonio, dia_a_dia, ir). |
| 7 | **Send Email**    | SMTP já configurado no n8n. |
| 8 | **Supabase — Update** | Marcar email enviado (ex.: `onboarding_state` ou tabela `email_queue` / log). |

---

## 4. Variáveis de template de email

Usar nos nós de email (body/assunto):

| Variável n8n              | Descrição |
|---------------------------|-----------|
| `{{ $json.full_name }}`   | Nome do usuário (profiles). |
| `{{ $json.persona }}`     | Trilha escolhida (dividas, patrimonio, dia_a_dia, ir). |
| `{{ $json.checklist_score }}` | Score atual do checklist. |
| `{{ $json.open_finance_connected }}` | Se já conectou banco (true/false). |
| `{{ $json.email }}`       | Email do destinatário. |
| `{{ $json.user_id }}`     | ID do usuário (para update/log). |

---

## 5. Templates D+1 por persona (assunto + body resumido)

Assunto único D+1: **"Seu panorama financeiro está pronto 🎯"**

| Persona      | Body resumido (PT-BR) |
|-------------|------------------------|
| **dividas** | Olá, {{ full_name }}. Seu Raio-X está pronto. Com foco em **dívidas**, você já pode ver onde está e planejar a saída. Acesse o app e confira seu panorama. [CTA: Ver meu panorama] |
| **patrimonio** | Olá, {{ full_name }}. Seu panorama financeiro está pronto. Na trilha **patrimônio**, você tem visão dos seus bens e investimentos. Aproveite para revisar metas e projeções. [CTA: Acessar patrimônio] |
| **dia_a_dia** | Olá, {{ full_name }}. Seu Raio-X do dia a dia está disponível. Controle de gastos, categorias e orçamento em um só lugar. Veja como está seu mês. [CTA: Ver meu dia a dia] |
| **ir**      | Olá, {{ full_name }}. Seu panorama está pronto, com foco em **Imposto de Renda**. Organize deduções e documentos ao longo do ano. Confira a seção Meu IR. [CTA: Abrir Meu IR] |

Substituir `{{ full_name }}` pelo valor de `$json.full_name` no n8n.

---

## 6. Evitar re-envio (controle de envio)

- **Opção A — Tabela `email_queue`**  
  Para cada email da sequência (D+1, D+3, D+7, D+14), inserir um registro em `email_queue` com `user_id`, `campaign_key` (ex.: `onboarding_d1`, `onboarding_d3`), `sent_at`. Antes de enviar, checar se já existe registro para aquele `user_id` + `campaign_key`.

- **Opção B — Campos em `onboarding_state`**  
  Se houver colunas como `email_d1_sent_at`, `email_d3_sent_at`, etc., atualizar após cada envio e filtrar na query ou no IF os que ainda não receberam aquele dia.

- **Recomendação:** usar uma tabela de log (ex.: `onboarding_email_log`) com `user_id`, `email_type` (d1, d3, d7, d14), `sent_at`. A query ou um nó posterior filtra quem já tem registro para aquele `email_type` na janela desejada.

---

## 7. Checklist de configuração no n8n

- [ ] **Variáveis de ambiente / credenciais**
  - [ ] Supabase: URL e Service Role Key (ou Anon Key com permissões adequadas) configurados no n8n.
  - [ ] SMTP: host, porta, usuário, senha (ou API de email) para o nó Send Email.
- [ ] **Conexão Supabase**
  - [ ] Conexão Supabase criada e testada (Execute Query retorna dados).
- [ ] **Query de entrada**
  - [ ] Query copiada e colada no nó Supabase; intervalo de 1 hora conferido.
- [ ] **Controle de re-envio**
  - [ ] Tabela ou campo de controle definido (`email_queue`, `onboarding_email_log` ou campos em `onboarding_state`).
  - [ ] Lógica de filtro implementada (IF ou query) para não enviar de novo o mesmo email ao mesmo usuário.
- [ ] **Switch por persona**
  - [ ] 4 ramos configurados (dividas, patrimonio, dia_a_dia, ir) com templates D+1.
- [ ] **Wait / agendamento**
  - [ ] Delays entre D+1, D+3, D+7 e D+14 definidos (ex.: Wait nodes ou workflows separados agendados por dia).
- [ ] **Condicionais D+3 e D+7**
  - [ ] D+3: enviar apenas se `open_finance_connected = false`.
  - [ ] D+7: enviar apenas se `checklist_score < 80`.
- [ ] **Update após envio**
  - [ ] Nó Supabase Update (ou Insert em log) executando após cada envio para marcar como enviado.

---

## 8. Resumo rápido

1. **Trigger:** Cron 1h OU Webhook por Supabase Trigger em `onboarding_completed = true`.
2. **Query:** usuários com `onboarding_completed_at` na última hora + JOIN em `profiles`.
3. **Controle:** usar `email_queue` ou tabela de log para não reenviar.
4. **D+1:** sempre; corpo por persona (4 templates).
5. **D+3:** só se `open_finance_connected = false`.
6. **D+7:** só se `checklist_score < 80`.
7. **D+14:** sempre; convite a review e plano pago.

Variáveis de template: `full_name`, `persona`, `checklist_score`, `open_finance_connected`, `email`, `user_id`.
