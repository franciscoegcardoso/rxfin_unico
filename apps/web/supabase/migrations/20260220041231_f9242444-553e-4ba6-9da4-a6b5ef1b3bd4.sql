
-- Fix: fph_unique is a constraint, not a plain index
-- Also handle idx_fipe_history_correto and idx_fipe_history_unique as potential constraints

-- Drop all as constraints first, then indexes as fallback
ALTER TABLE public.fipe_price_history DROP CONSTRAINT IF EXISTS fph_unique;
ALTER TABLE public.fipe_price_history DROP CONSTRAINT IF EXISTS idx_fipe_history_correto;
ALTER TABLE public.fipe_price_history DROP CONSTRAINT IF EXISTS idx_fipe_history_unique;

-- Fallback: drop as indexes if they weren't constraints
DROP INDEX IF EXISTS public.fph_unique;
DROP INDEX IF EXISTS public.idx_fipe_history_correto;
DROP INDEX IF EXISTS public.idx_fipe_history_unique;

-- Now re-run all the other drops that failed atomically:
DROP INDEX IF EXISTS public.idx_cc_bills_due_date;
DROP INDEX IF EXISTS public.idx_cc_bills_user_id;
DROP INDEX IF EXISTS public.idx_recipients_campaign_id;
DROP INDEX IF EXISTS public.idx_email_unsub_user;
DROP INDEX IF EXISTS public.idx_email_rate_limits_sent;
DROP INDEX IF EXISTS public.idx_email_verification_tokens_otp;
DROP INDEX IF EXISTS public.idx_pages_group;

ALTER TABLE public.gift_assignments DROP CONSTRAINT IF EXISTS gift_assignments_person_id_event_id_year_key;
ALTER TABLE public.guest_invitations DROP CONSTRAINT IF EXISTS guest_invitations_principal_user_id_guest_email_key;
ALTER TABLE public.page_features DROP CONSTRAINT IF EXISTS page_features_page_id_feature_key_key;
ALTER TABLE public.page_groups DROP CONSTRAINT IF EXISTS page_groups_slug_key;
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_slug_key;

DROP INDEX IF EXISTS public.gift_assignments_person_id_event_id_year_key;
DROP INDEX IF EXISTS public.guest_invitations_principal_user_id_guest_email_key;
DROP INDEX IF EXISTS public.page_features_page_id_feature_key_key;
DROP INDEX IF EXISTS public.page_groups_slug_key;
DROP INDEX IF EXISTS public.pages_slug_key;

DROP INDEX IF EXISTS public.fph_fipe_year_idx;
DROP INDEX IF EXISTS public.idx_fipe_price_model_year;
DROP INDEX IF EXISTS public.fph_ref_idx;
DROP INDEX IF EXISTS public.idx_fipe_price_fipe_code;
DROP INDEX IF EXISTS public.idx_fipe_sibling_cache_lookup;
DROP INDEX IF EXISTS public.idx_credit_card_transactions_pluggy_tx_id;
DROP INDEX IF EXISTS public.idx_email_templates_slug;
DROP INDEX IF EXISTS public.idx_lancamento_metadata_lancamento;
DROP INDEX IF EXISTS public.idx_lancamento_metadata_source;
DROP INDEX IF EXISTS public.idx_legal_docs_type_version;
DROP INDEX IF EXISTS public.idx_legal_documents_slug;
DROP INDEX IF EXISTS public.idx_monthly_goals_user_month;
DROP INDEX IF EXISTS public.idx_pluggy_accounts_active;
DROP INDEX IF EXISTS public.idx_pluggy_connections_active;
DROP INDEX IF EXISTS public.idx_subscription_events_processed;
DROP INDEX IF EXISTS public.idx_subscription_plans_slug;
DROP INDEX IF EXISTS public.idx_app_settings_key;
DROP INDEX IF EXISTS public.idx_workspaces_slug;
DROP INDEX IF EXISTS public.idx_email_unsubscribes_email;
