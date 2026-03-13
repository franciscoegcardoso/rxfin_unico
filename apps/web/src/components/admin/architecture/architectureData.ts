/**
 * Dados do painel de Arquitetura — checklist por fase e prompts para Cursor.
 * Fonte verdadeira (não buscado do banco). Estado completed em localStorage.
 */

export interface ChecklistItem {
  id: string;
  text: string;
  priority: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  effort: string;
  area: string;
  hasCursorPrompt?: boolean;
}

export interface Phase {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  deadline: string;
  items: ChecklistItem[];
}

export const ARCHITECTURE_PHASES: Phase[] = [
  {
    id: 'phase0',
    label: 'Fase 0',
    sublabel: 'Pré-Launch',
    color: '#EF4444',
    deadline: '2 semanas',
    items: [
      { id: 'p0-1', text: 'Migrar credenciais Pluggy para Supabase Vault', priority: 'CRÍTICA', effort: '4h', area: 'Segurança' },
      { id: 'p0-2', text: 'Corrigir 12 views com SECURITY DEFINER → SECURITY INVOKER', priority: 'CRÍTICA', effort: '1d', area: 'Segurança', hasCursorPrompt: true },
      { id: 'p0-3', text: 'Adicionar SET search_path em 47+ funções públicas', priority: 'ALTA', effort: '2d', area: 'Segurança', hasCursorPrompt: true },
      { id: 'p0-4', text: 'Revisar 7 policies RLS com WITH CHECK = true', priority: 'ALTA', effort: '4h', area: 'Segurança' },
      { id: 'p0-5', text: 'Testar restore de backup em ambiente staging', priority: 'CRÍTICA', effort: '4h', area: 'Infraestrutura' },
      { id: 'p0-6', text: 'Confirmar que service_role key NÃO está no frontend', priority: 'CRÍTICA', effort: '1h', area: 'Segurança' },
      { id: 'p0-7', text: 'Implementar idempotência no webhook Pluggy (ON CONFLICT DO UPDATE)', priority: 'CRÍTICA', effort: '4h', area: 'Integrações', hasCursorPrompt: true },
      { id: 'p0-8', text: 'Configurar refresh token rotation no Supabase Auth', priority: 'ALTA', effort: '1h', area: 'Auth' },
    ],
  },
  {
    id: 'phase1',
    label: 'Fase 1',
    sublabel: '0 → 1k usuários',
    color: '#EAB308',
    deadline: 'Mês 1–2',
    items: [
      { id: 'p1-1', text: 'Validar uso dos índices compostos em transactions', priority: 'ALTA', effort: '4h', area: 'Performance' },
      { id: 'p1-2', text: 'Implementar cursor-based pagination em listagens', priority: 'ALTA', effort: '2d', area: 'Performance', hasCursorPrompt: true },
      { id: 'p1-3', text: 'Configurar Sentry no frontend + alertas Slack', priority: 'ALTA', effort: '1d', area: 'Observabilidade', hasCursorPrompt: true },
      { id: 'p1-4', text: 'Expandir pluggy_sync_logs com idempotency_key e status enum', priority: 'ALTA', effort: '4h', area: 'Integrações' },
      { id: 'p1-5', text: 'Ativar PgBouncer Transaction Mode (max_connections=60)', priority: 'ALTA', effort: '2h', area: 'Infraestrutura', hasCursorPrompt: true },
      { id: 'p1-6', text: 'Remover 324 índices não utilizados (começar pelos maiores)', priority: 'MÉDIA', effort: '1d', area: 'Performance' },
      { id: 'p1-7', text: 'Limpar net._http_response bloat (vacuum/reindex)', priority: 'MÉDIA', effort: '2h', area: 'Performance' },
    ],
  },
  {
    id: 'phase2',
    label: 'Fase 2',
    sublabel: '1k → 10k usuários',
    color: '#22C55E',
    deadline: 'Mês 3–5',
    items: [
      { id: 'p2-1', text: 'Criar views materializadas para dashboards', priority: 'ALTA', effort: '3d', area: 'Performance' },
      { id: 'p2-2', text: 'Implementar soft delete em transações (deleted_at)', priority: 'MÉDIA', effort: '1d', area: 'Dados' },
      { id: 'p2-3', text: 'Criar fluxo LGPD: delete_account + export_data', priority: 'ALTA', effort: '2d', area: 'Compliance', hasCursorPrompt: true },
      { id: 'p2-4', text: 'Mover sync bancário Pluggy para jobs noturnos', priority: 'MÉDIA', effort: '2d', area: 'Integrações' },
      { id: 'p2-5', text: 'Documentar política de retenção de dados PII', priority: 'ALTA', effort: '1d', area: 'Compliance' },
      { id: 'p2-6', text: 'Adicionar campo synced_at em dados FIPE para TTL', priority: 'MÉDIA', effort: '4h', area: 'Dados' },
    ],
  },
  {
    id: 'phase3',
    label: 'Fase 3',
    sublabel: '10k → 100k usuários',
    color: '#A855F7',
    deadline: 'Mês 6–12',
    items: [
      { id: 'p3-1', text: 'Avaliar read replicas para queries intensivas', priority: 'ALTA', effort: '1w', area: 'Infraestrutura' },
      { id: 'p3-2', text: 'Cache Redis/Edge para dados FIPE e consultas frequentes', priority: 'ALTA', effort: '1w', area: 'Performance' },
      { id: 'p3-3', text: 'Load testing antes de campanhas de crescimento', priority: 'ALTA', effort: '3d', area: 'Infraestrutura' },
      { id: 'p3-4', text: 'Definir SLA e uptime monitoring (BetterUptime/Checkly)', priority: 'MÉDIA', effort: '1d', area: 'Observabilidade' },
      { id: 'p3-5', text: 'Avaliar separação de serviços FIPE/AI em microserviços', priority: 'MÉDIA', effort: '2w', area: 'Arquitetura' },
    ],
  },
];

