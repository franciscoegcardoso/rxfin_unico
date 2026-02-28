
-- =====================================================
-- RX Split + Dividir Conta — Tables & RLS
-- =====================================================

-- 1. rxsplit_contacts
CREATE TABLE public.rxsplit_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  pix_key text,
  avatar_color text DEFAULT 'bg-emerald-500',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rxsplit_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rxsplit_contacts_select" ON public.rxsplit_contacts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_contacts_insert" ON public.rxsplit_contacts
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_contacts_update" ON public.rxsplit_contacts
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_contacts_delete" ON public.rxsplit_contacts
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- 2. rxsplit_groups
CREATE TABLE public.rxsplit_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_main boolean DEFAULT false NOT NULL,
  deadline date,
  limit_total numeric,
  limit_per_user numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rxsplit_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rxsplit_groups_select" ON public.rxsplit_groups
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_groups_insert" ON public.rxsplit_groups
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_groups_update" ON public.rxsplit_groups
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_groups_delete" ON public.rxsplit_groups
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TRIGGER update_rxsplit_groups_updated_at
  BEFORE UPDATE ON public.rxsplit_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. rxsplit_group_members
CREATE TABLE public.rxsplit_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.rxsplit_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.rxsplit_contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'ACCEPTED' NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  UNIQUE (group_id, contact_id)
);

ALTER TABLE public.rxsplit_group_members ENABLE ROW LEVEL SECURITY;

-- RLS via group ownership
CREATE POLICY "rxsplit_group_members_select" ON public.rxsplit_group_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_groups g WHERE g.id = group_id AND g.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_group_members_insert" ON public.rxsplit_group_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rxsplit_groups g WHERE g.id = group_id AND g.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_group_members_update" ON public.rxsplit_group_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_groups g WHERE g.id = group_id AND g.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_group_members_delete" ON public.rxsplit_group_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_groups g WHERE g.id = group_id AND g.user_id = (SELECT auth.uid())));

-- 4. rxsplit_expenses
CREATE TABLE public.rxsplit_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.rxsplit_groups(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  payer_contact_id uuid NOT NULL REFERENCES public.rxsplit_contacts(id) ON DELETE CASCADE,
  split_mode text DEFAULT 'EQUAL' NOT NULL,
  payment_date timestamptz DEFAULT now(),
  bill_split_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rxsplit_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rxsplit_expenses_select" ON public.rxsplit_expenses
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_expenses_insert" ON public.rxsplit_expenses
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_expenses_update" ON public.rxsplit_expenses
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "rxsplit_expenses_delete" ON public.rxsplit_expenses
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- 5. rxsplit_expense_debtors
CREATE TABLE public.rxsplit_expense_debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.rxsplit_expenses(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.rxsplit_contacts(id) ON DELETE CASCADE,
  amount numeric NOT NULL
);

ALTER TABLE public.rxsplit_expense_debtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rxsplit_expense_debtors_select" ON public.rxsplit_expense_debtors
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_expense_debtors_insert" ON public.rxsplit_expense_debtors
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rxsplit_expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_expense_debtors_update" ON public.rxsplit_expense_debtors
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())));
CREATE POLICY "rxsplit_expense_debtors_delete" ON public.rxsplit_expense_debtors
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rxsplit_expenses e WHERE e.id = expense_id AND e.user_id = (SELECT auth.uid())));

-- 6. bill_splits
CREATE TABLE public.bill_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  people jsonb NOT NULL DEFAULT '[]'::jsonb,
  splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  service_charge numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  split_mode text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_splits_select" ON public.bill_splits
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "bill_splits_insert" ON public.bill_splits
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "bill_splits_update" ON public.bill_splits
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "bill_splits_delete" ON public.bill_splits
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Add FK from rxsplit_expenses to bill_splits
ALTER TABLE public.rxsplit_expenses
  ADD CONSTRAINT rxsplit_expenses_bill_split_id_fkey
  FOREIGN KEY (bill_split_id) REFERENCES public.bill_splits(id) ON DELETE SET NULL;
