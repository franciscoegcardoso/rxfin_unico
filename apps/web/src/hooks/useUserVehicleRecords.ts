import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleRecord } from '@/types/vehicle';
import { toast } from 'sonner';

const QUERY_KEY = 'user-vehicle-records';

function dbToApp(row: any): VehicleRecord {
  const metadata = row.metadata || {};
  const base = {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleName: metadata.vehicleName || '',
    date: row.record_date,
    odometer: row.odometer || 0,
    driverName: metadata.driverName || '',
    notes: row.notes,
    createdAt: row.created_at,
  };

  if (row.record_type === 'fuel') {
    return {
      ...base,
      type: 'fuel',
      fuelType: metadata.fuelType || 'gasolina_comum',
      pricePerUnit: metadata.pricePerUnit || 0,
      totalAmount: metadata.totalAmount || Number(row.fuel_cost) || 0,
      quantity: metadata.quantity || Number(row.fuel_liters) || 0,
      isFullTank: metadata.isFullTank ?? true,
      unit: metadata.unit || 'liter',
    } as VehicleRecord;
  }
  if (row.record_type === 'service') {
    return {
      ...base,
      type: 'service',
      serviceType: metadata.serviceType || 'nao_especificar',
      amount: metadata.amount || 0,
      provider: metadata.provider,
    } as VehicleRecord;
  }
  return {
    ...base,
    type: 'expense',
    category: metadata.category || 'estacionamento',
    amount: metadata.amount || 0,
  } as VehicleRecord;
}

function appToDb(record: VehicleRecord, userId: string) {
  const metadata: any = { ...record };
  delete metadata.id;
  delete metadata.date;
  delete metadata.notes;

  return {
    user_id: userId,
    vehicle_id: record.vehicleId,
    record_date: record.date,
    odometer: record.odometer,
    fuel_liters: record.type === 'fuel' ? record.quantity : null,
    fuel_cost: record.type === 'fuel' ? record.totalAmount : null,
    record_type: record.type,
    notes: record.notes,
    metadata,
  };
}

export function useUserVehicleRecords() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_vehicle_records' as any)
        .select('*')
        .eq('user_id', userId)
        .order('record_date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const addRecord = useMutation({
    mutationFn: async (record: VehicleRecord) => {
      if (!userId) throw new Error('Not authenticated');
      const dbRow = appToDb(record, userId);
      const { error } = await supabase.from('user_vehicle_records' as any).insert(dbRow as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Registro adicionado com sucesso!');
    },
    onError: () => toast.error('Erro ao adicionar registro'),
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, record }: { id: string; record: VehicleRecord }) => {
      if (!userId) throw new Error('Not authenticated');
      const dbRow = appToDb(record, userId);
      const { error } = await supabase.from('user_vehicle_records' as any).update(dbRow as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Registro atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar registro'),
  });

  const removeRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_vehicle_records' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Registro removido com sucesso!');
    },
    onError: () => toast.error('Erro ao remover registro'),
  });

  return {
    vehicleRecords: query.data ?? [],
    isLoading: query.isLoading,
    addRecord,
    updateRecord,
    removeRecord,
  };
}
// sync