export const CURSOR_PROMPTS: Record<string, string> = {
  'p0-2': `Corrigir views com SECURITY DEFINER no Supabase do RXFin.

Views a corrigir:
credit_card_transactions_v, onboarding_control_funnel,
lancamentos_realizados_v, sync_jobs_v, v_crm_kanban, notification_settings_v,
v_db_health_summary, pluggy_transactions_v, notification_user_settings_v,
onboarding_funnel, notification_preferences_v

Para cada view, gere migration SQL que:
1. Drope a view
2. Recrie sem SECURITY DEFINER (padrão é SECURITY INVOKER)
3. Mantenha mesma query

Salve em: supabase/migrations/TIMESTAMP_fix_security_definer_views.sql`,

  'p0-3': `Adicionar SET search_path = public, pg_catalog em funções do RXFin sem essa config.

Funções afetadas (47 total):
update_user_notification_prefs_updated_at, update_profile_crm_updated_at,
detect_recurring_transactions, repair_orphan_bill_links, repair_pluggy_installment_data,
get_unsynced_pluggy_transactions, track_onboarding_phase_change,
apply_pluggy_category_map_to_lancamentos, sync_onboarding_fields,
repair_orphan_card_ids, get_ai_raio_x_analysis, log_crm_status_change,
get_dashboard_enhanced, get_admin_dashboard_metrics_30d, soft_delete_lancamento,
create_lancamento, get_smart_alerts, get_expense_trends, get_lancamentos_summary,
get_bell_notifications, apply_store_category_rule, mark_lancamento_paid,
create_lancamentos_batch, delete_lancamento, duplicate_lancamento_next_month,
mark_all_notifications_read, get_unread_notification_count, sync_bill_total,
apply_batch_categories, set_onboarding_completed_at, get_credit_card_dashboard,
calculate_milestone_cashflow, apply_store_friendly_name_rule, get_notifications_page,
get_ai_monthly_summary, get_monthly_consolidation, get_dashboard_summary,
get_budget_vs_actual, get_monthly_goals, get_annual_overview, get_financial_report,
get_recurring_expenses_overview, upsert_lancamento, update_lancamento,
apply_lancamento_category_rule, apply_lancamento_friendly_name_rule

Gere migration com ALTER FUNCTION public.nome() SET search_path = public, pg_catalog;
para cada uma. Salve em: supabase/migrations/TIMESTAMP_fix_function_search_paths.sql`,

  'p0-7': `Garantir idempotência nas transações Pluggy no RXFin.

A tabela pluggy_transactions tem UNIQUE em pluggy_transaction_id.

Gere migration SQL para garantir upsert seguro:
INSERT INTO pluggy_transactions (...) VALUES (...)
ON CONFLICT (pluggy_transaction_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  updated_at = now()
WHERE pluggy_transactions.status != 'POSTED';

Também gere snippet para o n8n Function node que aplica essa lógica ao processar webhooks do Pluggy.

Arquivo: supabase/migrations/TIMESTAMP_pluggy_idempotency.sql`,

  'p1-2': `Implementar cursor-based pagination em transações no RXFin.

Tabela: transactions (particionada por reference_month)
Índice disponível: idx_txn_v2_user_date (user_id, transaction_date DESC)

1. Crie RPC get_transactions_page(p_cursor timestamptz, p_limit int DEFAULT 20)
   que retorna rows + next_cursor usando keyset pagination:
   WHERE user_id = auth.uid() AND transaction_date < p_cursor
   ORDER BY transaction_date DESC LIMIT p_limit

2. Crie hook useTransactionsPagination() em src/hooks/
3. Atualize o componente de listagem para usar scroll infinito

Arquivo migration: supabase/migrations/TIMESTAMP_transactions_pagination_rpc.sql`,

  'p1-3': `Configurar Sentry no RXFin (React + Vite + Vercel).

1. npm install @sentry/react @sentry/vite-plugin
2. Configure src/main.tsx com Sentry.init() incluindo:
   - Replay com sessionSampleRate: 0.1, errorSampleRate: 1.0
   - BrowserTracing
   - Environment via import.meta.env.MODE
3. Adicione ErrorBoundary em App.tsx
4. Configure vite.config.ts com sentryVitePlugin para source maps em prod
5. Adicione VITE_SENTRY_DSN ao .env.example

Também crie Edge Function notify-sync-errors que verifica pluggy_sync_logs
e envia alerta no Slack quando há erros nas últimas 2 horas.`,

  'p1-5': `Configurar PgBouncer no Supabase para o projeto RXFin.

O banco tem max_connections=60 (muito baixo para produção).

1. Gere instruções para ativar Pool Mode: Transaction no Supabase Dashboard
   (Database → Settings → Connection Pooling)
2. Mostre como atualizar a DATABASE_URL no .env para usar porta 6543 (pooler)
   vs 5432 (conexão direta para migrations)
3. Atualize o Supabase client no frontend (src/lib/supabase.ts) para usar
   a URL do pooler em vez da direta
4. Explique quando usar cada conexão (pooler para app, direta para CLI migrations)`,

  'p2-3': `Criar endpoints de compliance LGPD no RXFin.

1. Edge Function delete-account:
   - Verifica auth.uid()
   - Anonimiza: profiles.full_name = "Usuário Deletado", mantém email como hash
   - Deleta: transactions, pluggy_transactions, pluggy_items, bank_accounts do user
   - Mantém audit_trail (requisito LGPD 5 anos)
   - Deleta do Supabase Auth por último
   - Registra em audit.audit_trail com action = 'account_deletion'

2. Edge Function export-user-data:
   - Retorna JSON com perfil, transações (2 anos), contas, preferências
   - Content-Type: application/json com header Content-Disposition: attachment

3. Página src/pages/account/PrivacyPage.tsx com:
   - Botão "Exportar meus dados" → chama export-user-data
   - Botão "Excluir minha conta" → modal de confirmação → delete-account

Arquivos: supabase/functions/delete-account/index.ts
          supabase/functions/export-user-data/index.ts`,
};

const STORAGE_KEY = 'rxfin_arch_checklist_v1';

export function getArchChecklistCompleted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setArchChecklistCompleted(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function toggleArchChecklistItem(id: string): string[] {
  const current = getArchChecklistCompleted();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  setArchChecklistCompleted(next);
  return next;
}
