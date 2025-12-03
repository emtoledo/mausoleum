-- Fix RLS policies for master_admins table
-- This allows users to check if they are a master admin without being blocked by RLS

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Master admins can view all master admins" ON master_admins;
DROP POLICY IF EXISTS "Users can check own master admin status" ON master_admins;
DROP POLICY IF EXISTS "Master admins can update own record" ON master_admins;

-- CRITICAL: Allow users to check their own master admin status
-- This must be the first policy and allows the circular check to work
CREATE POLICY "Users can check own master admin status"
  ON master_admins FOR SELECT
  USING (id = auth.uid());

-- Allow master admins to view all master admins
-- Note: This works because the first policy allows checking own status,
-- which enables the EXISTS subquery to work
CREATE POLICY "Master admins can view all master admins"
  ON master_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM master_admins ma
      WHERE ma.id = auth.uid()
    )
  );

-- Allow master admins to update own record
CREATE POLICY "Master admins can update own record"
  ON master_admins FOR UPDATE
  USING (id = auth.uid());

