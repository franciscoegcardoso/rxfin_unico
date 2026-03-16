import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logCrudOperation } from '@/core/auditLog';
import { Asset } from '@/types/financial';
import { toast } from 'sonner';

const QUERY_KEY = 'user-assets';

const callSyncAssetFlows = async (assetId: string) => {
  try {
    const { error } = await supabase.rpc('sync_asset_flows', {
      p_asset_id: assetId,
    });
    if (error) console.warn('[sync_asset_flows] erro:', error.message);
  } catch (e) {
    console.warn('[sync_asset_flows] exception:', e);
  }
};

// Fields stored as top-level columns
const TOP_LEVEL_FIELDS = ['id', 'user_id', 'name', 'type', 'value', 'description', 'purchase_date', 'purchase_value', 'is_rental_property', 'rental_income_id', 'rental_value', 'metadata', 'created_at', 'updated_at'] as const;

// Map from camelCase app fields to snake_case DB columns
const APP_TO_DB_TOP: Record<string, string> = {
  name: 'name', type: 'type', value: 'value', description: 'description',
  purchaseDate: 'purchase_date', purchaseValue: 'purchase_value',
  isRentalProperty: 'is_rental_property', rentalIncomeId: 'rental_income_id', rentalValue: 'rental_value',
};

const DB_TO_APP_TOP: Record<string, string> = Object.entries(APP_TO_DB_TOP).reduce(
  (acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<string, string>
);

function dbToApp(row: any): Asset {
  const asset: any = { id: row.id };
  for (const [dbCol, appField] of Object.entries(DB_TO_APP_TOP)) {
    if (row[dbCol] !== undefined && row[dbCol] !== null) {
      asset[appField] = row[dbCol];
    }
  }
  if (row.metadata && typeof row.metadata === 'object') {
    Object.assign(asset, row.metadata);
  }
  return asset as Asset;
}

function appToDb(asset: Partial<Asset> & { id?: string }, userId?: string) {
  const dbRow: any = {};
  if (userId) dbRow.user_id = userId;

  const metadata: any = {};
  for (const [key, val] of Object.entries(asset)) {
    if (key === 'id') continue;
    const dbCol = APP_TO_DB_TOP[key];
    if (dbCol) {
      dbRow[dbCol] = val;
    } else {
      metadata[key] = val;
    }
  }
  dbRow.metadata = metadata;
  return dbRow;
}

export function useUserAssets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_assets' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
  });

  const addAsset = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id'>) => {
      const start = performance.now();
      const dbRow = appToDb(asset, userId);
      const { data, error } = await supabase.from('user_assets' as any).insert(dbRow).select('id').single();
      await logCrudOperation({
        operation: 'CREATE',
        tableName: 'user_assets',
        recordId: (data as any)?.id,
        newData: dbRow as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: (assetId) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      if (assetId) callSyncAssetFlows(assetId);
    },
    onError: () => toast.error('Erro ao adicionar bem/investimento'),
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Asset> }) => {
      const start = performance.now();
      const { data: current, error: fetchErr } = await supabase
        .from('user_assets' as any).select('*').eq('id', id).single();
      if (fetchErr) throw fetchErr;

      const dbRow = appToDb(updates);
      const existingMeta = (current as any)?.metadata || {};
      dbRow.metadata = { ...existingMeta, ...dbRow.metadata };

      const { error } = await supabase.from('user_assets' as any).update(dbRow).eq('id', id);
      await logCrudOperation({
        operation: 'UPDATE',
        tableName: 'user_assets',
        recordId: id,
        oldData: current as Record<string, unknown>,
        newData: dbRow as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['asset_flows', variables.id] });
      callSyncAssetFlows(variables.id);
    },
    onError: () => toast.error('Erro ao atualizar bem/investimento'),
  });

  const removeAsset = useMutation({
    mutationFn: async (id: string) => {
      const start = performance.now();
      const { data: oldRow } = await supabase.from('user_assets' as any).select('*').eq('id', id).single();
      const { error } = await supabase.from('user_assets' as any).delete().eq('id', id);
      await logCrudOperation({
        operation: 'DELETE',
        tableName: 'user_assets',
        recordId: id,
        oldData: oldRow as Record<string, unknown>,
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - start),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Bem/investimento removido com sucesso!');
    },
    onError: () => toast.error('Erro ao remover bem/investimento'),
  });

  return {
    assets: query.data ?? [],
    isLoading: query.isLoading,
    addAsset,
    updateAsset,
    removeAsset,
  };
}
