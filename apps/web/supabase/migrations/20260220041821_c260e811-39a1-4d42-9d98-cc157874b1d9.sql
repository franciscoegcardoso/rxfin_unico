
-- =============================================
-- C1: Fix vehicle_fuel_consumption ALL policy
-- Replace ALL policy with specific write operations
-- =============================================

DROP POLICY IF EXISTS vehicle_fuel_consumption_write ON public.vehicle_fuel_consumption;

-- Keep "Anyone can read vehicle fuel consumption data" for SELECT (already exists)

CREATE POLICY "vehicle_fuel_consumption_insert" ON public.vehicle_fuel_consumption
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "vehicle_fuel_consumption_update" ON public.vehicle_fuel_consumption
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "vehicle_fuel_consumption_delete" ON public.vehicle_fuel_consumption
FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

-- =============================================
-- C2: Fix workspace_members prevent_self_role_change
-- Convert from PERMISSIVE to RESTRICTIVE
-- =============================================

DROP POLICY IF EXISTS prevent_self_role_change ON public.workspace_members;

CREATE POLICY prevent_self_role_change ON public.workspace_members
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  user_id <> (select auth.uid())
  OR NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm_old
    WHERE wm_old.id = workspace_members.id
    AND wm_old.role IS DISTINCT FROM workspace_members.role
  )
);
