-- Add deleted_at column to profiles for soft delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_by column to track who performed the deletion
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Create index for faster queries on active users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- Create a function to handle user deletion with data anonymization
-- Instead of reassigning to a fixed anonymous user, we'll keep data but anonymize the profile
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid,
  admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_tables jsonb := '{}'::jsonb;
  row_count integer;
  target_email text;
  target_name text;
  total_records integer := 0;
BEGIN
  -- Verify admin has permission
  IF NOT public.is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;

  -- Prevent deletion of protected admins
  IF public.is_protected_admin(target_user_id) THEN
    RAISE EXCEPTION 'Cannot delete protected admin user';
  END IF;

  -- Get target user info for audit
  SELECT email, full_name INTO target_email, target_name
  FROM public.profiles WHERE id = target_user_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if already deleted
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'User has already been deleted';
  END IF;

  -- Count records in each table (for reporting purposes)
  SELECT COUNT(*) INTO row_count FROM public.asset_trash WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('asset_trash', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.budget_package_transactions WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('budget_package_transactions', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.budget_packages WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('budget_packages', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.consorcios WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('consorcios', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.contas_pagar_receber WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('contas_pagar_receber', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.credit_card_bills WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('credit_card_bills', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.credit_card_imports WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('credit_card_imports', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.credit_card_transactions WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('credit_card_transactions', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.fgts_monthly_entries WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('fgts_monthly_entries', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.financiamentos WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('financiamentos', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.gift_assignments WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('gift_assignments', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.gift_events WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('gift_events', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.gift_people WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('gift_people', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.ir_comprovantes WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('ir_comprovantes', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.ir_fiscal_chat WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('ir_fiscal_chat', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.ir_imports WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('ir_imports', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.lancamentos_realizados WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('lancamentos_realizados', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.monthly_goals WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('monthly_goals', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.package_transaction_links WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('package_transaction_links', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.pluggy_accounts WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('pluggy_accounts', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.pluggy_connections WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('pluggy_connections', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.pluggy_transactions WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('pluggy_transactions', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.purchase_registry WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('purchase_registry', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.seguros WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('seguros', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.subscription_events WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('subscription_events', row_count); total_records := total_records + row_count; END IF;

  SELECT COUNT(*) INTO row_count FROM public.tour_analytics WHERE user_id = target_user_id;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('tour_analytics', row_count); total_records := total_records + row_count; END IF;

  -- Delete user_roles for the target user (actual deletion, not soft delete)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count > 0 THEN affected_tables := affected_tables || jsonb_build_object('user_roles_deleted', row_count); END IF;

  -- Cancel any pending guest invitations
  UPDATE public.guest_invitations 
  SET status = 'cancelled'
  WHERE (principal_user_id = target_user_id OR guest_user_id = target_user_id) 
    AND status = 'pending';

  -- Soft delete the profile: anonymize PII but keep the record
  UPDATE public.profiles 
  SET 
    deleted_at = now(),
    deleted_by = admin_user_id,
    is_active = false,
    email = 'deleted_' || target_user_id || '@deleted.local',
    full_name = '[Usuário Excluído]',
    phone = NULL,
    admin_notes = COALESCE(admin_notes, '') || E'\n[DELETED] Original email: ' || target_email || ' | Name: ' || COALESCE(target_name, 'N/A') || ' | Deleted at: ' || now()::text || ' | By admin: ' || admin_user_id::text
  WHERE id = target_user_id;

  -- Record in audit log
  INSERT INTO public.deletion_audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    details,
    linked_records_deleted
  ) VALUES (
    admin_user_id,
    'user_deletion',
    'profile',
    target_user_id::text,
    target_name,
    jsonb_build_object(
      'original_email', target_email,
      'original_name', target_name,
      'data_preserved_tables', affected_tables,
      'deletion_type', 'soft_delete_with_anonymization'
    ),
    total_records
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user_id,
    'deleted_email', target_email,
    'data_preserved_tables', affected_tables,
    'total_records_preserved', total_records
  );
END;
$$;

-- Grant execute permission to authenticated users (function itself checks admin status)
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;