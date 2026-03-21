-- Parte B.5 — Schemas por domínio (preparação; tabelas permanecem em public até migração gradual).

CREATE SCHEMA IF NOT EXISTS rxfin_finance;
CREATE SCHEMA IF NOT EXISTS rxfin_pluggy;
CREATE SCHEMA IF NOT EXISTS rxfin_ir;
CREATE SCHEMA IF NOT EXISTS rxfin_admin;

COMMENT ON SCHEMA rxfin_finance IS 'Destino futuro: transactions, cartões, orçamento (ver docs/parte-b-fase3.md).';
COMMENT ON SCHEMA rxfin_pluggy IS 'Destino futuro: pluggy_connections, pluggy_accounts, pluggy_transactions.';
COMMENT ON SCHEMA rxfin_ir IS 'Destino futuro: ir_imports, ir_group_map, comprovantes.';
COMMENT ON SCHEMA rxfin_admin IS 'Destino futuro: credenciais admin, health KPIs (não-confundir com role app).';

GRANT USAGE ON SCHEMA rxfin_finance TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA rxfin_pluggy TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA rxfin_ir TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA rxfin_admin TO postgres, anon, authenticated, service_role;
