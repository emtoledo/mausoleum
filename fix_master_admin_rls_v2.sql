-- Fix RLS policies for master_admins table - Simplified Version
-- This removes the circular dependency by removing the problematic policy

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Master admins can view all master admins" ON master_admins;
DROP POLICY IF EXISTS "Users can check own master admin status" ON master_admins;
DROP POLICY IF EXISTS "Master admins can update own record" ON master_admins;

-- CRITICAL: Allow users to check their own master admin status
-- This is the ONLY policy needed for the isMasterAdmin() check to work
-- Without this, users can't check if they're a master admin
CREATE POLICY "Users can check own master admin status"
  ON master_admins FOR SELECT
  USING (id = auth.uid());

-- Allow master admins to update own record
CREATE POLICY "Master admins can update own record"
  ON master_admins FOR UPDATE
  USING (id = auth.uid());

-- Note: We're removing the "view all master admins" policy because
-- it creates a circular dependency (the EXISTS subquery queries master_admins
-- which is still subject to RLS). For now, users can only check their own status.
-- If you need to view all master admins later, we can use a PostgreSQL function
-- or a service role query instead.

