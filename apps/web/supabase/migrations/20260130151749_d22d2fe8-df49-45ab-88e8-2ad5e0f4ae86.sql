-- Add additional useful columns to simulators table
ALTER TABLE public.simulators 
ADD COLUMN IF NOT EXISTS path text,
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;