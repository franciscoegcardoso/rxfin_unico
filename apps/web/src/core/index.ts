// Supabase
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client'
export type { Database, Json } from '@/integrations/supabase/types'

// Services (namespace re-exports to avoid name collisions)
export * as authService from './services/auth'
export * as perfilService from './services/perfil'
export * as lancamentosService from './services/lancamentos'
export * as contasService from './services/contas'
export * as cartoesService from './services/cartoes'
export * as orcamentoService from './services/orcamento'
export * as pluggyService from './services/pluggy'
export * as ativosService from './services/ativos'
export * as metasService from './services/metas'
export * as irService from './services/ir'

// Hooks
export { useAuth } from './hooks/useAuth'
export { useProfile } from './hooks/useProfile'
