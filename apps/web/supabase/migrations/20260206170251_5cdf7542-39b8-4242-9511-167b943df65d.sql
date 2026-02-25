-- Add unique constraint on phone (partial - only for non-null, non-empty values)
-- This prevents duplicate phone numbers while allowing multiple NULL values
CREATE UNIQUE INDEX unique_phone_number ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Add a comment for documentation
COMMENT ON INDEX unique_phone_number IS 'Ensures each phone number is unique across profiles (ignores NULL and empty values)';