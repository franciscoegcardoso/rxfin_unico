import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

const supabase = createClient();

export type CreditCardTransaction = Tables<'credit_card_transactions'>;
export type CreditCardBill = Tables<'credit_card_bills'>;
export type CreditCardTransactionInsert = TablesInsert<'credit_card_transactions'>;
export type CreditCardBillUpdate = TablesUpdate<'credit_card_bills'>;

export async function getTransacoesPorFatura(
  userId: string,
  billId: string,
): Promise<CreditCardTransaction[]> {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('credit_card_bill_id', billId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTransacoesPorCartao(
  userId: string,
  cardId: string,
  limit = 50,
): Promise<CreditCardTransaction[]> {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .order('transaction_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getTransacoesNaoCategorizadas(userId: string): Promise<CreditCardTransaction[]> {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_category_confirmed', false)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateTransacao(
  id: string,
  updates: TablesUpdate<'credit_card_transactions'>,
): Promise<CreditCardTransaction> {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function confirmarCategoria(id: string, categoryId: string, categoryName: string) {
  return updateTransacao(id, {
    category_id: categoryId,
    category: categoryName,
    is_category_confirmed: true,
  });
}

export async function getFaturas(userId: string, cardId?: string): Promise<CreditCardBill[]> {
  let query = supabase
    .from('credit_card_bills')
    .select('*')
    .eq('user_id', userId)
    .order('billing_month', { ascending: false });

  if (cardId) query = query.eq('card_id', cardId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getFaturaAtual(userId: string, cardId: string): Promise<CreditCardBill | null> {
  const hoje = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('credit_card_bills')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .lte('closing_date', hoje)
    .order('closing_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function pagarFatura(
  billId: string,
  paidAmount: number,
  paymentSource?: string,
): Promise<CreditCardBill> {
  const { data, error } = await supabase
    .from('credit_card_bills')
    .update({
      status: 'paid',
      paid_amount: paidAmount,
      payment_source: paymentSource,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
