
-- ============================================================
-- FASE 2: Consolidar Políticas Permissivas Duplicadas
-- ============================================================

-- ============================================================
-- 2A: email_campaigns — campaigns_owners_all (ALL) + admin policies per operation
-- campaigns_owners_all covers ALL operations for workspace owners
-- Admin policies cover each operation for admins
-- Consolidate: drop the ALL policy and individual admin policies, create one per operation
-- ============================================================

DROP POLICY IF EXISTS "campaigns_owners_all" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can create campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.email_campaigns;

CREATE POLICY "email_campaigns_select" ON public.email_campaigns
FOR SELECT TO authenticated
USING (
  (select is_admin((select auth.uid())))
  OR EXISTS (SELECT 1 FROM workspaces WHERE workspaces.owner_id = (select auth.uid()))
);

CREATE POLICY "email_campaigns_insert" ON public.email_campaigns
FOR INSERT TO authenticated
WITH CHECK (
  (select is_admin((select auth.uid())))
  OR EXISTS (SELECT 1 FROM workspaces WHERE workspaces.owner_id = (select auth.uid()))
);

CREATE POLICY "email_campaigns_update" ON public.email_campaigns
FOR UPDATE TO authenticated
USING (
  (select is_admin((select auth.uid())))
  OR EXISTS (SELECT 1 FROM workspaces WHERE workspaces.owner_id = (select auth.uid()))
);

CREATE POLICY "email_campaigns_delete" ON public.email_campaigns
FOR DELETE TO authenticated
USING (
  (select is_admin((select auth.uid())))
  OR EXISTS (SELECT 1 FROM workspaces WHERE workspaces.owner_id = (select auth.uid()))
);

-- ============================================================
-- 2B: guest_invitations — 3 SELECT, 3 UPDATE, 2 INSERT, 2 DELETE
-- Admins can manage all invitations (ALL) + individual role policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Guests can view invitations sent to them" ON public.guest_invitations;
DROP POLICY IF EXISTS "Principals can view their own invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Principals can create invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Guests can update invitations sent to them" ON public.guest_invitations;
DROP POLICY IF EXISTS "Principals can update their own invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Principals can delete their own invitations" ON public.guest_invitations;

CREATE POLICY "guest_invitations_select" ON public.guest_invitations
FOR SELECT TO public
USING (
  (select is_admin((select auth.uid())))
  OR guest_user_id = (select auth.uid())
  OR guest_email = (SELECT email FROM profiles WHERE id = (select auth.uid()))
  OR principal_user_id = (select auth.uid())
);

CREATE POLICY "guest_invitations_insert" ON public.guest_invitations
FOR INSERT TO public
WITH CHECK (
  (select is_admin((select auth.uid())))
  OR principal_user_id = (select auth.uid())
);

CREATE POLICY "guest_invitations_update" ON public.guest_invitations
FOR UPDATE TO public
USING (
  (select is_admin((select auth.uid())))
  OR guest_user_id = (select auth.uid())
  OR principal_user_id = (select auth.uid())
);

CREATE POLICY "guest_invitations_delete" ON public.guest_invitations
FOR DELETE TO public
USING (
  (select is_admin((select auth.uid())))
  OR principal_user_id = (select auth.uid())
);

-- ============================================================
-- 2C: user_roles — 4 SELECT, 2 INSERT (via ALL), 2 UPDATE, 2 DELETE
-- "Admins can manage all roles" (ALL) + individual policies
-- "Cannot delete protected admin roles" — keep separate logic in consolidated DELETE
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Workspace owners can read roles" ON public.user_roles;
-- Note: "Workspace owners can insert roles" was already recreated in Fase 1
DROP POLICY IF EXISTS "Workspace owners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Cannot delete protected admin roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT TO public
USING (
  (select is_admin((select auth.uid())))
  OR user_id = (select auth.uid())
  OR workspace_owner_id = (select auth.uid())
);

-- INSERT already handled by "Workspace owners can insert roles" from Fase 1
-- But we need admin insert too:
DROP POLICY IF EXISTS "Workspace owners can insert roles" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
FOR INSERT TO public
WITH CHECK (
  (select is_admin((select auth.uid())))
  OR workspace_owner_id = (select auth.uid())
);

CREATE POLICY "user_roles_update" ON public.user_roles
FOR UPDATE TO public
USING (
  (select is_admin((select auth.uid())))
  OR workspace_owner_id = (select auth.uid())
)
WITH CHECK (
  (select is_admin((select auth.uid())))
  OR workspace_owner_id = (select auth.uid())
);

-- DELETE: admin + workspace owner, but NOT protected admins
CREATE POLICY "user_roles_delete" ON public.user_roles
FOR DELETE TO public
USING (
  (
    (select is_admin((select auth.uid())))
    OR workspace_owner_id = (select auth.uid())
  )
  AND NOT (role = 'admin'::app_role AND is_protected_admin(user_id))
);

