
-- ============================================================
-- FASE 1 — LOTE 3: gift_*, guest_invitations, ir_*, monthly_goals, notifications, profiles
-- ============================================================

-- === gift_assignments ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_assignments;
CREATE POLICY "User owner policy" ON public.gift_assignments FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own gift assignments" ON public.gift_assignments;
CREATE POLICY "Users can delete their own gift assignments" ON public.gift_assignments FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own gift assignments" ON public.gift_assignments;
CREATE POLICY "Users can view their own gift assignments" ON public.gift_assignments FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own gift assignments" ON public.gift_assignments;
CREATE POLICY "Users can update their own gift assignments" ON public.gift_assignments FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own gift assignments" ON public.gift_assignments;
CREATE POLICY "Users can insert their own gift assignments" ON public.gift_assignments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === gift_events ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_events;
CREATE POLICY "User owner policy" ON public.gift_events FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own gift events" ON public.gift_events;
CREATE POLICY "Users can delete their own gift events" ON public.gift_events FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own gift events" ON public.gift_events;
CREATE POLICY "Users can view their own gift events" ON public.gift_events FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own gift events" ON public.gift_events;
CREATE POLICY "Users can update their own gift events" ON public.gift_events FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own gift events" ON public.gift_events;
CREATE POLICY "Users can insert their own gift events" ON public.gift_events FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === gift_people ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_people;
CREATE POLICY "User owner policy" ON public.gift_people FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own gift people" ON public.gift_people;
CREATE POLICY "Users can delete their own gift people" ON public.gift_people FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own gift people" ON public.gift_people;
CREATE POLICY "Users can view their own gift people" ON public.gift_people FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own gift people" ON public.gift_people;
CREATE POLICY "Users can update their own gift people" ON public.gift_people FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own gift people" ON public.gift_people;
CREATE POLICY "Users can insert their own gift people" ON public.gift_people FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === guest_invitations ===
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.guest_invitations;
CREATE POLICY "Admins can manage all invitations" ON public.guest_invitations FOR ALL USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Principals can delete their own invitations" ON public.guest_invitations;
CREATE POLICY "Principals can delete their own invitations" ON public.guest_invitations FOR DELETE USING ((select auth.uid()) = principal_user_id);
DROP POLICY IF EXISTS "Principals can view their own invitations" ON public.guest_invitations;
CREATE POLICY "Principals can view their own invitations" ON public.guest_invitations FOR SELECT USING ((select auth.uid()) = principal_user_id);
DROP POLICY IF EXISTS "Principals can update their own invitations" ON public.guest_invitations;
CREATE POLICY "Principals can update their own invitations" ON public.guest_invitations FOR UPDATE USING ((select auth.uid()) = principal_user_id);
DROP POLICY IF EXISTS "Principals can create invitations" ON public.guest_invitations;
CREATE POLICY "Principals can create invitations" ON public.guest_invitations FOR INSERT WITH CHECK ((select auth.uid()) = principal_user_id);
DROP POLICY IF EXISTS "Guests can view invitations sent to them" ON public.guest_invitations;
CREATE POLICY "Guests can view invitations sent to them" ON public.guest_invitations FOR SELECT USING (guest_user_id = (select auth.uid()) OR guest_email = (SELECT email FROM profiles WHERE id = (select auth.uid())));
DROP POLICY IF EXISTS "Guests can update invitations sent to them" ON public.guest_invitations;
CREATE POLICY "Guests can update invitations sent to them" ON public.guest_invitations FOR UPDATE USING (guest_user_id = (select auth.uid()) OR guest_email = (SELECT email FROM profiles WHERE id = (select auth.uid())));

-- === ir_comprovantes ===
DROP POLICY IF EXISTS "User owner policy" ON public.ir_comprovantes;
CREATE POLICY "User owner policy" ON public.ir_comprovantes FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can delete their own comprovantes" ON public.ir_comprovantes FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can delete their own ir_comprovantes" ON public.ir_comprovantes FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can view their own ir_comprovantes" ON public.ir_comprovantes FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can update their own comprovantes" ON public.ir_comprovantes FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can update their own ir_comprovantes" ON public.ir_comprovantes FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can insert their own ir_comprovantes" ON public.ir_comprovantes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === ir_fiscal_chat ===
DROP POLICY IF EXISTS "User owner policy" ON public.ir_fiscal_chat;
CREATE POLICY "User owner policy" ON public.ir_fiscal_chat FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.ir_fiscal_chat;
CREATE POLICY "Users can delete their own chat messages" ON public.ir_fiscal_chat FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can delete their own ir_fiscal_chat" ON public.ir_fiscal_chat FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.ir_fiscal_chat;
CREATE POLICY "Users can view their own chat messages" ON public.ir_fiscal_chat FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can view their own ir_fiscal_chat" ON public.ir_fiscal_chat FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can update their own ir_fiscal_chat" ON public.ir_fiscal_chat FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can insert their own ir_fiscal_chat" ON public.ir_fiscal_chat FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === ir_imports ===
DROP POLICY IF EXISTS "User owner policy" ON public.ir_imports;
CREATE POLICY "User owner policy" ON public.ir_imports FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own IR imports" ON public.ir_imports;
CREATE POLICY "Users can delete their own IR imports" ON public.ir_imports FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can delete their own ir_imports" ON public.ir_imports FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can view their own ir_imports" ON public.ir_imports FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own IR imports" ON public.ir_imports;
CREATE POLICY "Users can update their own IR imports" ON public.ir_imports FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can update their own ir_imports" ON public.ir_imports FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can insert their own ir_imports" ON public.ir_imports FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === monthly_goals ===
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.monthly_goals;
CREATE POLICY "Users can delete their own goals" ON public.monthly_goals FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own goals" ON public.monthly_goals;
CREATE POLICY "Users can view their own goals" ON public.monthly_goals FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own goals" ON public.monthly_goals;
CREATE POLICY "Users can update their own goals" ON public.monthly_goals FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.monthly_goals;
CREATE POLICY "Users can insert their own goals" ON public.monthly_goals FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === notification_dismissals ===
DROP POLICY IF EXISTS "Users can delete own dismissals" ON public.notification_dismissals;
CREATE POLICY "Users can delete own dismissals" ON public.notification_dismissals FOR DELETE USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Users can view own dismissals" ON public.notification_dismissals;
CREATE POLICY "Users can view own dismissals" ON public.notification_dismissals FOR SELECT USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Users can insert own dismissals" ON public.notification_dismissals;
CREATE POLICY "Users can insert own dismissals" ON public.notification_dismissals FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- === notification_reads ===
DROP POLICY IF EXISTS "Users can delete own reads" ON public.notification_reads;
CREATE POLICY "Users can delete own reads" ON public.notification_reads FOR DELETE USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Users can view own reads" ON public.notification_reads;
CREATE POLICY "Users can view own reads" ON public.notification_reads FOR SELECT USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Users can insert own reads" ON public.notification_reads;
CREATE POLICY "Users can insert own reads" ON public.notification_reads FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- === notifications ===
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (target_user_id = (select auth.uid()) OR target_user_id IS NULL);

-- === profiles ===
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((select auth.uid()) = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);
