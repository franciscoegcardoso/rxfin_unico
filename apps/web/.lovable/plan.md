

## Plano: Card de Churn 30d + 4 Gráficos no Dashboard Admin

### Contexto

O dashboard atual (`AdminDashboard.tsx`) exibe 5 cards de engajamento de 30 dias via a função RPC `get_admin_dashboard_metrics_30d`. O pedido é adicionar um 6o card (Churn 30d) e 4 gráficos históricos usando Recharts (já instalado).

---

### 1. Migração de Banco de Dados

**1a. Atualizar `get_admin_dashboard_metrics_30d`** — adicionar `churn_30d`:

Churn = workspaces que tinham plano pago (`plan_id` referenciando um plano com `slug NOT IN ('free','sem_cadastro')`) e cujo `plan_expires_at` caiu nos últimos 30 dias (ou `is_active = false` com `updated_at` nos últimos 30 dias). Query:

```sql
'churn_30d', (
  SELECT count(DISTINCT w.owner_id) FROM workspaces w
  JOIN subscription_plans sp ON sp.id = w.plan_id
  WHERE sp.slug NOT IN ('free','sem_cadastro','')
    AND (
      (w.plan_expires_at BETWEEN thirty_days_ago AND now())
      OR (w.is_active = false AND w.updated_at >= thirty_days_ago)
    )
)
```

**1b. Criar função `get_admin_dashboard_chart_data()`** — retorna séries temporais em JSONB:

| Série | Granularidade | Janela | Lógica |
|-------|--------------|--------|--------|
| `monthly_active` | Mensal | 12 meses | `profiles` com `last_login_at` naquele mês |
| `new_active_daily` | Diário | 30 dias | `profiles.created_at` no dia |
| `new_active_weekly` | Semanal | 12 semanas | `profiles.created_at` na semana |
| `new_active_monthly` | Mensal | 12 meses | `profiles.created_at` no mês |
| `monthly_churn` | Mensal | 12 meses | workspaces com plano pago cujo `plan_expires_at` caiu naquele mês |
| `monthly_reactivated` | Mensal | 12 meses | `subscription_events` com `event_type IN ('purchase','subscription_created')` onde `role_before IN ('free','sem_cadastro','')` e `role_after NOT IN ('free','sem_cadastro','')` naquele mês |

Usa `generate_series` para gerar os buckets de tempo. Protegida por check de admin (`user_roles`).

---

### 2. Frontend — `AdminDashboard.tsx`

**2a. Card Churn 30d**
- Adicionar ao array `engagementCards` um 6o card com ícone `UserMinus`, cor vermelha, mostrando `metrics.churn30d`.
- Grid passa de `lg:grid-cols-5` para `lg:grid-cols-6`.

**2b. Seção de Gráficos**
Novo componente `AdminDashboardCharts.tsx` importado no dashboard, posicionado abaixo dos cards de engajamento.

Contém 4 blocos:

1. **Clientes Ativos (Mensal)** — `AreaChart` com 12 meses, preenchimento gradiente azul.
2. **Novos Ativos** — `BarChart` com tabs Diário/Semanal/Mensal para alternar granularidade.
3. **Churn Mensal** — `BarChart` vermelho, 12 meses.
4. **Reativados Mensal** — `BarChart` verde, 12 meses.

Layout: grid 2 colunas em desktop, 1 em mobile. Cada gráfico dentro de um `Card` com `CardHeader` + `CardContent`. Tooltip formatado em pt-BR.

**2c. Fetch dos dados**
Chamada `supabase.rpc('get_admin_dashboard_chart_data')` no `useEffect` existente, armazenado em novo state `chartData`.

---

### 3. Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar — atualiza RPC + cria nova função |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |
| `src/components/admin/AdminDashboardCharts.tsx` | Criar — componente dos 4 gráficos |
| `src/pages/admin/AdminDashboard.tsx` | Editar — card churn + importar charts |

