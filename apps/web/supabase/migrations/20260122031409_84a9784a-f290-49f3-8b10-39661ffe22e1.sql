-- Add relationship field to gift_people
ALTER TABLE public.gift_people 
ADD COLUMN relationship TEXT;