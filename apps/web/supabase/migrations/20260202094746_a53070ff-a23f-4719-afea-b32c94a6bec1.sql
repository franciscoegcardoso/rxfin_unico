-- =========================================================
-- USER INCOME ITEMS (Receitas personalizadas do usuário)
-- =========================================================
CREATE TABLE public.user_income_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    default_item_id TEXT REFERENCES public.default_income_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'net',
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_stock_compensation BOOLEAN NOT NULL DEFAULT false,
    responsible_person_id TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_income_items ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own items
CREATE POLICY "Users can view their own income items"
ON public.user_income_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income items"
ON public.user_income_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income items"
ON public.user_income_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income items"
ON public.user_income_items FOR DELETE
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_user_income_items_updated_at
    BEFORE UPDATE ON public.user_income_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER EXPENSE ITEMS (Despesas personalizadas do usuário)
-- =========================================================
CREATE TABLE public.user_expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    default_item_id TEXT REFERENCES public.default_expense_items(id) ON DELETE SET NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'variable_non_essential',
    expense_nature TEXT NOT NULL DEFAULT 'variable',
    recurrence_type TEXT NOT NULL DEFAULT 'monthly',
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    payment_method TEXT NOT NULL DEFAULT 'credit_card',
    enabled BOOLEAN NOT NULL DEFAULT true,
    responsible_person_id TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_expense_items ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own items
CREATE POLICY "Users can view their own expense items"
ON public.user_expense_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense items"
ON public.user_expense_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense items"
ON public.user_expense_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense items"
ON public.user_expense_items FOR DELETE
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_user_expense_items_updated_at
    BEFORE UPDATE ON public.user_expense_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index for better query performance
CREATE INDEX idx_user_income_items_user_id ON public.user_income_items(user_id);
CREATE INDEX idx_user_expense_items_user_id ON public.user_expense_items(user_id);