/**
 * Tipos de domínio para autenticação.
 * Compartilháveis entre web e mobile.
 */
import { User } from '@supabase/supabase-js';

export type OAuthProvider = 'google' | 'facebook';

export interface SignUpResult {
  error: Error | null;
  data: { user: User | null } | null;
}

export interface SignInResult {
  error: Error | null;
}

export interface OAuthResult {
  error: Error | null;
}
