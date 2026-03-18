import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { FGTSMonthlyEntry } from '@/hooks/useFGTSEntries';

const RENDIMENTO_MENSAL = 0.0025; // 3% a.a. ≈ 0.25% a.m.

export interface FGTSTypeData {
  employer_name: string;
  employer_cnpj?: string;
  admission_date: string;
  salary: number;
  modalidade: 'clt' | 'doméstico' | 'rural';
}

export interface FGTSAsset {
  id: string;
  name: string;
  asset_type: 'fgts';
  current_value: number;
  value: number;
  type: string;
  user_id: string;
  metadata?: Record<string, unknown> | null;
  type_data?: FGTSTypeData;
  created_at?: string;
  updated_at?: string;
}

export interface FGTSMonthlyEntryInput {
  asset_id: string;
  month: string;
  previous_balance: number;
  deposit: number;
  yield: number;
  final_balance: number;
  notes?: string | null;
}

export function calcFGTSYield(balance: number, _month?: string): number {
  return balance * RENDIMENTO_MENSAL;
}

export function useFGTSAssets() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['fgts-assets', userId],
    queryFn: async (): Promise<FGTSAsset[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'fgts')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        asset_type: 'fgts',
        current_value: Number(row.value ?? 0),
        value: Number(row.value ?? 0),
        type: row.type,
        user_id: row.user_id,
        metadata: row.metadata,
        type_data: row.metadata?.type_data ?? row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!userId,
  });
}

export interface FGTSSummary {
  total_balance: number;
  last_update_month: string | null;
  assets_count: number;
}

export function getFGTSSummary(assets: FGTSAsset[] | undefined, entries: FGTSMonthlyEntry[]): FGTSSummary {
  if (!assets?.length) {
    return { total_balance: 0, last_update_month: null, assets_count: 0 };
  }
  const total_balance = assets.reduce((sum, a) => sum + (a.current_value ?? a.value ?? 0), 0);
  const months = entries.map(e => e.month).filter(Boolean);
  const last_update_month = months.length > 0 ? months.reduce((a, b) => (a > b ? a : b)) : null;
  return { total_balance, last_update_month, assets_count: assets.length };
}

export function useSaveFGTSMonthlyEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: FGTSMonthlyEntryInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('fgts_monthly_entries')
        .upsert(
          {
            user_id: user.id,
            asset_id: entry.asset_id,
            month: entry.month,
            previous_balance: entry.previous_balance,
            deposit: entry.deposit,
            yield: entry.yield,
            final_balance: entry.final_balance,
            notes: entry.notes ?? null,
          },
          { onConflict: 'user_id,asset_id,month' }
        )
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from('user_assets')
        .update({ value: entry.final_balance, updated_at: new Date().toISOString() })
        .eq('id', entry.asset_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fgts-assets'] });
      qc.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Saldo registrado!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao registrar saldo');
    },
  });
}

export function useCreateFGTSAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      employer_name: string;
      employer_cnpj?: string;
      admission_date: string;
      salary: number;
      modalidade: 'clt' | 'doméstico' | 'rural';
      initial_balance: number;
      initial_balance_month: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data: asset, error: assetError } = await supabase
        .from('user_assets')
        .insert({
          user_id: user.id,
          name: input.name,
          type: 'fgts',
          value: input.initial_balance,
          metadata: {
            type_data: {
              employer_name: input.employer_name,
              employer_cnpj: input.employer_cnpj,
              admission_date: input.admission_date,
              salary: input.salary,
              modalidade: input.modalidade,
            },
          },
        })
        .select()
        .single();
      if (assetError) throw assetError;
      if (input.initial_balance > 0 && asset?.id) {
        const yieldVal = calcFGTSYield(input.initial_balance);
        await supabase.from('fgts_monthly_entries').upsert(
          {
            user_id: user.id,
            asset_id: asset.id,
            month: input.initial_balance_month,
            previous_balance: 0,
            deposit: 0,
            yield: yieldVal,
            final_balance: input.initial_balance,
          },
          { onConflict: 'user_id,asset_id,month' }
        );
      }
      return asset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fgts-assets'] });
      qc.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Conta FGTS criada!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar conta');
    },
  });
}

export function useUpdateFGTSAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      type_data,
    }: {
      id: string;
      name?: string;
      type_data?: Partial<FGTSTypeData>;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name != null) updates.name = name;
      if (type_data != null) updates.metadata = { type_data };
      const { data, error } = await supabase
        .from('user_assets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fgts-assets'] });
    },
  });
}

export function useDeleteFGTSAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assetId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('user_assets').delete().eq('id', assetId).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fgts-assets'] });
      qc.invalidateQueries({ queryKey: ['fgts-entries'] });
      toast.success('Conta FGTS excluída');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao excluir');
    },
  });
}
