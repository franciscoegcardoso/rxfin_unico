import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types/financial';
import { addMonths, format, parseISO, isBefore, isAfter, startOfMonth } from 'date-fns';

export type ContaTipo = 'pagar' | 'receber';
export type TipoCobranca = 'unica' | 'parcelada' | 'recorrente';

export interface Conta {
  id: string;
  tipo: ContaTipo;
  nome: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  categoria: string;
  formaPagamento?: PaymentMethod;
  observacoes?: string;
  recorrente?: boolean;
  tipoCobranca?: TipoCobranca;
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoParcelamento?: string;
  diaRecorrencia?: number;
  dataFimRecorrencia?: string;
  semDataFim?: boolean;
  vinculoCartaoId?: string;
  vinculoAtivoId?: string;
}

export interface ContaInput {
  tipo: ContaTipo;
  nome: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  categoria: string;
  formaPagamento?: PaymentMethod;
  observacoes?: string;
  recorrente?: boolean;
  tipoCobranca?: TipoCobranca;
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoParcelamento?: string;
  diaRecorrencia?: number;
  dataFimRecorrencia?: string;
  semDataFim?: boolean;
  vinculoCartaoId?: string;
  vinculoAtivoId?: string;
}

export const useContasPagarReceber = () => {
  const { user } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContas = useCallback(async () => {
    if (!user) {
      setContas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contas_pagar_receber')
        .select('*')
        .eq('user_id', user.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      const mappedContas: Conta[] = (data || []).map(row => ({
        id: row.id,
        tipo: row.tipo as ContaTipo,
        nome: row.nome,
        valor: Number(row.valor),
        dataVencimento: row.data_vencimento ?? '',
        dataPagamento: row.data_pagamento || undefined,
        categoria: row.categoria,
        formaPagamento: row.forma_pagamento as PaymentMethod | undefined,
        observacoes: row.observacoes || undefined,
        recorrente: row.recorrente || false,
        tipoCobranca: row.tipo_cobranca as TipoCobranca || 'unica',
        parcelaAtual: row.parcela_atual || undefined,
        totalParcelas: row.total_parcelas || undefined,
        grupoParcelamento: row.grupo_parcelamento || undefined,
        diaRecorrencia: row.dia_recorrencia || undefined,
        dataFimRecorrencia: row.data_fim_recorrencia || undefined,
        semDataFim: row.sem_data_fim ?? true,
        vinculoCartaoId: row.vinculo_cartao_id || undefined,
        vinculoAtivoId: (row as any).vinculo_ativo_id || undefined,
      }));

      setContas(mappedContas);
      setError(null);
    } catch (err) {
      console.error('Error fetching contas:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  // Expand recurring accounts into virtual entries for each month until 2056
  const expandedContas = useMemo(() => {
    const endDate = new Date(2056, 11, 31); // December 2056
    const result: Conta[] = [];
    
    // First, collect all paid entries by month/name to avoid duplicates
    const paidEntriesByMonthName = new Map<string, Conta>();
    for (const conta of contas) {
      if (conta.dataPagamento) {
        const key = `${conta.nome}_${format(parseISO(conta.dataVencimento), 'yyyy-MM')}`;
        paidEntriesByMonthName.set(key, conta);
      }
    }
    
    // Track which recurring contas we've processed to avoid duplicates
    const processedRecurringIds = new Set<string>();

    for (const conta of contas) {
      if (conta.recorrente && conta.tipoCobranca === 'recorrente' && conta.diaRecorrencia) {
        // Skip if we already processed this recurring base conta
        if (processedRecurringIds.has(conta.id)) continue;
        processedRecurringIds.add(conta.id);
        
        // This is a recurring account - generate virtual entries
        const startDate = parseISO(conta.dataVencimento);
        const fimRecorrencia = conta.dataFimRecorrencia ? parseISO(conta.dataFimRecorrencia) : null;
        const limitDate = fimRecorrencia && !conta.semDataFim ? fimRecorrencia : endDate;
        
        let currentDate = startOfMonth(startDate);
        let monthIndex = 0;
        
        while (isBefore(currentDate, limitDate) || format(currentDate, 'yyyy-MM') === format(limitDate, 'yyyy-MM')) {
          const dueDay = conta.diaRecorrencia;
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          
          // Adjust day if month doesn't have enough days
          const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
          const adjustedDay = Math.min(dueDay, lastDayOfMonth);
          const vencimento = new Date(year, month, adjustedDay);
          const vencimentoStr = format(vencimento, 'yyyy-MM-dd');
          const monthKey = `${conta.nome}_${format(vencimento, 'yyyy-MM')}`;
          
          // Check if we already have a paid entry for this month
          const existingPaidEntry = paidEntriesByMonthName.get(monthKey);
          
          if (existingPaidEntry) {
            // Use the paid entry instead of generating virtual
            result.push(existingPaidEntry);
          } else {
            // Create virtual entry for this month
            result.push({
              ...conta,
              id: `${conta.id}_virtual_${monthIndex}`,
              dataVencimento: vencimentoStr,
              dataPagamento: undefined, // Virtual entries are always unpaid
            });
          }
          
          currentDate = addMonths(currentDate, 1);
          monthIndex++;
          
          // Safety limit to prevent infinite loops
          if (monthIndex > 500) break;
        }
      } else if (!conta.recorrente || conta.tipoCobranca !== 'recorrente') {
        // Non-recurring account - just add as-is (but skip if it's a paid recurring that was already added)
        const monthKey = `${conta.nome}_${format(parseISO(conta.dataVencimento), 'yyyy-MM')}`;
        const hasPaidRecurring = paidEntriesByMonthName.has(monthKey);
        
        // Only add if this is not a paid entry that belongs to a recurring (will be added via recurring expansion)
        // or if there's no recurring account with this name
        const isRelatedToRecurring = contas.some(c => 
          c.recorrente && 
          c.tipoCobranca === 'recorrente' && 
          c.nome === conta.nome && 
          c.id !== conta.id
        );
        
        if (!isRelatedToRecurring || !conta.dataPagamento) {
          result.push(conta);
        }
      }
    }

    return result;
  }, [contas]);

  const addConta = async (input: ContaInput): Promise<Conta | null> => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar contas');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('contas_pagar_receber')
        .insert({
          user_id: user.id,
          tipo: input.tipo,
          nome: input.nome,
          valor: input.valor,
          data_vencimento: input.dataVencimento,
          data_pagamento: input.dataPagamento || null,
          categoria: input.categoria,
          forma_pagamento: input.formaPagamento || null,
          observacoes: input.observacoes || null,
          recorrente: input.recorrente || false,
          tipo_cobranca: input.tipoCobranca || 'unica',
          parcela_atual: input.parcelaAtual || null,
          total_parcelas: input.totalParcelas || null,
          grupo_parcelamento: input.grupoParcelamento || null,
          dia_recorrencia: input.diaRecorrencia || null,
          data_fim_recorrencia: input.dataFimRecorrencia || null,
          sem_data_fim: input.semDataFim ?? true,
          vinculo_cartao_id: input.vinculoCartaoId || null,
          vinculo_ativo_id: input.vinculoAtivoId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const novaConta: Conta = {
        id: data.id,
        tipo: data.tipo as ContaTipo,
        nome: data.nome,
        valor: Number(data.valor),
        dataVencimento: data.data_vencimento,
        dataPagamento: data.data_pagamento || undefined,
        categoria: data.categoria,
        formaPagamento: data.forma_pagamento as PaymentMethod | undefined,
        observacoes: data.observacoes || undefined,
        recorrente: data.recorrente || false,
        tipoCobranca: data.tipo_cobranca as TipoCobranca || 'unica',
        parcelaAtual: data.parcela_atual || undefined,
        totalParcelas: data.total_parcelas || undefined,
        grupoParcelamento: data.grupo_parcelamento || undefined,
        diaRecorrencia: data.dia_recorrencia || undefined,
        dataFimRecorrencia: data.data_fim_recorrencia || undefined,
        semDataFim: data.sem_data_fim ?? true,
        vinculoCartaoId: data.vinculo_cartao_id || undefined,
        vinculoAtivoId: (data as any).vinculo_ativo_id || undefined,
      };

      setContas(prev => [...prev, novaConta]);
      return novaConta;
    } catch (err) {
      console.error('Error adding conta:', err);
      toast.error('Erro ao adicionar conta');
      return null;
    }
  };

  const addMultipleContas = async (inputs: ContaInput[]): Promise<Conta[]> => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar contas');
      return [];
    }

    try {
      const insertData = inputs.map(input => ({
        user_id: user.id,
        tipo: input.tipo,
        nome: input.nome,
        valor: input.valor,
        data_vencimento: input.dataVencimento,
        data_pagamento: input.dataPagamento || null,
        categoria: input.categoria,
        forma_pagamento: input.formaPagamento || null,
        observacoes: input.observacoes || null,
        recorrente: input.recorrente || false,
        tipo_cobranca: input.tipoCobranca || 'unica',
        parcela_atual: input.parcelaAtual || null,
        total_parcelas: input.totalParcelas || null,
        grupo_parcelamento: input.grupoParcelamento || null,
        dia_recorrencia: input.diaRecorrencia || null,
        data_fim_recorrencia: input.dataFimRecorrencia || null,
        sem_data_fim: input.semDataFim ?? true,
        vinculo_cartao_id: input.vinculoCartaoId || null,
        vinculo_ativo_id: input.vinculoAtivoId || null,
      }));

      const { data, error } = await supabase
        .from('contas_pagar_receber')
        .insert(insertData)
        .select();

      if (error) throw error;

      const novasContas: Conta[] = (data || []).map(row => ({
        id: row.id,
        tipo: row.tipo as ContaTipo,
        nome: row.nome,
        valor: Number(row.valor),
        dataVencimento: row.data_vencimento,
        dataPagamento: row.data_pagamento || undefined,
        categoria: row.categoria,
        formaPagamento: row.forma_pagamento as PaymentMethod | undefined,
        observacoes: row.observacoes || undefined,
        recorrente: row.recorrente || false,
        tipoCobranca: row.tipo_cobranca as TipoCobranca || 'unica',
        parcelaAtual: row.parcela_atual || undefined,
        totalParcelas: row.total_parcelas || undefined,
        grupoParcelamento: row.grupo_parcelamento || undefined,
        diaRecorrencia: row.dia_recorrencia || undefined,
        dataFimRecorrencia: row.data_fim_recorrencia || undefined,
        semDataFim: row.sem_data_fim ?? true,
        vinculoCartaoId: row.vinculo_cartao_id || undefined,
        vinculoAtivoId: (row as any).vinculo_ativo_id || undefined,
      }));

      setContas(prev => [...prev, ...novasContas]);
      return novasContas;
    } catch (err) {
      console.error('Error adding multiple contas:', err);
      toast.error('Erro ao adicionar contas');
      return [];
    }
  };

  const updateConta = async (id: string, updates: Partial<ContaInput>): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado para atualizar contas');
      return false;
    }

    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.tipo !== undefined) updateData.tipo = updates.tipo;
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.valor !== undefined) updateData.valor = updates.valor;
      if (updates.dataVencimento !== undefined) updateData.data_vencimento = updates.dataVencimento;
      if (updates.dataPagamento !== undefined) updateData.data_pagamento = updates.dataPagamento;
      if (updates.categoria !== undefined) updateData.categoria = updates.categoria;
      if (updates.formaPagamento !== undefined) updateData.forma_pagamento = updates.formaPagamento;
      if (updates.observacoes !== undefined) updateData.observacoes = updates.observacoes;
      if (updates.recorrente !== undefined) updateData.recorrente = updates.recorrente;
      if (updates.tipoCobranca !== undefined) updateData.tipo_cobranca = updates.tipoCobranca;
      if (updates.parcelaAtual !== undefined) updateData.parcela_atual = updates.parcelaAtual;
      if (updates.totalParcelas !== undefined) updateData.total_parcelas = updates.totalParcelas;
      if (updates.grupoParcelamento !== undefined) updateData.grupo_parcelamento = updates.grupoParcelamento;
      if (updates.diaRecorrencia !== undefined) updateData.dia_recorrencia = updates.diaRecorrencia;
      if (updates.dataFimRecorrencia !== undefined) updateData.data_fim_recorrencia = updates.dataFimRecorrencia;
      if (updates.semDataFim !== undefined) updateData.sem_data_fim = updates.semDataFim;
      if (updates.vinculoCartaoId !== undefined) updateData.vinculo_cartao_id = updates.vinculoCartaoId;
      if (updates.vinculoAtivoId !== undefined) updateData.vinculo_ativo_id = updates.vinculoAtivoId;

      const { error } = await supabase
        .from('contas_pagar_receber')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setContas(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));

      return true;
    } catch (err) {
      console.error('Error updating conta:', err);
      toast.error('Erro ao atualizar conta');
      return false;
    }
  };

  const deleteConta = async (id: string): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado para excluir contas');
      return false;
    }

    try {
      const { error } = await supabase
        .from('contas_pagar_receber')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setContas(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting conta:', err);
      toast.error('Erro ao excluir conta');
      return false;
    }
  };

  const deleteContasByVinculoCartao = async (vinculoCartaoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('contas_pagar_receber')
        .delete()
        .eq('vinculo_cartao_id', vinculoCartaoId)
        .eq('user_id', user.id);

      if (error) throw error;

      setContas(prev => prev.filter(c => c.vinculoCartaoId !== vinculoCartaoId));
      return true;
    } catch (err) {
      console.error('Error deleting contas by vinculo:', err);
      return false;
    }
  };

  const getContaByVinculoCartao = (vinculoCartaoId: string): Conta | undefined => {
    return contas.find(c => c.vinculoCartaoId === vinculoCartaoId);
  };

  const getContasByVinculoAtivo = (vinculoAtivoId: string): Conta[] => {
    return contas.filter(c => c.vinculoAtivoId === vinculoAtivoId);
  };

  const deleteContasByVinculoAtivo = async (vinculoAtivoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('contas_pagar_receber')
        .delete()
        .eq('vinculo_ativo_id', vinculoAtivoId)
        .eq('user_id', user.id);

      if (error) throw error;

      setContas(prev => prev.filter(c => c.vinculoAtivoId !== vinculoAtivoId));
      return true;
    } catch (err) {
      console.error('Error deleting contas by vinculo ativo:', err);
      return false;
    }
  };

  return {
    contas: expandedContas,
    rawContas: contas,
    loading,
    error,
    fetchContas,
    addConta,
    addMultipleContas,
    updateConta,
    deleteConta,
    deleteContasByVinculoCartao,
    getContaByVinculoCartao,
    getContasByVinculoAtivo,
    deleteContasByVinculoAtivo,
  };
};
