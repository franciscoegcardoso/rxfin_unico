export type AssetClass =
  | 'renda_fixa'
  | 'acoes'
  | 'fii'
  | 'internacional'
  | 'cripto'
  | 'alternativo';

export type PortfolioTier = 'starter' | 'growing' | 'established' | 'advanced';
export type RiskProfile = 'conservador' | 'moderado' | 'arrojado' | 'agressivo';
export type OnboardingPersona =
  | 'acumulador'
  | 'engenheiro'
  | 'fii_dependente'
  | 'iniciante';

export interface AllocationTarget {
  id: string;
  policy_id: string;
  asset_class: AssetClass;
  target_pct: number;
  tolerance_pct: number;
  glide_path_enabled?: boolean;
}

/** Política (dashboard ou select allocation_policies) */
export interface AllocationPolicy {
  id: string;
  name: string;
  risk_profile: RiskProfile;
  onboarding_persona: OnboardingPersona | null;
  rebalancing_threshold_pct?: number;
  targets: AllocationTarget[];
  user_id?: string;
  is_active?: boolean;
  allocation_targets?: AllocationTarget[];
}

export interface AllocationStatusRow {
  asset_class: AssetClass;
  target_pct: number;
  current_pct: number;
  current_brl: number;
  drift_pct: number;
  drift_priority_score?: number;
  user_id?: string;
  snapshot_id?: string;
  snapshot_date?: string;
  total_brl?: number;
  portfolio_tier?: PortfolioTier;
  policy_id?: string;
  risk_profile?: RiskProfile;
  onboarding_persona?: OnboardingPersona | null;
}

export interface SnapshotItem {
  asset_code: string;
  asset_class: AssetClass;
  asset_name: string | null;
  total_brl: number;
  unrealized_gain_brl: number | null;
  received_income_brl: number | null;
  is_renda_fixa?: boolean;
  rf_liquidity_type?: string | null;
  data_source?: string;
  id?: string;
  quantity?: number | null;
  price_brl?: number | null;
  unrealized_gain_pct?: number | null;
}

export interface PortfolioSnapshot {
  id: string;
  snapshot_date: string;
  total_brl: number;
  portfolio_tier: PortfolioTier;
  completeness_pct: number | null;
  items: SnapshotItem[];
  user_id?: string;
  portfolio_snapshot_items?: SnapshotItem[];
}

export interface PrimaryGoal {
  id: string;
  name: string;
  goal_type: string;
  target_amount_brl: number;
  target_date: string;
  success_probability: number | null;
}

export interface AllocationDashboard {
  policy: AllocationPolicy | null;
  allocation_status: AllocationStatusRow[];
  snapshot: PortfolioSnapshot | null;
  health_score: number;
  primary_goal: PrimaryGoal | null;
  unread_notifications_count: number;
  completeness_threshold: number;
  market_stress_active: boolean;
}
