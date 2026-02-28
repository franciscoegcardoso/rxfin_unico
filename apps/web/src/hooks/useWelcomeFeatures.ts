import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionPlans } from './useSubscriptionPlans';

export interface WelcomeFeature {
  name: string;
  category: string;
  freeIncluded: boolean;
  starterIncluded: boolean;
  proIncluded: boolean;
}

export function useWelcomeFeatures() {
  const { data: plans } = useSubscriptionPlans();

  const { data: comparisonFeatures, isLoading } = useQuery({
    queryKey: ['welcome-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_comparison_features')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('order_index');

      if (error) throw error;
      return data;
    },
  });

  const parseValue = (value: string): boolean => {
    if (value === 'true' || value === '✓' || value === 'Incluso') return true;
    if (value === 'false' || value === '✗' || value === 'Não incluso' || value === '-') return false;
    // Partial values like "Limitado" count as included
    return value !== 'false' && value !== '✗' && value !== 'Não incluso' && value !== '-';
  };

  const features: WelcomeFeature[] = (comparisonFeatures || []).map(f => ({
    name: f.feature_name,
    category: f.category,
    freeIncluded: parseValue(f.free_value),
    starterIncluded: parseValue(f.starter_value),
    proIncluded: parseValue(f.pro_value),
  }));

  const getPlanData = (slug: string) => {
    return plans?.find(p => p.slug === slug);
  };

  const getFeaturesForPlan = (planSlug: string) => {
    return features.map(f => ({
      name: f.name,
      category: f.category,
      included: planSlug === 'free' 
        ? f.freeIncluded 
        : planSlug === 'basic' || planSlug === 'starter'
          ? f.starterIncluded
          : f.proIncluded,
    }));
  };

  const getUpgradeFeatures = (fromPlan: string, toPlan: string) => {
    return features.filter(f => {
      const hasInCurrent = fromPlan === 'free' 
        ? f.freeIncluded 
        : fromPlan === 'basic' || fromPlan === 'starter'
          ? f.starterIncluded
          : f.proIncluded;

      const hasInTarget = toPlan === 'free'
        ? f.freeIncluded
        : toPlan === 'basic' || toPlan === 'starter'
          ? f.starterIncluded
          : f.proIncluded;

      return !hasInCurrent && hasInTarget;
    }).map(f => ({
      name: f.name,
      category: f.category,
      included: true,
    }));
  };

  return {
    features,
    plans,
    isLoading,
    getPlanData,
    getFeaturesForPlan,
    getUpgradeFeatures,
  };
}
// sync
