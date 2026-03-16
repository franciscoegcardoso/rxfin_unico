import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinanceCharge {
  id: string;
  type: string;
  amount: number;
  currencyCode: string;
}

export interface BillCategorySummary {
  category: string;
  total: number;
  count: number;
}

export interface TransactionSummary {
  count: number;
  total: number;
  categories: BillCategorySummary[];
}

export interface CreditCardBillDetail {
  id: string;
  card_id: string;
  card_name: string;
  billing_month: string;
  closing_date: string | null;
  due_date: string | null;
  total_value: number;
  paid_amount: number;
  unpaid_amount: number;
  minimum_payment_amount: number | null;
  allows_installments: boolean | null;
  finance_charges: FinanceCharge[] | null;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  payment_source: string | null;
  is_current: boolean;
  is_overdue: boolean;
  days_until_due: number | null;
  connector_name: string;
  connector_image_url: string | null;
  connector_color: string | null;
  credit_limit: number | null;
  available_credit_limit: number | null;
  card_brand: string | null;
  transaction_summary: TransactionSummary | null;
}

export interface BillsDetailTotals {
  current_month_total: number;
  overdue_total: number;
  upcoming_due_7d: number;
}

export interface CreditCardBillsDetailData {
  bills: CreditCardBillDetail[];
  current_bill: CreditCardBillDetail[];
  totals: BillsDetailTotals;
}

async function fetchBillsDetail(
  cardId: string | null,
  month: string | null,
  limit: number
): Promise<CreditCardBillsDetailData> {
  const { data, error } = await supabase.rpc('get_credit_card_bills_detail', {
    p_card_id: cardId,
    p_month: month,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as CreditCardBillsDetailData) ?? { bills: [], current_bill: [], totals: { current_month_total: 0, overdue_total: 0, upcoming_due_7d: 0 } };
}

export function useCreditCardBillsDetail(
  cardId: string | null = null,
  month: string | null = null,
  limit: number = 6
) {
  return useQuery({
    queryKey: ['creditCardBillsDetail', cardId, month, limit],
    queryFn: () => fetchBillsDetail(cardId, month, limit),
    staleTime: 2 * 60 * 1000,
  });
}
