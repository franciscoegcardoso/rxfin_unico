import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AffiliateProgram {
  id: string;
  program_type: 'standard' | 'influencer';
  name: string;
  description: string | null;
  is_active: boolean;
  requires_active_plan: boolean;
  retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateTier {
  id: string;
  program_id: string;
  min_referrals: number;
  max_referrals: number | null;
  commission_value: number;
  sort_order: number;
  created_at: string;
}

export interface AffiliateInfluencer {
  id: string;
  user_id: string;
  program_id: string;
  name: string;
  email: string | null;
  slug: string;
  commission_per_referral: number;
  is_active: boolean;
  total_referrals: number;
  total_paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useAffiliatePrograms() {
  return useQuery({
    queryKey: ['affiliate-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_programs')
        .select('*')
        .order('program_type');
      if (error) throw error;
      return data as AffiliateProgram[];
    },
  });
}

export function useAffiliateTiers(programId?: string) {
  return useQuery({
    queryKey: ['affiliate-tiers', programId],
    queryFn: async () => {
      let query = supabase
        .from('affiliate_program_tiers')
        .select('*')
        .order('sort_order');
      if (programId) query = query.eq('program_id', programId);
      const { data, error } = await query;
      if (error) throw error;
      return data as AffiliateTier[];
    },
    enabled: !!programId,
  });
}

export function useAffiliateInfluencers() {
  return useQuery({
    queryKey: ['affiliate-influencers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_influencers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AffiliateInfluencer[];
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<AffiliateProgram> }) => {
      const { error } = await supabase
        .from('affiliate_programs')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-programs'] }),
  });
}

export function useUpsertTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: Partial<AffiliateTier> & { program_id: string }) => {
      const { error } = await supabase
        .from('affiliate_program_tiers')
        .upsert(tier as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-tiers'] }),
  });
}

export function useDeleteTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('affiliate_program_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-tiers'] }),
  });
}

export function useCreateInfluencer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<AffiliateInfluencer, 'id' | 'created_at' | 'updated_at' | 'total_referrals' | 'total_paid'>) => {
      const { error } = await supabase
        .from('affiliate_influencers')
        .insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-influencers'] }),
  });
}

export function useUpdateInfluencer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<AffiliateInfluencer> }) => {
      const { error } = await supabase
        .from('affiliate_influencers')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-influencers'] }),
  });
}

export function useDeleteInfluencer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('affiliate_influencers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate-influencers'] }),
  });
}
