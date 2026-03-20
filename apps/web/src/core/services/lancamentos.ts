/**
 * Serviço de lançamentos — chamadas Supabase puras, sem estado React.
 * Reutilizável no app mobile.
 */
import { supabase } from '@/core/supabase';
import type { LancamentoRealizado, LancamentoInput } from '@/core/types/lancamentos';
import { logCrudOperation } from '@/core/auditLog';
import { getCategoryId } from '@/utils/categoryUtils';

// ─── Helpers ─────────────────────────────────────────────
function mapRow(d: any): LancamentoRealizado {
  return {
    ...d,
    tipo: d.tipo as 'receita' | 'despesa',
    category_id: d.category_id ?? null,
    friendly_name: d.friendly_name ?? null,
    is_category_confirmed: d.is_category_confirmed ?? false,
    valor_realizado: d.valor_realizado ?? d.valor_previsto ?? 0,
  };
}

const DEFAULT_PAGE_SIZE = 50;

// ─── Fetch ───────────────────────────────────────────────
export async function fetchLancamentos(userId: string, mesReferencia?: string | null): Promise<LancamentoRealizado[]> {
  let query = supabase
    .from('lancamentos_realizados_v')
    .select('*')
    .eq('user_id', userId)
    .order('data_registro', { ascending: false });
  if (mesReferencia != null && mesReferencia !== '') {
    query = query.eq('mes_referencia', mesReferencia);
  }
  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(mapRow);
}

/** Fetch one page + total count for pagination (evita travar com muitos registros). */
export async function fetchLancamentosPaginated(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  mesReferencia?: string | null
): Promise<{ data: LancamentoRealizado[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = supabase
    .from('lancamentos_realizados_v')
    .select('*', { count: 'exact', head: false })
    .eq('user_id', userId)
    .order('data_registro', { ascending: false })
    .range(from, to);
  if (mesReferencia != null && mesReferencia !== '') {
    q = q.eq('mes_referencia', mesReferencia);
  }
  const { data, error, count } = await q;

  if (error) throw error;
  return {
    data: (data || []).map(mapRow),
    count: count ?? 0,
  };
}

// ─── Create (single) ────────────────────────────────────
export async function createLancamento(
  userId: string,
  input: LancamentoInput,
): Promise<LancamentoRealizado> {
  const start = performance.now();
  const payload = {
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
  };
  const { data, error } = await supabase
    .from('lancamentos_realizados_v')
    .insert(payload as any)
    .select()
    .single();

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'lancamentos_realizados_v',
    recordId: data?.id,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return mapRow(data);
}

// ─── Create (batch) ──────────────────────────────────────
export async function createMultipleLancamentos(
  userId: string,
  inputs: LancamentoInput[],
): Promise<LancamentoRealizado[]> {
  const start = performance.now();
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
    .from('lancamentos_realizados_v')
    .insert(records)
    .select();

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'lancamentos_realizados_v',
    recordId: (data as any)?.[0]?.id,
    newData: { batch_count: records.length },
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return (data || []).map(mapRow);
}

// ─── Update ──────────────────────────────────────────────
export async function updateLancamento(
  id: string,
  updates: Partial<LancamentoInput>,
): Promise<LancamentoRealizado> {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('lancamentos_realizados_v').select('*').eq('id', id).single();
  const { data, error } = await supabase
    .from('lancamentos_realizados_v')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'lancamentos_realizados_v',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: updates as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return mapRow(data);
}

// ─── Delete ──────────────────────────────────────────────
export async function deleteLancamento(id: string): Promise<void> {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('lancamentos_realizados_v').select('*').eq('id', id).single();
  const { error } = await supabase
    .from('lancamentos_realizados_v')
    .delete()
    .eq('id', id);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'lancamentos_realizados_v',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}

// ─── Update friendly name ────────────────────────────────
export async function updateFriendlyName(id: string, friendlyName: string): Promise<void> {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('lancamentos_realizados_v').select('*').eq('id', id).single();
  const { error } = await supabase
    .from('lancamentos_realizados_v')
    .update({ friendly_name: friendlyName } as any)
    .eq('id', id);

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'lancamentos_realizados_v',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: { friendly_name: friendlyName },
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
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

// ─── RPC: create (backend auth.uid()) ───────────────────
export async function createLancamentoRpc(params: {
  p_tipo: string;
  p_categoria: string;
  p_nome: string;
  p_valor_previsto: number;
  p_mes_referencia: string;
  p_valor_realizado?: number | null;
  p_data_vencimento?: string | null;
  p_data_pagamento?: string | null;
  p_forma_pagamento?: string | null;
  p_observacoes?: string | null;
  p_category_id?: string | null;
}): Promise<{ id: string; success: boolean }> {
  const { data, error } = await supabase.rpc('create_lancamento' as any, {
    p_tipo: params.p_tipo,
    p_categoria: params.p_categoria,
    p_nome: params.p_nome,
    p_valor_previsto: params.p_valor_previsto,
    p_mes_referencia: params.p_mes_referencia,
    p_valor_realizado: params.p_valor_realizado ?? null,
    p_data_vencimento: params.p_data_vencimento ?? null,
    p_data_pagamento: params.p_data_pagamento ?? null,
    p_forma_pagamento: params.p_forma_pagamento ?? null,
    p_observacoes: params.p_observacoes ?? null,
    p_category_id: params.p_category_id ?? getCategoryId(params.p_categoria),
  });
  if (error) throw error;
  return (data ?? { id: '', success: false }) as { id: string; success: boolean };
}

// ─── RPC: upsert (create or update) ─────────────────────
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
  const { error } = await supabase.rpc('upsert_lancamento' as any, params);
  if (error) throw error;
}

// ─── RPC: update (partial) ──────────────────────────────
export async function updateLancamentoRpc(
  id: string,
  p_data: Partial<{ nome: string; valor_previsto: number; valor_realizado: number; categoria: string; data_vencimento: string | null; data_pagamento: string | null; forma_pagamento: string | null; observacoes: string | null }>,
): Promise<void> {
  const { error } = await supabase.rpc('update_lancamento' as any, { p_id: id, p_data });
  if (error) throw error;
}

// ─── RPC: mark as paid (simple toggle, legacy) ───────────
export async function markLancamentoPaidRpc(
  lancamentoId: string,
  paid: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('mark_lancamento_paid' as any, {
    p_lancamento_id: lancamentoId,
    p_paid: paid,
  });
  if (error) throw error;
}

// ─── RPC: mark as paid with values ──────────────────────
export async function markLancamentoPaidWithValuesRpc(params: {
  p_id: string;
  p_valor_realizado?: number | null;
  p_data_pagamento?: string;
  p_forma_pagamento?: string | null;
}): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc('mark_lancamento_paid' as any, params);
  if (error) throw error;
  return (data ?? { status: '' }) as { status: string };
}

// ─── RPC: duplicate to next month ───────────────────────
export async function duplicateLancamentoNextMonthRpc(lancamentoId: string): Promise<LancamentoRealizado | null> {
  const { data, error } = await supabase.rpc('duplicate_lancamento_next_month' as any, {
    p_id: lancamentoId,
  });
  if (error) throw error;
  return data ? mapRow(data as any) : null;
}

// ─── RPC: soft delete ───────────────────────────────────
export async function softDeleteLancamentoRpc(id: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_lancamento' as any, { p_id: id });
  if (error) throw error;
}
