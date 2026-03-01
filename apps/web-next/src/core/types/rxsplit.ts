// RX Split & Bill Split types

export interface RXSplitContact {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  pix_key: string | null;
  avatar_color: string;
  created_at: string;
}

export interface RXSplitGroup {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  is_main: boolean;
  is_favorite: boolean;
  deadline: string | null;
  limit_total: number | null;
  limit_per_user: number | null;
  created_at: string;
  updated_at: string;
}

export interface RXSplitGroupMember {
  id: string;
  group_id: string;
  contact_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface RXSplitExpense {
  id: string;
  user_id: string;
  group_id: string | null;
  description: string;
  amount: number;
  payer_contact_id: string;
  split_mode: string;
  payment_date: string | null;
  bill_split_id: string | null;
  establishment_name: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface RXSplitExpenseDebtor {
  id: string;
  expense_id: string;
  contact_id: string;
  amount: number;
}

export interface RXSplitPayment {
  from: string;
  to: string;
  amount: number;
  toPix?: string;
}

export interface BillSplitItem {
  description: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BillSplitPerson {
  id: number;
  name: string;
  phone?: string;
}

export interface BillSplitPersonSplit {
  personId: number;
  name: string;
  amount: number;
  paid: number;
  phone?: string;
}

export interface BillSplit {
  id: string;
  user_id: string;
  items: BillSplitItem[];
  people: BillSplitPerson[];
  splits: BillSplitPersonSplit[];
  subtotal: number;
  service_charge: number;
  grand_total: number;
  split_mode: string | null;
  created_at: string;
}
