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
      setError('Erro ao carregar lan?amentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, [user]);

  const addLancamento = async (input: LancamentoInput) => {
    if (!user) {
      toast.error('Usu?rio n?o autenticado');
      return null;
    }

    try {
      await lancamentosService.createLancamentoRpc({
        p_tipo: input.tipo,
        p_categoria: input.categoria,
        p_nome: input.nome,
        p_valor_previsto: input.valor_previsto,
        p_mes_referencia: input.mes_referencia,
        p_data_vencimento: input.data_vencimento ?? input.data_pagamento ?? null,
        p_forma_pagamento: input.forma_pagamento ?? null,
        p_observacoes: input.observacoes ?? null,
      });
      await fetchLancamentos();
      toast.success('Lan?amento criado');
      return {} as LancamentoRealizado;
    } catch (err) {
      console.error('Error adding lancamento:', err);
      toast.error('Erro ao adicionar lan?amento');
      return null;
    }
  };

  const addMultipleLancamentos = async (inputs: LancamentoInput[]) => {
    if (!user) {
      toast.error('Usu?rio n?o autenticado');
      return false;
    }

    try {
      const created = await lancamentosService.createMultipleLancamentos(user.id, inputs);
      setLancamentos(prev => [...created, ...prev]);
      toast.success(`${inputs.length} lan?amento(s) consolidado(s) com sucesso`);
      return true;
    } catch (err) {
      console.error('Error adding multiple lancamentos:', err);
      toast.error('Erro ao consolidar lan?amentos');
      return false;
    }
  };

  const updateLancamento = async (id: string, updates: Partial<LancamentoInput>) => {
    try {
      const p_data: Record<string, unknown> = {};
      if (updates.nome !== undefined) p_data.nome = updates.nome;
      if (updates.valor_previsto !== undefined) p_data.valor_previsto = updates.valor_previsto;
      if (updates.valor_realizado !== undefined) p_data.valor_realizado = updates.valor_realizado;
      if (updates.categoria !== undefined) p_data.categoria = updates.categoria;
      if (updates.data_vencimento !== undefined) p_data.data_vencimento = updates.data_vencimento;
      if (updates.data_pagamento !== undefined) p_data.data_pagamento = updates.data_pagamento;
      if (updates.forma_pagamento !== undefined) p_data.forma_pagamento = updates.forma_pagamento;
      if (updates.observacoes !== undefined) p_data.observacoes = updates.observacoes;
      await lancamentosService.updateLancamentoRpc(id, p_data as any);
      await fetchLancamentos();
      toast.success('Lan?amento atualizado');
      return {} as LancamentoRealizado;
    } catch (err) {
      console.error('Error updating lancamento:', err);
      toast.error('Erro ao atualizar lan?amento');
      return null;
    }
  };

  const deleteLancamento = async (id: string) => {
    try {
      await lancamentosService.deleteLancamento(id);
      setLancamentos(prev => prev.filter(l => l.id !== id));
      toast.success('Lan?amento removido');
      return true;
    } catch (err) {
      console.error('Error deleting lancamento:', err);
      toast.error('Erro ao remover lan?amento');
      return false;
    }
  };

  const softDeleteLancamento = async (id: string) => {
    try {
      await lancamentosService.softDeleteLancamentoRpc(id);
      await fetchLancamentos();
      toast.success('Lan?amento movido para a lixeira');
      return true;
    } catch (err) {
      console.error('Error soft deleting lancamento:', err);
      toast.error('Erro ao excluir lan?amento');
      return false;
    }
  };

  const markLancamentoPaid = async (id: string, paid: boolean) => {
    try {
      await lancamentosService.markLancamentoPaidRpc(id, paid);
      await fetchLancamentos();
      toast.success(paid ? 'Marcado como pago/recebido' : 'Desmarcado');
      return true;
    } catch (err) {
      console.error('Error marking lancamento paid:', err);
      toast.error('Falha ao atualizar status');
      return false;
    }
  };

  const markLancamentoPaidWithValues = async (
    id: string,
    valorRealizado: number,
    dataPagamento: string,
    formaPagamento: string
  ) => {
    try {
      await lancamentosService.markLancamentoPaidWithValuesRpc({
        p_id: id,
        p_valor_realizado: valorRealizado,
        p_data_pagamento: dataPagamento,
        p_forma_pagamento: formaPagamento,
      });
      await fetchLancamentos();
      toast.success('Lan?amento atualizado com valor e data');
      return true;
    } catch (err) {
      console.error('Error marking lancamento paid with values:', err);
      toast.error('Falha ao registrar pagamento');
      return false;
    }
  };

  const duplicateLancamentoNextMonth = async (id: string) => {
    try {
      const created = await lancamentosService.duplicateLancamentoNextMonthRpc(id);
      if (created) {
        setLancamentos(prev => [created, ...prev]);
        toast.success('Lan?amento duplicado para o pr?ximo m?s');
        return created;
      }
      await fetchLancamentos();
      toast.success('Lan?amento duplicado para o pr?ximo m?s');
      return null;
    } catch (err) {
      console.error('Error duplicating lancamento:', err);
      toast.error('Erro ao duplicar lan?amento');
      return null;
    }
  };

  const updateFriendlyName = async (id: string, friendlyName: string): Promise<boolean> => {
    try {
      await lancamentosService.updateFriendlyName(id, friendlyName);
      setLancamentos(prev => prev.map(l => l.id === id ? { ...l, friendly_name: friendlyName } : l));
      return true;
    } catch (err) {
      console.error('Error updating friendly name:', err);
      toast.error('Erro ao atualizar nome amig?vel');
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
    softDeleteLancamento,
    markLancamentoPaid,
    markLancamentoPaidWithValues,
    duplicateLancamentoNextMonth,
    getLancamentosByMonth,
    isMonthConsolidated,
  };
}
