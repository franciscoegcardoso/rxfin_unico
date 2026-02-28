-- =========================================================
-- DEFAULT INCOME ITEMS (Parâmetros de Receita Default)
-- =========================================================
CREATE TABLE public.default_income_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'net',
    enabled_by_default BOOLEAN NOT NULL DEFAULT true,
    is_stock_compensation BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_income_items ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only admins can modify
CREATE POLICY "Default income items are viewable by everyone"
ON public.default_income_items FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert default income items"
ON public.default_income_items FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update default income items"
ON public.default_income_items FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete default income items"
ON public.default_income_items FOR DELETE
USING (is_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_default_income_items_updated_at
    BEFORE UPDATE ON public.default_income_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- DEFAULT EXPENSE ITEMS (Parâmetros de Despesa Default)
-- =========================================================
CREATE TABLE public.default_expense_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'variable_non_essential',
    expense_nature TEXT NOT NULL DEFAULT 'variable',
    recurrence_type TEXT NOT NULL DEFAULT 'monthly',
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    payment_method TEXT NOT NULL DEFAULT 'credit_card',
    enabled_by_default BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_expense_items ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only admins can modify
CREATE POLICY "Default expense items are viewable by everyone"
ON public.default_expense_items FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert default expense items"
ON public.default_expense_items FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update default expense items"
ON public.default_expense_items FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete default expense items"
ON public.default_expense_items FOR DELETE
USING (is_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_default_expense_items_updated_at
    BEFORE UPDATE ON public.default_expense_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- EXPENSE CATEGORIES (Categorias de Despesa)
-- =========================================================
CREATE TABLE public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reference TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Expense categories are viewable by everyone"
ON public.expense_categories FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert expense categories"
ON public.expense_categories FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update expense categories"
ON public.expense_categories FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete expense categories"
ON public.expense_categories FOR DELETE
USING (is_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();