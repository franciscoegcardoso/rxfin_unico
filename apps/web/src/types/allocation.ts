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
  glide_path_enabled: boolean;
}

export interface AllocationPolicy {
  id: string;
  user_id: string;
  name: string;
  risk_profile: RiskProfile;
  onboarding_persona: OnboardingPersona | null;
  rebalancing_threshold_pct: number;
  is_active: boolean;
  allocation_targets: AllocationTarget[];
}

export interface AllocationStatusRow {
  user_id: string;
  snapshot_id: string;
  snapshot_date: string;
  total_brl: number;
  portfolio_tier: PortfolioTier;
  policy_id: string;
  risk_profile: RiskProfile;
  onboarding_persona: OnboardingPersona | null;
  asset_class: AssetClass;
  target_pct: number;
  current_pct: number;
  current_brl: number;
  drift_pct: number;
  drift_priority_score: number;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_brl: number;
  portfolio_tier: PortfolioTier;
  portfolio_snapshot_items: PortfolioSnapshotItem[];
}

export interface PortfolioSnapshotItem {
  id: string;
  asset_code: string;
  asset_class: AssetClass;
  asset_name: string | null;
  total_brl: number;
  quantity: number | null;
  price_brl: number | null;
  unrealized_gain_brl: number | null;
  unrealized_gain_pct: number | null;
}
