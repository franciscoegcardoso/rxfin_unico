/**
 * Serviço de lançamentos — chamadas Supabase puras, sem estado React.
 */
import { createClient } from '@/lib/supabase/client';
import type { LancamentoRealizado, LancamentoInput } from '@/core/types/lancamentos';
import { getCategoryId } from '@/utils/categoryUtils';

const supabase = createClient();

function mapRow(d: Record<string, unknown>): LancamentoRealizado {
  return {
    ...d,
    tipo: (d.tipo as 'receita' | 'despesa'),
    category_id: (d.category_id as string | null) ?? null,
    friendly_name: (d.friendly_name as string | null) ?? null,
    is_category_confirmed: (d.is_category_confirmed as boolean) ?? false,
  } as LancamentoRealizado;
}

export async function fetchLancamentos(userId: string): Promise<LancamentoRealizado[]> {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .select('*')
    .eq('user_id', userId)
    .order('data_registro', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createLancamento(
  userId: string,
  input: LancamentoInput,
): Promise<LancamentoRealizado> {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .insert({
      user_id: userId,
      tipo: input.tipo,
      categoria: input.categoria,
      category_id: input.category_id ?? getCategoryId(input.categoria),
      nome: input.nome,
      valor_previsto: input.valor_previsto,
      valor_realizado: input.valor_realizado,
      mes_referencia: input.mes_referencia,
      data_vencimento: input.data_vencimento || null,
      data_pagamento: input.data_pagamento || null,
      forma_pagamento: input.forma_pagamento || null,
      observacoes: input.observacoes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function createMultipleLancamentos(
  userId: string,
  inputs: LancamentoInput[],
): Promise<LancamentoRealizado[]> {
  const records = inputs.map((input) => ({
    user_id: userId,
    tipo: input.tipo,
    categoria: input.categoria,
    category_id: input.category_id ?? getCategoryId(input.categoria),
    nome: input.nome,
    valor_previsto: input.valor_previsto,
    valor_realizado: input.valor_realizado,
    mes_referencia: input.mes_referencia,
    data_vencimento: input.data_vencimento || null,
    data_pagamento: input.data_pagamento || null,
    observacoes: input.observacoes || null,
    forma_pagamento: input.forma_pagamento || null,
  }));

  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .insert(records)
    .select();

  if (error) throw error;
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function updateLancamento(
  id: string,
  updates: Partial<LancamentoInput>,
): Promise<LancamentoRealizado> {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function deleteLancamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_realizados')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateFriendlyName(id: string, friendlyName: string): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_realizados')
    .update({ friendly_name: friendlyName })
    .eq('id', id);

  if (error) throw error;
}

export async function applyFriendlyNameRule(
  originalName: string,
  friendlyName: string,
): Promise<{ updated: number }> {
  const normalizedName = originalName.trim().toLowerCase();
  const { data, error } = await supabase.rpc('apply_lancamento_friendly_name_rule', {
    p_normalized_name: normalizedName,
    p_original_name: originalName,
    p_friendly_name: friendlyName,
  });

  if (error) throw error;
  return { updated: (data as number) ?? 0 };
}

export async function createLancamentoRpc(params: {
  p_tipo: 'receita' | 'despesa';
  p_categoria: string;
  p_nome: string;
  p_valor_previsto: number;
  p_mes_referencia: string;
  p_data_vencimento?: string | null;
  p_forma_pagamento?: string | null;
  p_category_id?: string | null;
  p_observacoes?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('create_lancamento', {
    p_tipo: params.p_tipo,
    p_categoria: params.p_categoria,
    p_nome: params.p_nome,
    p_valor_previsto: params.p_valor_previsto,
    p_mes_referencia: params.p_mes_referencia,
    p_data_vencimento: params.p_data_vencimento ?? null,
    p_forma_pagamento: params.p_forma_pagamento ?? null,
    p_category_id: params.p_category_id ?? getCategoryId(params.p_categoria),
    p_observacoes: params.p_observacoes ?? null,
  });
  if (error) throw error;
}

export async function upsertLancamentoRpc(params: {
  p_id: string | null;
  p_tipo: 'receita' | 'despesa';
  p_nome: string;
  p_categoria: string;
  p_valor_previsto: number;
  p_mes_referencia: string;
  p_data_vencimento?: string | null;
  p_data_pagamento?: string | null;
  p_valor_realizado?: number | null;
  p_forma_pagamento?: string | null;
  p_observacoes?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('upsert_lancamento', params);
  if (error) throw error;
}

export async function updateLancamentoRpc(
  id: string,
  p_data: Partial<{
    nome: string;
    valor_previsto: number;
    valor_realizado: number;
    categoria: string;
    data_vencimento: string | null;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    observacoes: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.rpc('update_lancamento', { p_id: id, p_data });
  if (error) throw error;
}

export async function markLancamentoPaidRpc(
  lancamentoId: string,
  paid: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('mark_lancamento_paid', {
    p_lancamento_id: lancamentoId,
    p_paid: paid,
  });
  if (error) throw error;
}

export async function markLancamentoPaidWithValuesRpc(params: {
  p_id: string;
  p_valor_realizado: number;
  p_data_pagamento: string;
  p_forma_pagamento: string;
}): Promise<void> {
  const { error } = await supabase.rpc('mark_lancamento_paid', params);
  if (error) throw error;
}

export async function duplicateLancamentoNextMonthRpc(lancamentoId: string): Promise<LancamentoRealizado | null> {
  const { data, error } = await supabase.rpc('duplicate_lancamento_next_month', {
    p_id: lancamentoId,
  });
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function softDeleteLancamentoRpc(id: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_lancamento', { p_id: id });
  if (error) throw error;
}
