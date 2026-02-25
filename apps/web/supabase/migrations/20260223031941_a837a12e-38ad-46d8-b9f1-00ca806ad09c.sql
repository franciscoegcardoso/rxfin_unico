
-- =====================================================
-- Remoção de índices não utilizados (idx_scan = 0)
-- Preservados: PKs, unique constraints, FKs críticas
-- =====================================================

-- asset_trash
DROP INDEX IF EXISTS idx_asset_trash_expires;

-- audit_logs
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_severity;

-- budget_package_transactions
DROP INDEX IF EXISTS idx_bpt_date;
DROP INDEX IF EXISTS idx_bpt_package_id;
DROP INDEX IF EXISTS idx_bpt_user_id;

-- contas_pagar_receber
DROP INDEX IF EXISTS idx_contas_vinculo_ativo;

-- credit_card_bills
DROP INDEX IF EXISTS idx_credit_card_bills_lancamento_id;
DROP INDEX IF EXISTS idx_credit_card_bills_status;
DROP INDEX IF EXISTS idx_credit_card_bills_user_id;

-- credit_card_imports
DROP INDEX IF EXISTS idx_credit_card_imports_batch_id;

-- credit_card_transactions
DROP INDEX IF EXISTS idx_cc_transactions_purchase_registry;
DROP INDEX IF EXISTS idx_credit_card_transactions_installment;
DROP INDEX IF EXISTS idx_credit_card_transactions_recurring;
DROP INDEX IF EXISTS idx_credit_card_transactions_status;

-- default_expense_items
DROP INDEX IF EXISTS idx_default_expense_items_active;
DROP INDEX IF EXISTS idx_default_expense_items_order;

-- default_income_items
DROP INDEX IF EXISTS idx_default_income_items_active;

-- deploy_history
DROP INDEX IF EXISTS idx_deploy_history_rollback_id;

-- driver_vehicle_access
DROP INDEX IF EXISTS idx_driver_vehicle_access_workspace_owner_id;

-- email_campaign_logs
DROP INDEX IF EXISTS idx_campaign_logs_campaign;
DROP INDEX IF EXISTS idx_campaign_logs_sent;

-- email_campaign_recipients
DROP INDEX IF EXISTS idx_email_campaign_recipients_campaign;
DROP INDEX IF EXISTS idx_recipients_email;
DROP INDEX IF EXISTS idx_recipients_status;
DROP INDEX IF EXISTS idx_recipients_user_id;

-- email_campaigns
DROP INDEX IF EXISTS idx_email_campaigns_active;
DROP INDEX IF EXISTS idx_email_campaigns_created_by;
DROP INDEX IF EXISTS idx_email_campaigns_scheduled_at;
DROP INDEX IF EXISTS idx_email_campaigns_sent_at;
DROP INDEX IF EXISTS idx_email_campaigns_trigger;

-- email_queue
DROP INDEX IF EXISTS idx_email_queue_campaign_id;
DROP INDEX IF EXISTS idx_email_queue_status;
DROP INDEX IF EXISTS idx_email_queue_user_id;

-- email_unsubscribes
DROP INDEX IF EXISTS idx_email_unsubscribes_campaign_id;

-- email_verification_rate_limits
DROP INDEX IF EXISTS idx_email_rate_limits_email;
DROP INDEX IF EXISTS idx_email_rate_limits_sent_at;

-- email_verification_tokens
DROP INDEX IF EXISTS idx_email_verification_tokens_email;
DROP INDEX IF EXISTS idx_email_verification_tokens_expires;
DROP INDEX IF EXISTS idx_email_verification_tokens_otp_code;
DROP INDEX IF EXISTS idx_email_verification_tokens_token;
DROP INDEX IF EXISTS idx_email_verification_tokens_user;

-- expense_categories
DROP INDEX IF EXISTS idx_expense_categories_active;

-- expiration_actions
DROP INDEX IF EXISTS idx_expiration_actions_downgrade_plan_id;

-- favorite_vehicles
DROP INDEX IF EXISTS idx_favorite_vehicles_unique;

-- fipe_sibling_cache
DROP INDEX IF EXISTS idx_fipe_sibling_cache_expires;

-- gift_assignments
DROP INDEX IF EXISTS idx_gift_assignments_event_id;
DROP INDEX IF EXISTS idx_gift_assignments_person_id;
DROP INDEX IF EXISTS idx_gift_assignments_year;

-- guest_invitations
DROP INDEX IF EXISTS idx_guest_invitations_guest_email;
DROP INDEX IF EXISTS idx_guest_invitations_guest_user_id;
DROP INDEX IF EXISTS idx_guest_invitations_previous_principal_id;
DROP INDEX IF EXISTS idx_guest_invitations_principal;
DROP INDEX IF EXISTS idx_guest_invitations_status;
DROP INDEX IF EXISTS idx_guest_invitations_token;

