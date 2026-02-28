import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { Receipt, CreditCard, CalendarRange, Car, Gift, Package, Star, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ShortcutDefinition {
  slug: string;
  label: string;
  icon: LucideIcon;
  path: string;
  locked?: boolean; // cannot be removed
}

// All possible shortcut options
export const ALL_SHORTCUTS: ShortcutDefinition[] = [
  { slug: 'lancamentos', label: 'Lançamentos', icon: Receipt, path: '/lancamentos', locked: true },
  { slug: 'cartao-credito', label: 'Cartão', icon: CreditCard, path: '/cartao-credito', locked: true },
  { slug: 'planejamento', label: 'Planejar', icon: CalendarRange, path: '/planejamento' },
  { slug: 'gestao-veiculos', label: 'Veículos', icon: Car, path: '/gestao-veiculos' },
  { slug: 'presentes', label: 'Presentes', icon: Gift, path: '/presentes' },
  { slug: 'pacotes-orcamento', label: 'Pacotes', icon: Package, path: '/pacotes-orcamento' },
  { slug: 'sonhos', label: 'Sonhos', icon: Star, path: '/sonhos' },
  { slug: 'seguros', label: 'Seguros', icon: Shield, path: '/seguros' },
];

// Priority order for auto-selecting 4th slot
const SLOT4_PRIORITY = ['gestao-veiculos', 'presentes', 'pacotes-orcamento', 'sonhos', 'seguros'];

export function useHomeShortcuts(count: number = 4) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isFeatureEnabled } = useFeaturePreferences();
  const userId = user?.id;

  const { data: dbShortcuts, isLoading } = useQuery({
    queryKey: ['home-shortcuts', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_home_shortcuts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select extra slots based on enabled features + priority
  const getAutoSlot = (excludeSlugs: string[]): string => {
    for (const slug of SLOT4_PRIORITY) {
      if (!excludeSlugs.includes(slug) && isFeatureEnabled(slug)) return slug;
    }
    // fallback to first not excluded
    for (const slug of SLOT4_PRIORITY) {
      if (!excludeSlugs.includes(slug)) return slug;
    }
    return SLOT4_PRIORITY[0];
  };

  const slot3 = dbShortcuts?.slot_3 || 'planejamento';
  const slot4 = dbShortcuts?.slot_4 || getAutoSlot([slot3]);

  const resolvedShortcuts: ShortcutDefinition[] = [
    ALL_SHORTCUTS[0], // lancamentos (locked)
    ALL_SHORTCUTS[1], // cartao-credito (locked)
    ALL_SHORTCUTS.find(s => s.slug === slot3) || ALL_SHORTCUTS[2],
    ALL_SHORTCUTS.find(s => s.slug === slot4) || ALL_SHORTCUTS[3],
  ];

  // Add a 5th shortcut for tablet
  if (count >= 5) {
    const usedSlugs = resolvedShortcuts.map(s => s.slug);
    const slot5Slug = getAutoSlot(usedSlugs);
    const slot5 = ALL_SHORTCUTS.find(s => s.slug === slot5Slug);
    if (slot5) resolvedShortcuts.push(slot5);
  }

  // Available options for customizable slots (exclude locked ones and the other slot's selection)
  const getAvailableOptions = (currentSlotSlug: string, otherSlotSlug: string) => {
    return ALL_SHORTCUTS.filter(s => 
      !s.locked && 
      (s.slug === currentSlotSlug || s.slug !== otherSlotSlug) &&
      isFeatureEnabled(s.slug)
    );
  };

  const updateShortcuts = useMutation({
    mutationFn: async ({ slot3: s3, slot4: s4 }: { slot3: string; slot4: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_home_shortcuts')
        .upsert({
          user_id: userId,
          slot_3: s3,
          slot_4: s4,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-shortcuts', userId] });
    },
  });

  return {
    shortcuts: resolvedShortcuts,
    slot3,
    slot4,
    isLoading,
    getAvailableOptions,
    updateShortcuts: updateShortcuts.mutate,
    isUpdating: updateShortcuts.isPending,
  };
}
// sync
