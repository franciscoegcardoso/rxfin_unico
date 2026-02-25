-- Atualizar função is_protected_admin para incluir o novo admin principal
CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Admins protegidos que nunca podem ser excluídos
  SELECT _user_id IN (
    'b9414650-22c0-46f0-b757-351e6518decb'::uuid  -- franciscoegcardoso@gmail.com (admin principal)
  )
$function$;