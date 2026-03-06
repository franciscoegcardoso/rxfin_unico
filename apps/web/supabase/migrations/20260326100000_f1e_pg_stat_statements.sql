-- F1-E: Ativar pg_stat_statements para análise de queries lentas
-- Executar no Supabase SQL Editor se migration falhar por shared_preload_libraries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
