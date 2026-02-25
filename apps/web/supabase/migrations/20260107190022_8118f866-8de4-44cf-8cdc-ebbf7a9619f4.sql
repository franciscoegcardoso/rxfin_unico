-- Create wishlist/purchase registry table
CREATE TABLE public.purchase_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  link TEXT,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC,
  purchase_date DATE,
  lancamento_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_registry ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own purchase registry items" 
ON public.purchase_registry 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchase registry items" 
ON public.purchase_registry 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase registry items" 
ON public.purchase_registry 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase registry items" 
ON public.purchase_registry 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_purchase_registry_updated_at
BEFORE UPDATE ON public.purchase_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();