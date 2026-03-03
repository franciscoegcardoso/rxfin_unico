import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type IrComprovante = Tables<'ir_comprovantes'>
export type IrComprovanteInsert = TablesInsert<'ir_comprovantes'>
export type IrImport = Tables<'ir_imports'>

// ─── Comprovantes ─────────────────────────────────────────────────────────────

export async function getComprovantes(
  userId: string,
  anoFiscal?: number
): Promise<IrComprovante[]> {
  let query = supabase
    .from('ir_comprovantes')
    .select('*')
    .eq('user_id', userId)
    .order('data_comprovante', { ascending: false })

  if (anoFiscal) query = query.eq('ano_fiscal', anoFiscal)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createComprovante(comp: IrComprovanteInsert): Promise<IrComprovante> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('ir_comprovantes')
    .insert(comp)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'ir_comprovantes',
    recordId: data?.id,
    newData: comp as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function deleteComprovante(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('ir_comprovantes').select('*').eq('id', id).single()
  const { error } = await supabase.from('ir_comprovantes').delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'ir_comprovantes',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
}

export async function getTotalDeducoes(userId: string, anoFiscal: number): Promise<number> {
  const { data, error } = await supabase
    .from('ir_comprovantes')
    .select('valor')
    .eq('user_id', userId)
    .eq('ano_fiscal', anoFiscal)
    .eq('is_valid_deduction', true)

  if (error) throw error
  return data.reduce((acc, c) => acc + (c.valor ?? 0), 0)
}

// ─── Imports de IR ────────────────────────────────────────────────────────────

export async function getIrImports(userId: string): Promise<IrImport[]> {
  const { data, error } = await supabase
    .from('ir_imports')
    .select('*')
    .eq('user_id', userId)
    .order('imported_at', { ascending: false })

  if (error) throw error
  return data
}
