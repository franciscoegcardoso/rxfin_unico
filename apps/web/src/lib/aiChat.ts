/**
 * Helper para a Edge Function `ai-chat` (v10+).
 * Envio de page_context (phase + path) e session_id estável por sessão de chat.
 */

export type AiChatPhase = 'sales' | 'access' | 'onboarding' | 'financial';

export interface PageContext {
  phase: AiChatPhase;
  path: string;
}

const ACCESS_PATHS = [
  '/login',
  '/signup',
  '/signup/',
  '/reset-password',
  '/recuperar-senha',
  '/verificar-email',
  '/auth',
  '/auth/',
  '/update-password',
];

/**
 * Determina a fase (personalidade Cibélia) com base em pathname, login e onboarding.
 * - sales: landing e /planos (visitante sem login)
 * - access: /login, /signup, /recuperar-senha, etc.
 * - onboarding: usuário logado, onboarding não concluído
 * - financial: usuário logado, onboarding concluído
 */
export function getPageContext(
  pathname: string,
  isLoggedIn: boolean,
  onboardingCompleted: boolean
): PageContext {
  const path = pathname || '/';
  const normalizedPath = path.replace(/\/+$/, '') || '/';

  if (!isLoggedIn) {
    const isAccess =
      ACCESS_PATHS.some((p) => normalizedPath === p || normalizedPath.startsWith(p + '/'));
    return {
      phase: isAccess ? 'access' : 'sales',
      path,
    };
  }

  if (!onboardingCompleted) {
    return { phase: 'onboarding', path };
  }

  return { phase: 'financial', path };
}

/**
 * Gera um session_id estável por sessão de chat (UUID v4 no cliente).
 * Deve ser chamado uma vez ao abrir/iniciar a sessão de chat.
 */
export function createClientSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) =>
    c === 'x' ? hex() : ((parseInt(hex(), 16) & 0x3) | 0x8).toString(16)
  );
}

export interface AiChatInvokeBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id: string;
  page_context: PageContext;
}

/**
 * Monta o body para supabase.functions.invoke('ai-chat', { body }).
 */
export function buildAiChatBody(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientSessionId: string;
  pageContext: PageContext;
}): AiChatInvokeBody {
  return {
    messages: params.messages,
    session_id: params.clientSessionId,
    page_context: params.pageContext,
  };
}
