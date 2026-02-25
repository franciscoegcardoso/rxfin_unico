import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FavoriteVehicle {
  id: string;
  vehicleType: 'carros' | 'motos' | 'caminhoes';
  brandCode: string;
  brandName: string;
  modelCode: string;
  modelName: string;
  yearCode: string;
  yearLabel?: string;
  fipeCode?: string;
  fipeValue?: number;
  displayName: string;
  position: number;
}

interface DbFavoriteVehicle {
  id: string;
  user_id: string;
  vehicle_type: string;
  brand_code: string;
  brand_name: string;
  model_code: string;
  model_name: string;
  year_code: string;
  year_label: string | null;
  fipe_code: string | null;
  fipe_value: number | null;
  display_name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

const mapFromDb = (row: DbFavoriteVehicle): FavoriteVehicle => ({
  id: row.id,
  vehicleType: row.vehicle_type as FavoriteVehicle['vehicleType'],
  brandCode: row.brand_code,
  brandName: row.brand_name,
  modelCode: row.model_code,
  modelName: row.model_name,
  yearCode: row.year_code,
  yearLabel: row.year_label ?? undefined,
  fipeCode: row.fipe_code ?? undefined,
  fipeValue: row.fipe_value ?? undefined,
  displayName: row.display_name,
  position: row.position,
});

export function useFavoriteVehicles() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorite_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setFavorites((data as unknown as DbFavoriteVehicle[]).map(mapFromDb));
    } catch (e) {
      console.error('Error fetching favorite vehicles:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (vehicle: Omit<FavoriteVehicle, 'id' | 'position'>) => {
    if (!user) return false;
    if (favorites.length >= 5) {
      toast.error('Máximo de 5 veículos favoritos atingido');
      return false;
    }

    // Check duplicate
    const isDuplicate = favorites.some(
      f => f.vehicleType === vehicle.vehicleType &&
           f.brandCode === vehicle.brandCode &&
           f.modelCode === vehicle.modelCode &&
           f.yearCode === vehicle.yearCode
    );
    if (isDuplicate) {
      toast.info('Este veículo já está nos favoritos');
      return false;
    }

    try {
      const nextPosition = favorites.length;
      const { error } = await supabase
        .from('favorite_vehicles')
        .insert({
          user_id: user.id,
          vehicle_type: vehicle.vehicleType,
          brand_code: vehicle.brandCode,
          brand_name: vehicle.brandName,
          model_code: vehicle.modelCode,
          model_name: vehicle.modelName,
          year_code: vehicle.yearCode,
          year_label: vehicle.yearLabel ?? null,
          fipe_code: vehicle.fipeCode ?? null,
          fipe_value: vehicle.fipeValue ?? null,
          display_name: vehicle.displayName,
          position: nextPosition,
        });

      if (error) throw error;
      toast.success('Veículo adicionado aos favoritos');
      await fetchFavorites();
      return true;
    } catch (e: any) {
      console.error('Error adding favorite:', e);
      if (e.message?.includes('Maximum of 5')) {
        toast.error('Máximo de 5 veículos favoritos atingido');
      } else {
        toast.error('Erro ao adicionar favorito');
      }
      return false;
    }
  }, [user, favorites, fetchFavorites]);

  const removeFavorite = useCallback(async (favoriteId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('favorite_vehicles')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Favorito removido');
      await fetchFavorites();
      return true;
    } catch (e) {
      console.error('Error removing favorite:', e);
      toast.error('Erro ao remover favorito');
      return false;
    }
  }, [user, fetchFavorites]);

  const isFavorited = useCallback((vehicleType: string, brandCode: string, modelCode: string, yearCode: string) => {
    return favorites.some(
      f => f.vehicleType === vehicleType &&
           f.brandCode === brandCode &&
           f.modelCode === modelCode &&
           f.yearCode === yearCode
    );
  }, [favorites]);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorited,
    refetch: fetchFavorites,
    canAddMore: favorites.length < 5,
  };
}
// sync
