-- =============================================================================
-- Reset completo dos dados do usuário (CRUD + dados reais) para refazer onboarding do zero.
-- Alvo: franciscoegcardoso@gmail.com
-- Mantém: conta (auth + profile), privilégios de admin (user_roles).
-- =============================================================================
-- Como usar: abra o SQL Editor no Supabase Dashboard e execute este script.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1) Obter o id do usuário pelo email (auth.users)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'franciscoegcardoso@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email franciscoegcardoso@gmail.com não encontrado em auth.users.';
  END IF;

  RAISE NOTICE 'Resetando dados do user_id: %', v_user_id;

  -- 2) Apagar dados do usuário em tabelas com user_id (ordem respeitando FKs quando necessário)
  -- Onboarding e estado
  DELETE FROM public.onboarding_state WHERE user_id = v_user_id;
  DELETE FROM public.user_monthly_entries WHERE user_id = v_user_id;
  DELETE FROM public.user_kv_store WHERE user_id = v_user_id;
  DELETE FROM public.ai_onboarding_events WHERE user_id = v_user_id;

  -- Metas (planejamento)
  DELETE FROM public.monthly_goals WHERE user_id = v_user_id;

  -- Lançamentos (metadata primeiro por FK)
  DELETE FROM public.lancamento_metadata
  WHERE lancamento_id IN (SELECT id FROM public.lancamentos_realizados WHERE user_id = v_user_id);
  DELETE FROM public.lancamentos_realizados WHERE user_id = v_user_id;
  DELETE FROM public.contas_pagar_receber WHERE user_id = v_user_id;

  -- Cartão de crédito (bills, imports, transactions)
  DELETE FROM public.credit_card_transactions WHERE user_id = v_user_id;
  DELETE FROM public.credit_card_bills WHERE user_id = v_user_id;
  DELETE FROM public.credit_card_imports WHERE user_id = v_user_id;

  -- AI / chat (se houver)
  DELETE FROM public.ai_chat_messages WHERE user_id = v_user_id;
  DELETE FROM public.ai_chat_sessions WHERE user_id = v_user_id;
  DELETE FROM public.ai_feedback WHERE user_id = v_user_id;

  -- Consórcios, financiamentos (bens)
  DELETE FROM public.consorcios WHERE user_id = v_user_id;
  DELETE FROM public.financiamentos WHERE user_id = v_user_id;

  -- Notificações (leitura/dismiss do usuário)
  DELETE FROM public.notification_reads WHERE user_id = v_user_id;
  DELETE FROM public.notification_dismissals WHERE user_id = v_user_id;

  -- Outros dados de uso do app
  DELETE FROM public.bill_splits WHERE user_id = v_user_id;
  DELETE FROM public.budget_package_transactions WHERE user_id = v_user_id;
  DELETE FROM public.budget_packages WHERE user_id = v_user_id;
  DELETE FROM public.audit_logs WHERE user_id = v_user_id;

  -- 3) Resetar o perfil: manter conta e identidade mínima, zerar onboarding
  UPDATE public.profiles
  SET
    onboarding_phase = 'not_started',
    onboarding_completed = false,
    onboarding_completed_at = null,
    onboarding_control_done = false,
    onboarding_control_phase = 'not_started',
    birth_date = null,
    updated_at = now()
  WHERE id = v_user_id;

  -- NÃO apagamos: auth.users, public.profiles (row), public.user_roles (admin).
  RAISE NOTICE 'Reset concluído. Perfil e user_roles (admin) preservados.';
END $$;
