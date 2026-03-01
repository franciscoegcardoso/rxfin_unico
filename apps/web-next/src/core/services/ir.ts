import { createClient } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/types/supabase'

const supabase = createClient()

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
  return data ?? []
}

export async function createComprovante(comp: IrComprovanteInsert): Promise<IrComprovante> {
  const { data, error } = await supabase
    .from('ir_comprovantes')
    .insert(comp)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteComprovante(id: string): Promise<void> {
  const { error } = await supabase.from('ir_comprovantes').delete().eq('id', id)
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
  return (data ?? []).reduce((acc, c) => acc + ((c as { valor?: number }).valor ?? 0), 0)
}

// ─── Imports de IR ────────────────────────────────────────────────────────────

export async function getIrImports(userId: string): Promise<IrImport[]> {
  const { data, error } = await supabase
    .from('ir_imports')
    .select('*')
    .eq('user_id', userId)
    .order('imported_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