-- ir_comprovantes
DROP INDEX IF EXISTS idx_ir_comprovantes_categoria;
DROP INDEX IF EXISTS idx_ir_comprovantes_user_ano;

-- lancamento_metadata
DROP INDEX IF EXISTS idx_lancamento_metadata_purchase_registry_id;
DROP INDEX IF EXISTS idx_lancamento_metadata_source_unique;
DROP INDEX IF EXISTS idx_lancamento_metadata_user;

-- lancamentos_realizados
DROP INDEX IF EXISTS idx_lancamentos_mes_referencia;
DROP INDEX IF EXISTS idx_lancamentos_purchase_registry;
DROP INDEX IF EXISTS idx_lancamentos_user_mes;

-- leads
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_source;

-- legal_document_versions
DROP INDEX IF EXISTS idx_legal_document_versions_uploaded_by;

-- legal_documents
DROP INDEX IF EXISTS idx_legal_documents_updated_by;

-- legal_documents_history
DROP INDEX IF EXISTS idx_legal_documents_history_archived_by;
DROP INDEX IF EXISTS idx_legal_documents_history_document_id;

-- login_attempts
DROP INDEX IF EXISTS idx_login_attempts_time;

-- notifications
DROP INDEX IF EXISTS idx_notifications_daily_dedup;
DROP INDEX IF EXISTS idx_notifications_expiration_dedup;
DROP INDEX IF EXISTS idx_notifications_type;

-- package_transaction_links
DROP INDEX IF EXISTS idx_package_links_cc_transaction_id;
DROP INDEX IF EXISTS idx_package_links_lancamento_id;
DROP INDEX IF EXISTS idx_package_links_package_id;
DROP INDEX IF EXISTS idx_package_links_user_id;

-- pages
DROP INDEX IF EXISTS idx_pages_group_id;

-- plan_comparison_features
DROP INDEX IF EXISTS idx_plan_comparison_category;
DROP INDEX IF EXISTS idx_plan_comparison_order;

-- pluggy_connections
DROP INDEX IF EXISTS idx_pluggy_connections_status;

-- pluggy_investments
DROP INDEX IF EXISTS idx_pluggy_investments_connection_id;

-- pluggy_sync_logs
DROP INDEX IF EXISTS idx_pluggy_sync_logs_job_id;
DROP INDEX IF EXISTS idx_pluggy_sync_logs_user_id;

-- pluggy_transactions
DROP INDEX IF EXISTS idx_pluggy_transactions_bill_id;

-- profiles
DROP INDEX IF EXISTS idx_profiles_deleted_at;
DROP INDEX IF EXISTS idx_profiles_push_tokens;

-- purchase_registry
DROP INDEX IF EXISTS idx_purchase_registry_date;

-- subscription_events
DROP INDEX IF EXISTS idx_subscription_events_contact_email;
DROP INDEX IF EXISTS idx_subscription_events_processed_at;
DROP INDEX IF EXISTS idx_subscription_events_type;

-- subscription_plans
DROP INDEX IF EXISTS idx_subscription_plans_active;
DROP INDEX IF EXISTS idx_subscription_plans_guru_product_id;
DROP INDEX IF EXISTS idx_subscription_plans_order;

-- sync_jobs
DROP INDEX IF EXISTS idx_sync_jobs_user_status;

-- tour_analytics
DROP INDEX IF EXISTS idx_tour_analytics_created_at;
DROP INDEX IF EXISTS idx_tour_analytics_event_type;
DROP INDEX IF EXISTS idx_tour_analytics_user_id;

-- user_asset_linked_expenses
DROP INDEX IF EXISTS idx_user_asset_linked_expenses_user_id;

-- user_consents
DROP INDEX IF EXISTS idx_user_consents_document;
DROP INDEX IF EXISTS idx_user_consents_user_id;

-- user_income_items
DROP INDEX IF EXISTS idx_user_income_items_default_id;

-- user_monthly_entries
DROP INDEX IF EXISTS idx_user_monthly_entries_user_id;

-- user_roles
DROP INDEX IF EXISTS idx_user_roles_workspace_owner_id;

-- user_vehicle_records
DROP INDEX IF EXISTS idx_user_vehicle_records_user_id;

-- vehicle_fuel_consumption
DROP INDEX IF EXISTS idx_vehicle_fuel_brand_model;
DROP INDEX IF EXISTS idx_vehicle_fuel_category;
DROP INDEX IF EXISTS idx_vehicle_fuel_user;

-- workspace_members
DROP INDEX IF EXISTS idx_workspace_members_invited_by;

-- workspaces
DROP INDEX IF EXISTS idx_workspaces_expires;
