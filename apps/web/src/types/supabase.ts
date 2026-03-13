/**
 * Extended types for Supabase tables not fully covered by generated types.
 * Onboarding Enterprise v2: onboarding_state (or compatible) shape.
 */
export interface OnboardingStateRow {
  user_id: string;
  persona: 'dividas' | 'patrimonio' | 'dia_a_dia' | 'ir' | null;
  current_step: number;
  steps_completed: number[];
  abandoned_at: string | null;
  ir_import_status: 'not_started' | 'skipped' | 'processing' | 'completed' | 'error';
  onboarding_version: number;
  checklist_score: number;
  open_finance_connected: boolean;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Alias for compatibility. */
export type OnboardingState = OnboardingStateRow;
