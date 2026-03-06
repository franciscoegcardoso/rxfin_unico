-- F1-A: Índices em tabelas com user_id para filtros frequentes
-- Tabelas identificadas a partir do schema e uso no frontend

-- transactions (crítico para listagens por usuário e data)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC NULLS LAST);

-- pluggy_transactions
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user_id ON public.pluggy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user_created ON public.pluggy_transactions(user_id, created_at DESC NULLS LAST);

-- pluggy_connections
CREATE INDEX IF NOT EXISTS idx_pluggy_connections_user_id ON public.pluggy_connections(user_id);

-- credit_card_bills
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_user_id ON public.credit_card_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_user_due ON public.credit_card_bills(user_id, due_date DESC NULLS LAST);

-- contas_pagar_receber
CREATE INDEX IF NOT EXISTS idx_contas_pagar_receber_user_id ON public.contas_pagar_receber(user_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC NULLS LAST);

-- ai_chat_sessions
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);

-- ai_chat_messages (filtrar por session; session já tem user_id)
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created ON public.ai_chat_messages(created_at DESC NULLS LAST);

-- budget_packages
CREATE INDEX IF NOT EXISTS idx_budget_packages_user_id ON public.budget_packages(user_id);

-- monthly_goals
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_id ON public.monthly_goals(user_id);

-- notifications (user_id para listar por usuário)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC NULLS LAST);

-- subscription_events
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
