/**
 * Fallback quando `v_user_plan` ou RPC de perfil retornam vazio (ex.: SECURITY INVOKER + usuário sem workspace).
 * Alinhado à view: COALESCE para free / Free.
 */
export type UserPlanViewFields = {
  plan_slug: string;
  plan_name: string;
  plan_expires_at: string | null;
  workspace_id: string | null;
};

export const DEFAULT_USER_PLAN_VIEW: UserPlanViewFields = {
  plan_slug: 'free',
  plan_name: 'Free',
  plan_expires_at: null,
  workspace_id: null,
};

/** Mescla linha da view (ou parcial) com defaults explícitos. */
export function mergeUserPlanView(
  row: Partial<UserPlanViewFields> | null | undefined,
): UserPlanViewFields {
  if (!row) return { ...DEFAULT_USER_PLAN_VIEW };
  return {
    plan_slug: row.plan_slug ?? DEFAULT_USER_PLAN_VIEW.plan_slug,
    plan_name: row.plan_name ?? DEFAULT_USER_PLAN_VIEW.plan_name,
    plan_expires_at: row.plan_expires_at ?? null,
    workspace_id: row.workspace_id ?? null,
  };
}
