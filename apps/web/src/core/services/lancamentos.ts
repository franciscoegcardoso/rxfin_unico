/**
 * Serviço de lançamentos — chamadas Supabase puras, sem estado React.
 * Reutilizável no app mobile.
 */
import { supabase } from '@/core/supabase';
import type { LancamentoRealizado, LancamentoInput } from '@/core/types/lancamentos';
import { getCategoryId } from '@/utils/categoryUtils';

// ─── Helpers ─────────────────────────────────────────────
function mapRow(d: any): LancamentoRealizado {
  return {
    ...d,
    tipo: d.tipo as 'receita' | 'despesa',
    category_id: d.category_id ?? null,
    friendly_name: d.friendly_name ?? null,
    is_category_confirmed: d.is_category_confirmed ?? false,
  };
}

// ─── Fetch ───────────────────────────────────────────────
export async function fetchLancamentos(userId: string): Promise<LancamentoRealizado[]> {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .select('*')
    .eq('user_id', userId)
    .order('data_registro', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

// ─── Create (single) ────────────────────────────────────
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
    } as any)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

// ─── Create (batch) ──────────────────────────────────────
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
  return (data || []).map(mapRow);
}

// ─── Update ──────────────────────────────────────────────
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
  return mapRow(data);
}

// ─── Delete ──────────────────────────────────────────────
export async function deleteLancamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_realizados')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Update friendly name ────────────────────────────────
export async function updateFriendlyName(id: string, friendlyName: string): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_realizados')
    .update({ friendly_name: friendlyName } as any)
    .eq('id', id);

  if (error) throw error;
}

// ─── Apply friendly name rule (RPC) ─────────────────────
export async function applyFriendlyNameRule(
  originalName: string,
  friendlyName: string,
): Promise<{ updated: number }> {
  const normalizedName = originalName.trim().toLowerCase();

  const { data, error } = await supabase.rpc('apply_lancamento_friendly_name_rule' as any, {
    p_normalized_name: normalizedName,
    p_original_name: originalName,
    p_friendly_name: friendlyName,
  });

  if (error) throw error;
  return { updated: (data as any)?.updated || 0 };
}
