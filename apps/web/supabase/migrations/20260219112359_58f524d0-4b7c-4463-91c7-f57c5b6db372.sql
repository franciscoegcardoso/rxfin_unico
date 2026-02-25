
-- Drop the incorrect UNIQUE index on fipe_code (same fipe_code can have multiple years)
DROP INDEX IF EXISTS public.idx_fipe_catalog_code;

-- Create a non-unique index for fast lookups by fipe_code
CREATE INDEX IF NOT EXISTS idx_fipe_catalog_fipe_code ON public.fipe_catalog (fipe_code);
