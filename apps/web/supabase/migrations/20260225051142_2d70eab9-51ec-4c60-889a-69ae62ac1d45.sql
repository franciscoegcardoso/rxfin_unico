INSERT INTO migration_rollbacks (migration_name, rollback_sql, description, is_reversible, environment) VALUES
('admin_hardening_layer1_escalation_fix', 
 'DROP TRIGGER IF EXISTS check_admin_escalation ON user_roles; DROP FUNCTION IF EXISTS prevent_admin_escalation();',
 'Remove trigger de proteção contra escalação de admin', true, 'production'),
('admin_hardening_layer2_audit_trail',
 'DROP TRIGGER IF EXISTS audit_role_changes_trigger ON user_roles; DROP TRIGGER IF EXISTS audit_profile_admin_changes_trigger ON profiles; DROP TRIGGER IF EXISTS audit_plan_changes_trigger ON subscription_plans; DROP TRIGGER IF EXISTS audit_workspace_plan_changes_trigger ON workspaces;',
 'Remove triggers de audit trail (NÃO apaga os logs existentes)', true, 'production'),
('admin_hardening_layer4_admin_action_logging',
 'DROP FUNCTION IF EXISTS verify_admin(); DROP FUNCTION IF EXISTS log_admin_action();',
 'Remove RPCs de admin logging', true, 'production');