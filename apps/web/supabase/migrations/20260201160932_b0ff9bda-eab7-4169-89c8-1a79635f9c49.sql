-- 1. Update is_protected_admin function to only protect the main admin
CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _user_id IN (
    '0ec2a4d2-1da5-4e66-b7ff-220a302ae239'::uuid
  )
$function$;

-- 2. Delete user_roles for all test users
DELETE FROM public.user_roles 
WHERE user_id IN (
  '4246daa9-a70e-4210-af27-f17d630e11c1'::uuid,
  '7f536978-52ef-4ed0-b469-4678e6386679'::uuid,
  '5efe7ea8-a5b8-4505-b817-e6e854f5f9d6'::uuid,
  'b72171b2-4267-4c71-831a-dc1f0ec269e3'::uuid
);

-- 3. Soft delete and anonymize all test users
UPDATE public.profiles 
SET 
  deleted_at = now(),
  is_active = false,
  email = 'deleted_' || id || '@deleted.local',
  full_name = '[Usuário Excluído - Teste]',
  phone = NULL,
  admin_notes = COALESCE(admin_notes, '') || E'\n[DELETED] Test user removed at: ' || now()::text
WHERE id IN (
  '4246daa9-a70e-4210-af27-f17d630e11c1'::uuid,
  '7f536978-52ef-4ed0-b469-4678e6386679'::uuid,
  '5efe7ea8-a5b8-4505-b817-e6e854f5f9d6'::uuid,
  'b72171b2-4267-4c71-831a-dc1f0ec269e3'::uuid
);

-- 4. Log the deletions in audit log
INSERT INTO public.deletion_audit_log (user_id, action, entity_type, entity_id, entity_name, details)
VALUES 
  ('0ec2a4d2-1da5-4e66-b7ff-220a302ae239', 'test_user_cleanup', 'profile', '4246daa9-a70e-4210-af27-f17d630e11c1', 'Francisco Eduardo Gomes Cardoso', '{"reason": "Test user removal"}'::jsonb),
  ('0ec2a4d2-1da5-4e66-b7ff-220a302ae239', 'test_user_cleanup', 'profile', '7f536978-52ef-4ed0-b469-4678e6386679', 'sdfsfsdfsd', '{"reason": "Test user removal"}'::jsonb),
  ('0ec2a4d2-1da5-4e66-b7ff-220a302ae239', 'test_user_cleanup', 'profile', '5efe7ea8-a5b8-4505-b817-e6e854f5f9d6', 'tgest', '{"reason": "Test user removal"}'::jsonb),
  ('0ec2a4d2-1da5-4e66-b7ff-220a302ae239', 'test_user_cleanup', 'profile', 'b72171b2-4267-4c71-831a-dc1f0ec269e3', 'Francisco', '{"reason": "Test user removal"}'::jsonb);