-- Add file tracking columns to ir_imports
ALTER TABLE public.ir_imports 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT;