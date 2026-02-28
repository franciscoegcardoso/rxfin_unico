import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PurchaseRegistryItem {
  id: string;
  user_id: string;
  name: string;
  link?: string | null;
  estimated_value: number;
  actual_value?: number | null;
  purchase_date?: string | null;
  planned_date?: string | null;
  payment_method?: string | null;
  installments?: number | null;
  lancamento_id?: string | null;
  status: 'pending' | 'purchased';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRegistryInput {
  name: string;
  link?: string | null;
  estimated_value: number;
  actual_value?: number | null;
  purchase_date?: string | null;
  planned_date?: string | null;
  payment_method?: string | null;
  installments?: number | null;
  lancamento_id?: string | null;
  status?: 'pending' | 'purchased';
  notes?: string | null;
}

export function usePurchaseRegistry() {
  const { user } = useAuth();
  const [items, setItems] = useState<PurchaseRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('purchase_registry')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setItems((data || []) as PurchaseRegistryItem[]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching purchase registry:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user, fetchItems]);

  const addItem = useCallback(async (input: PurchaseRegistryInput) => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('purchase_registry')
        .insert({
          user_id: user.id,
          name: input.name,
          link: input.link,
          estimated_value: input.estimated_value,
          actual_value: input.actual_value,
          purchase_date: input.purchase_date,
          planned_date: input.planned_date,
          payment_method: input.payment_method,
          installments: input.installments ?? 1,
          lancamento_id: input.lancamento_id,
          status: input.status || 'pending',
          notes: input.notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setItems(prev => [data as PurchaseRegistryItem, ...prev]);
      toast.success('Item adicionado à lista de compras');
      return data as PurchaseRegistryItem;
    } catch (err: any) {
      toast.error('Erro ao adicionar item: ' + err.message);
      console.error('Error adding item:', err);
      return null;
    }
  }, [user]);

  const updateItem = useCallback(async (id: string, updates: Partial<PurchaseRegistryInput>) => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('purchase_registry')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
      ));
      toast.success('Item atualizado');
      return true;
    } catch (err: any) {
      toast.error('Erro ao atualizar item: ' + err.message);
      console.error('Error updating item:', err);
      return false;
    }
  }, [user]);

  const deleteItem = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('purchase_registry')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item removido');
      return true;
    } catch (err: any) {
      toast.error('Erro ao remover item: ' + err.message);
      console.error('Error deleting item:', err);
      return false;
    }
  }, [user]);

  const markAsPurchased = useCallback(async (
    id: string, 
    actualValue: number, 
    purchaseDate: string,
    lancamentoId?: string
  ) => {
    return updateItem(id, {
      status: 'purchased',
      actual_value: actualValue,
      purchase_date: purchaseDate,
      lancamento_id: lancamentoId,
    });
  }, [updateItem]);

  const getItemsByStatus = useCallback((status: 'pending' | 'purchased') => {
    return items.filter(item => item.status === status);
  }, [items]);

  const getTotalEstimated = useCallback(() => {
    return items.filter(i => i.status === 'pending').reduce((sum, item) => sum + item.estimated_value, 0);
  }, [items]);

  const getTotalPurchased = useCallback(() => {
    return items.filter(i => i.status === 'purchased').reduce((sum, item) => sum + (item.actual_value || item.estimated_value), 0);
  }, [items]);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    markAsPurchased,
    getItemsByStatus,
    getTotalEstimated,
    getTotalPurchased,
    refetch: fetchItems,
  };
}