-- ============================================================
-- 2D: subscription_plans — DROP duplicate INSERT + consolidate 3 SELECT
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert plans" ON public.subscription_plans;
-- "Only admins can insert subscription plans" already fixed in Fase 1

DROP POLICY IF EXISTS "Admins can view all plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active public plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON public.subscription_plans;

CREATE POLICY "subscription_plans_select" ON public.subscription_plans
FOR SELECT
USING (
  is_active = true
  OR (select is_admin((select auth.uid())))
);

-- ============================================================
-- 2D: workspace_members — members_all_operations (ALL) + members_select (SELECT)
-- prevent_self_role_change is a separate UPDATE policy (acts as filter)
-- ============================================================

DROP POLICY IF EXISTS "members_all_operations" ON public.workspace_members;
DROP POLICY IF EXISTS "members_select" ON public.workspace_members;
-- Keep prevent_self_role_change as-is (separate restrictive-like logic)

CREATE POLICY "workspace_members_select" ON public.workspace_members
FOR SELECT TO public
USING (
  user_id = (select auth.uid())
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid()))
);

CREATE POLICY "workspace_members_insert" ON public.workspace_members
FOR INSERT TO public
WITH CHECK (
  user_id = (select auth.uid())
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid()))
);

CREATE POLICY "workspace_members_update" ON public.workspace_members
FOR UPDATE TO public
USING (
  user_id = (select auth.uid())
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid()))
);

CREATE POLICY "workspace_members_delete" ON public.workspace_members
FOR DELETE TO public
USING (
  user_id = (select auth.uid())
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid()))
);

-- ============================================================
-- 2D: leads — DROP duplicate "Admins can view leads"
-- "Admins can manage leads" (ALL) already covers everything
-- ============================================================

DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;

-- ============================================================
-- 2D: tour_analytics — consolidate 2 SELECT into 1
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all tour analytics" ON public.tour_analytics;
DROP POLICY IF EXISTS "Users can view own tour analytics" ON public.tour_analytics;

CREATE POLICY "tour_analytics_select" ON public.tour_analytics
FOR SELECT TO public
USING (
  (select is_admin((select auth.uid())))
  OR user_id = (select auth.uid())
);

-- ============================================================
-- 2D: user_consents — consolidate 2 SELECT into 1
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can view their own consents" ON public.user_consents;

CREATE POLICY "user_consents_select" ON public.user_consents
FOR SELECT TO public
USING (
  (select is_admin((select auth.uid())))
  OR user_id = (select auth.uid())
);

-- ============================================================
-- 2D: driver_vehicle_access — consolidate 2 SELECT
-- "Workspace owners can manage vehicle access" (ALL) + "Drivers can view" (SELECT)
-- ============================================================

DROP POLICY IF EXISTS "Workspace owners can manage vehicle access" ON public.driver_vehicle_access;
DROP POLICY IF EXISTS "Drivers can view their own vehicle access" ON public.driver_vehicle_access;

CREATE POLICY "driver_vehicle_access_select" ON public.driver_vehicle_access
FOR SELECT TO public
USING (
  driver_user_id = (select auth.uid())
  OR workspace_owner_id = (select auth.uid())
);

CREATE POLICY "driver_vehicle_access_insert" ON public.driver_vehicle_access
FOR INSERT TO public
WITH CHECK (workspace_owner_id = (select auth.uid()));

CREATE POLICY "driver_vehicle_access_update" ON public.driver_vehicle_access
FOR UPDATE TO public
USING (workspace_owner_id = (select auth.uid()));

CREATE POLICY "driver_vehicle_access_delete" ON public.driver_vehicle_access
FOR DELETE TO public
USING (workspace_owner_id = (select auth.uid()));

-- ============================================================
-- 2D: vehicle_fuel_consumption — DROP "User owner policy" (ALL)
-- "Anyone can read..." already covers SELECT for everyone
-- Keep owner-only write via new policies
-- ============================================================

DROP POLICY IF EXISTS "User owner policy" ON public.vehicle_fuel_consumption;
-- "Anyone can read vehicle fuel consumption data" stays for SELECT

CREATE POLICY "vehicle_fuel_consumption_write" ON public.vehicle_fuel_consumption
FOR ALL TO public
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 2D: email_unsubscribes — DROP "unsubscribes_own" (ALL)
-- Keep specific policies for admin SELECT + auth INSERT
-- ============================================================

DROP POLICY IF EXISTS "unsubscribes_own" ON public.email_unsubscribes;
-- "Admins can view all unsubscribes" stays for admin SELECT
-- "Authenticated users can unsubscribe themselves" stays for INSERT

-- Add missing SELECT for own records:
CREATE POLICY "email_unsubscribes_select_own" ON public.email_unsubscribes
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Add UPDATE/DELETE for own records:
CREATE POLICY "email_unsubscribes_manage_own" ON public.email_unsubscribes
FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));
