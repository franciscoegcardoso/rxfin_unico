-- Add forma_pagamento column to lancamentos_realizados
ALTER TABLE public.lancamentos_realizados 
ADD COLUMN forma_pagamento text;