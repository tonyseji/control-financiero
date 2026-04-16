-- Migration 016: Allow users to deactivate their own demo data
-- Problem: user_demo_access_own policy only covers SELECT.
--          The frontend calls clearDemoData() which does UPDATE uda_is_active = false.
--          Without an UPDATE policy, RLS blocks this with permission denied.
-- Solution: Add UPDATE policy scoped to the user's own rows.

CREATE POLICY "user_demo_access_own_update" ON user_demo_access
  FOR UPDATE
  USING (uda_user_id = auth.uid() AND is_valid_user())
  WITH CHECK (uda_user_id = auth.uid());
