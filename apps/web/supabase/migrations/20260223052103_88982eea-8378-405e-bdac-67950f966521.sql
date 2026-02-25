
-- Update is_protected_admin to include contato@rxfin.com.br
CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT _user_id IN (
    'b9414650-22c0-46f0-b757-351e6518decb'::uuid,  -- franciscoegcardoso@gmail.com
    'fc53ca35-d897-4cb3-a32f-df3b76c8cb49'::uuid   -- contato@rxfin.com.br
  )
$$;
