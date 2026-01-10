-- ============================================
-- Phase 10: Location-Based RLS Policy Updates
-- ============================================
-- This migration updates Row Level Security policies to support
-- location-based access control for multi-tenant functionality.
--
-- Key concepts:
-- - Global resources: location_id IS NULL (managed by master admins only)
-- - Location resources: location_id = specific UUID (managed by location admins)
-- - Master admins: Have full access to everything
-- - Location admins: role = 'admin' in user_accounts, can manage their location's resources
-- - Regular users: Can view active resources, manage their own projects
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- Helper: Create function to check if user is master admin
-- (Avoids repeated subqueries and prevents recursion issues)
-- ============================================

CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM master_admins WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper: Get user's location_id safely
-- ============================================

CREATE OR REPLACE FUNCTION get_user_location_id()
RETURNS UUID AS $$
DECLARE
  loc_id UUID;
BEGIN
  SELECT location_id INTO loc_id FROM user_accounts WHERE id = auth.uid();
  RETURN loc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper: Check if user is a location admin
-- ============================================

CREATE OR REPLACE FUNCTION is_location_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_accounts 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper: Check if user is admin for a specific location
-- ============================================

CREATE OR REPLACE FUNCTION is_admin_for_location(check_location_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Master admins have access to all locations
  IF is_master_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Location admins only have access to their own location
  RETURN EXISTS (
    SELECT 1 FROM user_accounts 
    WHERE id = auth.uid() 
      AND role = 'admin' 
      AND location_id = check_location_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 1. USER_ACCOUNTS RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Master admins can manage user accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can read own account" ON user_accounts;
DROP POLICY IF EXISTS "Users can update own account" ON user_accounts;
DROP POLICY IF EXISTS "Location admins can view location users" ON user_accounts;

-- Users can always read their own account
CREATE POLICY "Users can read own account"
  ON user_accounts FOR SELECT
  USING (id = auth.uid());

-- Users can update their own account (limited fields via application logic)
CREATE POLICY "Users can update own account"
  ON user_accounts FOR UPDATE
  USING (id = auth.uid());

-- Master admins can do everything with user accounts
CREATE POLICY "Master admins can manage all user accounts"
  ON user_accounts FOR ALL
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Location admins can view users in their location (but not modify)
CREATE POLICY "Location admins can view location users"
  ON user_accounts FOR SELECT
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
  );

-- ============================================
-- 2. PROJECTS RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Users can view their own projects
-- Master admins can view all projects
-- Location admins can view all projects in their location
CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (
    user_account_id = auth.uid()
    OR is_master_admin()
    OR (
      is_location_admin() 
      AND location_id = get_user_location_id()
    )
  );

-- Users can create projects (assigned to their location automatically by app)
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    user_account_id = auth.uid()
  );

-- Users can update their own projects
-- Master admins can update any project
-- Location admins can update projects in their location
CREATE POLICY "Users can update projects"
  ON projects FOR UPDATE
  USING (
    user_account_id = auth.uid()
    OR is_master_admin()
    OR (
      is_location_admin() 
      AND location_id = get_user_location_id()
    )
  );

-- Users can delete their own projects
-- Master admins can delete any project
-- Location admins can delete projects in their location
CREATE POLICY "Users can delete projects"
  ON projects FOR DELETE
  USING (
    user_account_id = auth.uid()
    OR is_master_admin()
    OR (
      is_location_admin() 
      AND location_id = get_user_location_id()
    )
  );

-- ============================================
-- 3. PRODUCTS RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Master admins can manage products" ON products;

-- All authenticated users can view:
-- - Active global products (location_id IS NULL)
-- - Active products from their location
-- Master admins and location admins can view all products
CREATE POLICY "Users can view products"
  ON products FOR SELECT
  USING (
    -- Master admins see everything
    is_master_admin()
    OR
    -- Location admins see their location's products + global
    (is_location_admin() AND (location_id IS NULL OR location_id = get_user_location_id()))
    OR
    -- Regular users see active global products + active products from their location
    (
      is_active = true 
      AND (
        location_id IS NULL 
        OR location_id = get_user_location_id()
      )
    )
  );

-- Master admins can manage all products
CREATE POLICY "Master admins can manage all products"
  ON products FOR ALL
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Location admins can manage their location's products (not global ones)
CREATE POLICY "Location admins can manage location products"
  ON products FOR INSERT
  WITH CHECK (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot create global products
  );

CREATE POLICY "Location admins can update location products"
  ON products FOR UPDATE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot update global products
  );

CREATE POLICY "Location admins can delete location products"
  ON products FOR DELETE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot delete global products
  );

-- ============================================
-- 4. ARTWORK RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active artwork" ON artwork;
DROP POLICY IF EXISTS "Master admins can manage artwork" ON artwork;

