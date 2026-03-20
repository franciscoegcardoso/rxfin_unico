import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Define available features with metadata
export interface FeatureDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: 'financeiro' | 'planejamento' | 'gestao';
  defaultEnabled: boolean;
  // Routes that should be hidden when this feature is disabled
  routes: string[];
}

export const AVAILABLE_FEATURES: FeatureDefinition[] = [
  {
    slug: 'bens-investimentos',
    name: 'Bens & Investimentos',
    description: 'Controle de ativos, investimentos, FGTS e patrimônio',
    icon: 'TrendingUp',
    category: 'financeiro',
    defaultEnabled: true,
    routes: ['/bens-investimentos'],
  },
  {
    slug: 'lancamentos',
    name: 'Lançamentos',
    description: 'Lançamentos de receitas e despesas mensais',
    icon: 'ArrowUpDown',
    category: 'financeiro',
    defaultEnabled: true,
    routes: ['/movimentacoes'],
  },
  {
    slug: 'gestao-veiculos',
    name: 'Veículos',
    description: 'Controle de gastos, IPVA, manutenção e combustível',
    icon: 'Car',
    category: 'gestao',
    defaultEnabled: true,
    routes: ['/gestao-veiculos'],
  },
  {
    slug: 'seguros',
    name: 'Seguros',
    description: 'Gestão de apólices, coberturas e renovações',
    icon: 'Shield',
    category: 'gestao',
    defaultEnabled: true,
    routes: ['/seguros'],
  },
  {
    slug: 'metas-mensais',
    name: 'Metas Mensais',
    description: 'Defina e acompanhe suas metas financeiras',
    icon: 'Target',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/planejamento-mensal/metas', '/planejamento?tab=metas'],
  },
  {
    slug: 'sonhos',
    name: 'Sonhos',
    description: 'Planeje e acompanhe seus objetivos de longo prazo',
    icon: 'Star',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/sonhos'],
  },
  {
    slug: 'planejamento',
    name: 'Planejamento Mensal',
    description: 'Orçamento detalhado por categoria e período',
    icon: 'Calendar',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/planejamento-mensal', '/planejamento'],
  },
  {
    slug: 'planejamento-anual',
    name: 'Projeção 30 Anos',
    description: 'Simulação de patrimônio e aposentadoria',
    icon: 'LineChart',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/planejamento-anual'],
  },
  {
    slug: 'pacotes-orcamento',
    name: 'Pacotes de Orçamento',
    description: 'Organize gastos por eventos ou projetos específicos',
    icon: 'Package',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/pacotes-orcamento'],
  },
  {
    slug: 'registro-compras',
    name: 'Registro de Compras',
    description: 'Histórico de compras e parcelamentos',
    icon: 'ShoppingCart',
    category: 'financeiro',
    defaultEnabled: true,
    routes: ['/registro-compras'],
  },
  {
    slug: 'presentes',
    name: 'Presentes',
    description: 'Planejamento de presentes para datas especiais',
    icon: 'Gift',
    category: 'planejamento',
    defaultEnabled: true,
    routes: ['/presentes'],
  },
  {
    slug: 'meu-ir',
    name: 'Meu IR',
    description: 'Organização de documentos para declaração de IR',
    icon: 'FileText',
    category: 'financeiro',
    defaultEnabled: true,
    routes: ['/meu-ir'],
  },
];

interface FeaturePreference {
  id: string;
  user_id: string;
  feature_slug: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useFeaturePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch user's feature preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['feature-preferences', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('workspace_feature_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as FeaturePreference[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Toggle feature mutation - MUST be called unconditionally
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ featureSlug, isEnabled }: { featureSlug: string; isEnabled: boolean }) => {
      if (!userId) throw new Error('User not authenticated');

      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('workspace_feature_preferences')
        .upsert(
          {
            user_id: userId,
            feature_slug: featureSlug,
            is_enabled: isEnabled,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,feature_slug',
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-preferences', userId] });
      queryClient.invalidateQueries({ queryKey: ['nav-menu-pages'] });
      
      const feature = AVAILABLE_FEATURES.find(f => f.slug === variables.featureSlug);
      if (feature) {
        toast.success(
          variables.isEnabled 
            ? `${feature.name} ativado` 
            : `${feature.name} desativado`
        );
      }
    },
    onError: (error) => {
      console.error('Error toggling feature:', error);
      toast.error('Erro ao atualizar preferência');
    },
  });

  // Check if a feature is enabled (default to true if no preference exists)
  const isFeatureEnabled = (featureSlug: string): boolean => {
    const preference = preferences?.find(p => p.feature_slug === featureSlug);
    if (preference) {
      return preference.is_enabled;
    }
    // Default to feature's default enabled state
    const feature = AVAILABLE_FEATURES.find(f => f.slug === featureSlug);
    return feature?.defaultEnabled ?? true;
  };

  // Check if a route should be visible based on feature preferences
  const isRouteEnabled = (route: string): boolean => {
    const feature = AVAILABLE_FEATURES.find(f => f.routes.includes(route));
    if (!feature) return true; // Route not tied to a feature
    return isFeatureEnabled(feature.slug);
  };

  // Get all features with their enabled state
  const featuresWithState = AVAILABLE_FEATURES.map(feature => ({
    ...feature,
    isEnabled: isFeatureEnabled(feature.slug),
  }));

  // Group features by category
  const featuresByCategory = {
    financeiro: featuresWithState.filter(f => f.category === 'financeiro'),
    planejamento: featuresWithState.filter(f => f.category === 'planejamento'),
    gestao: featuresWithState.filter(f => f.category === 'gestao'),
  };

  return {
    preferences,
    isLoading,
    isFeatureEnabled,
    isRouteEnabled,
    toggleFeature: toggleFeatureMutation.mutate,
    toggleFeatureAsync: toggleFeatureMutation.mutateAsync,
    isToggling: toggleFeatureMutation.isPending,
    featuresWithState,
    featuresByCategory,
  };
}
// sync
