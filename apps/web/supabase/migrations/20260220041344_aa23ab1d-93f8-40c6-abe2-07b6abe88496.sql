
-- Cleanup residual: pages slug duplicate index
DROP INDEX IF EXISTS public.idx_pages_slug;
-- Keep ux_pages_slug

-- email_unsubscribes: consolidate admin SELECT + own SELECT into one
DROP POLICY IF EXISTS "Admins can view all unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "email_unsubscribes_select_own" ON public.email_unsubscribes;

CREATE POLICY "email_unsubscribes_select" ON public.email_unsubscribes
FOR SELECT TO authenticated
USING (
  (select is_admin((select auth.uid())))
  OR user_id = (select auth.uid())
);

-- workspace_members: prevent_self_role_change is intentional (different logic from workspace_members_update)
-- It restricts updates to rows where user_id != auth.uid() (prevents self role change)
-- This is NOT a duplicate — it's a complementary filter. No action needed.