-- All authenticated users can view:
-- - Active global artwork (location_id IS NULL)
-- - Active artwork from their location
-- Master admins and location admins can view all artwork
CREATE POLICY "Users can view artwork"
  ON artwork FOR SELECT
  USING (
    -- Master admins see everything
    is_master_admin()
    OR
    -- Location admins see their location's artwork + global
    (is_location_admin() AND (location_id IS NULL OR location_id = get_user_location_id()))
    OR
    -- Regular users see active global artwork + active artwork from their location
    (
      is_active = true 
      AND (
        location_id IS NULL 
        OR location_id = get_user_location_id()
      )
    )
  );

-- Master admins can manage all artwork
CREATE POLICY "Master admins can manage all artwork"
  ON artwork FOR ALL
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Location admins can manage their location's artwork (not global ones)
CREATE POLICY "Location admins can manage location artwork"
  ON artwork FOR INSERT
  WITH CHECK (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot create global artwork
  );

CREATE POLICY "Location admins can update location artwork"
  ON artwork FOR UPDATE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot update global artwork
  );

CREATE POLICY "Location admins can delete location artwork"
  ON artwork FOR DELETE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot delete global artwork
  );

-- ============================================
-- 5. ARTWORK_TEMPLATES RLS Updates
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE artwork_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Master admins can manage artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Users can view artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Master admins can manage all artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Location admins can manage location artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Location admins can update location artwork templates" ON artwork_templates;
DROP POLICY IF EXISTS "Location admins can delete location artwork templates" ON artwork_templates;

-- All authenticated users can view:
-- - Global templates (location_id IS NULL)
-- - Templates from their location
-- Master admins and location admins can view all templates
CREATE POLICY "Users can view artwork templates"
  ON artwork_templates FOR SELECT
  USING (
    -- Master admins see everything
    is_master_admin()
    OR
    -- Location admins see their location's templates + global
    (is_location_admin() AND (location_id IS NULL OR location_id = get_user_location_id()))
    OR
    -- Regular users see global templates + templates from their location
    (
      location_id IS NULL 
      OR location_id = get_user_location_id()
    )
  );

-- Master admins can manage all templates
CREATE POLICY "Master admins can manage all artwork templates"
  ON artwork_templates FOR ALL
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Location admins can manage their location's templates (not global ones)
CREATE POLICY "Location admins can manage location artwork templates"
  ON artwork_templates FOR INSERT
  WITH CHECK (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot create global templates
  );

CREATE POLICY "Location admins can update location artwork templates"
  ON artwork_templates FOR UPDATE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot update global templates
  );

CREATE POLICY "Location admins can delete location artwork templates"
  ON artwork_templates FOR DELETE
  USING (
    is_location_admin() 
    AND location_id = get_user_location_id()
    AND location_id IS NOT NULL  -- Cannot delete global templates
  );

-- ============================================
-- 6. PROJECT_DETAILS RLS Updates
-- (Follows project access - if you can see the project, you can see its details)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own project details" ON project_details;
DROP POLICY IF EXISTS "Users can create own project details" ON project_details;
DROP POLICY IF EXISTS "Users can update own project details" ON project_details;
DROP POLICY IF EXISTS "Users can delete own project details" ON project_details;

CREATE POLICY "Users can view project details"
  ON project_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

CREATE POLICY "Users can create project details"
  ON project_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project details"
  ON project_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

CREATE POLICY "Users can delete project details"
  ON project_details FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

-- ============================================
-- 7. PROJECT_CUSTOMERS RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can create own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can update own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can delete own project customers" ON project_customers;

CREATE POLICY "Users can view project customers"
  ON project_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

CREATE POLICY "Users can create project customers"
  ON project_customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project customers"
  ON project_customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

CREATE POLICY "Users can delete project customers"
  ON project_customers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

-- ============================================
-- 8. PROJECT_APPROVALS RLS Updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own project approvals" ON project_approvals;
DROP POLICY IF EXISTS "Users can create own project approvals" ON project_approvals;
DROP POLICY IF EXISTS "Users can delete own project approvals" ON project_approvals;

CREATE POLICY "Users can view project approvals"
  ON project_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

CREATE POLICY "Users can create project approvals"
  ON project_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project approvals"
  ON project_approvals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND (
        projects.user_account_id = auth.uid()
        OR is_master_admin()
        OR (is_location_admin() AND projects.location_id = get_user_location_id())
      )
    )
  );

-- ============================================
-- Verification Queries
-- ============================================

-- Check that policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'products', 'artwork', 'artwork_templates', 'user_accounts', 'project_details', 'project_customers', 'project_approvals')
ORDER BY tablename, policyname;

-- Check that helper functions exist
SELECT 
  routine_name, 
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_master_admin', 'is_location_admin', 'get_user_location_id', 'is_admin_for_location');
