-- Create budget_packages table for tracking temporary budgets (trips, projects, etc.)
CREATE TABLE public.budget_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_goal NUMERIC,
  has_budget_goal BOOLEAN NOT NULL DEFAULT true,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.budget_packages ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own packages" 
ON public.budget_packages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own packages" 
ON public.budget_packages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packages" 
ON public.budget_packages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packages" 
ON public.budget_packages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create budget_package_transactions table to link transactions to packages
CREATE TABLE public.budget_package_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.budget_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  responsible_person_id TEXT,
  responsible_person_name TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.budget_package_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own package transactions" 
ON public.budget_package_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own package transactions" 
ON public.budget_package_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own package transactions" 
ON public.budget_package_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own package transactions" 
ON public.budget_package_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on budget_packages
CREATE TRIGGER update_budget_packages_updated_at
BEFORE UPDATE ON public.budget_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();