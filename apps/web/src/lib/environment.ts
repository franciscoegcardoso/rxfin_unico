/**
 * Módulo de configuração de ambiente.
 * 
 * A aplicação sempre usa o ambiente de Produção,
 * independente da URL (localhost, preview ou domínio publicado).
 */

export type Environment = 'production' | 'staging';

interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  label: string;
  color: string;
}

const PRODUCTION_CONFIG: EnvironmentConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://kneaniaifzgqibpajyji.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  label: 'Produção',
  color: 'hsl(0, 72%, 51%)',
};

export function detectEnvironment(): Environment {
  return 'production';
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return PRODUCTION_CONFIG;
}

export function isStagingConfigured(): boolean {
  return false;
}

export function getCurrentEnvironmentLabel(): string {
  return PRODUCTION_CONFIG.label;
}

export { PRODUCTION_CONFIG };
