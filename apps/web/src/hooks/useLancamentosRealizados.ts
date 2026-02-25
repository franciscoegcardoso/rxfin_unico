import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as lancamentosService from '@/core/services/lancamentos';
import type { LancamentoRealizado, LancamentoInput } from '@/core/types/lancamentos';

// Re-export types for backward compatibility
export type { LancamentoRealizado, LancamentoInput };

export function useLancamentosRealizados() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<LancamentoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLancamentos = async () => {
    if (!user) {
      setLancamentos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await lancamentosService.fetchLancamentos(user.id);
      setLancamentos(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching lancamentos:', err);
      setError('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, [user]);

  const addLancamento = async (input: LancamentoInput) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      const created = await lancamentosService.createLancamento(user.id, input);
      setLancamentos(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Error adding lancamento:', err);
      toast.error('Erro ao adicionar lançamento');
      return null;
    }
  };

  const addMultipleLancamentos = async (inputs: LancamentoInput[]) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const created = await lancamentosService.createMultipleLancamentos(user.id, inputs);
      setLancamentos(prev => [...created, ...prev]);
      toast.success(`${inputs.length} lançamento(s) consolidado(s) com sucesso`);
      return true;
    } catch (err) {
      console.error('Error adding multiple lancamentos:', err);
      toast.error('Erro ao consolidar lançamentos');
      return false;
    }
  };

  const updateLancamento = async (id: string, updates: Partial<LancamentoInput>) => {
    try {
      const updated = await lancamentosService.updateLancamento(id, updates);
      setLancamentos(prev => prev.map(l => l.id === id ? updated : l));
      toast.success('Lançamento atualizado');
      return updated;
    } catch (err) {
      console.error('Error updating lancamento:', err);
      toast.error('Erro ao atualizar lançamento');
      return null;
    }
  };

  const deleteLancamento = async (id: string) => {
    try {
      await lancamentosService.deleteLancamento(id);
      setLancamentos(prev => prev.filter(l => l.id !== id));
      toast.success('Lançamento removido');
      return true;
    } catch (err) {
      console.error('Error deleting lancamento:', err);
      toast.error('Erro ao remover lançamento');
      return false;
    }
  };

  const updateFriendlyName = async (id: string, friendlyName: string): Promise<boolean> => {
    try {
      await lancamentosService.updateFriendlyName(id, friendlyName);
      setLancamentos(prev => prev.map(l => l.id === id ? { ...l, friendly_name: friendlyName } : l));
      return true;
    } catch (err) {
      console.error('Error updating friendly name:', err);
      toast.error('Erro ao atualizar nome amigável');
      return false;
    }
  };

  const getLancamentosByMonth = (mesReferencia: string) => {
    return lancamentos.filter(l => l.mes_referencia === mesReferencia);
  };

  const isMonthConsolidated = (mesReferencia: string) => {
    return lancamentos.some(l => l.mes_referencia === mesReferencia);
  };

  return {
    lancamentos,
    loading,
    error,
    fetchLancamentos,
    addLancamento,
    addMultipleLancamentos,
    updateLancamento,
    updateFriendlyName,
    deleteLancamento,
    getLancamentosByMonth,
    isMonthConsolidated,
  };
}
