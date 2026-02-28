-- Create a policy to prevent deleting protected admin roles
-- This protects the user Francisco Eduardo Gomes Cardoso from having admin removed

CREATE OR REPLACE FUNCTION public.is_protected_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IN (
    '0ec2a4d2-1da5-4e66-b7ff-220a302ae239'::uuid,
    '4246daa9-a70e-4210-af27-f17d630e11c1'::uuid
  )
$$;

-- Drop existing delete policy if exists and create new one with protection
DROP POLICY IF EXISTS "Workspace owners can manage roles" ON public.user_roles;

-- Allow workspace owners to manage roles, but not delete protected admin roles
CREATE POLICY "Workspace owners can manage roles"
ON public.user_roles
FOR ALL
USING (auth.uid() = workspace_owner_id)
WITH CHECK (
  -- For INSERT/UPDATE: allow if user is workspace owner
  auth.uid() = workspace_owner_id
);

-- Create separate delete policy with protection
CREATE POLICY "Cannot delete protected admin roles"
ON public.user_roles
FOR DELETE
USING (
  auth.uid() = workspace_owner_id
  AND NOT (role = 'admin' AND is_protected_admin(user_id))
);