-- RPC get_onboarding_data_snapshot: retorno esperado pelo frontend (useOnboardingSnapshot / BlockB)
-- Resolve 400 ao carregar onboarding: função era chamada mas não existia no banco.
CREATE OR REPLACE FUNCTION public.get_onboarding_data_snapshot(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_conn_count int := 0;
  v_conns jsonb := '[]'::jsonb;
  v_has_cpf boolean := false;
  v_tx_count int := 0;
  v_tx_categorized int := 0;
  v_has_onboarding boolean := false;
  v_has_financial boolean := false;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'pluggy_connections_count', 0,
      'pluggy_connections', '[]'::jsonb,
      'has_cpf', false,
      'transactions_count', 0,
      'transactions_categorized_count', 0,
      'has_onboarding_profile', false,
      'has_financial_config', false,
      'snapshot_at', (now() AT TIME ZONE 'UTC')::timestamptz::text
    );
  END IF;

  -- Pluggy connections (apenas ativas, sem deleted_at)
  SELECT
    COUNT(*)::int,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'item_id', pc.item_id,
          'connector_id', pc.connector_id,
          'connector_name', pc.connector_name,
          'connector_image_url', pc.connector_image_url,
          'connector_primary_color', pc.connector_primary_color,
          'status', pc.status,
          'created_at', (pc.created_at AT TIME ZONE 'UTC')::timestamptz::text
        )
        ORDER BY pc.created_at DESC
      ),
      '[]'::jsonb
    )
  INTO v_conn_count, v_conns
  FROM pluggy_connections pc
  WHERE pc.user_id = v_user_id
    AND (pc.deleted_at IS NULL);

  IF v_conns IS NULL THEN
    v_conns := '[]'::jsonb;
  END IF;

  -- has_cpf: profile tem cpf_encrypted preenchido
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id AND cpf_encrypted IS NOT NULL
  ) INTO v_has_cpf;

  -- transactions_count e transactions_categorized_count (lancamentos_realizados)
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE COALESCE(lr.is_category_confirmed, false))::int
  INTO v_tx_count, v_tx_categorized
  FROM lancamentos_realizados lr
  WHERE lr.user_id = v_user_id;

  -- has_onboarding_profile: perfil com progresso de onboarding
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_user_id
      AND (p.onboarding_phase IS NOT NULL AND p.onboarding_phase <> 'not_started'
           OR (p.onboarding_completed = true))
  ) INTO v_has_onboarding;

  -- has_financial_config: pelo menos uma instituição financeira ou conta
  SELECT EXISTS (
    SELECT 1 FROM user_financial_institutions ufi
    WHERE ufi.user_id = v_user_id
    LIMIT 1
  ) INTO v_has_financial;

  RETURN jsonb_build_object(
    'pluggy_connections_count', v_conn_count,
    'pluggy_connections', v_conns,
    'has_cpf', v_has_cpf,
    'transactions_count', v_tx_count,
    'transactions_categorized_count', v_tx_categorized,
    'has_onboarding_profile', v_has_onboarding,
    'has_financial_config', v_has_financial,
    'snapshot_at', (now() AT TIME ZONE 'UTC')::timestamptz::text
  );
END;
$$;

COMMENT ON FUNCTION public.get_onboarding_data_snapshot(uuid) IS
  'Snapshot para o onboarding: conexões Pluggy, CPF, lançamentos e flags de perfil/config. Usado por useOnboardingSnapshot e BlockB.';
