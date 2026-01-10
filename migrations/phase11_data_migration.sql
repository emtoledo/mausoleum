-- ============================================
-- Phase 11: Data Migration for Location Support
-- ============================================
-- This migration ensures all existing data is properly
-- assigned to locations for multi-tenant support.
--
-- This script is IDEMPOTENT - safe to run multiple times.
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- Step 1: Verify Default Location Exists
-- ============================================

-- Check if a default location exists
DO $$
DECLARE
  default_loc_id UUID;
  default_loc_name TEXT := 'Arlington Memorial';
  default_loc_slug TEXT := 'arlington-memorial';
BEGIN
  -- Try to find existing default location
  SELECT id INTO default_loc_id 
  FROM locations 
  WHERE slug = default_loc_slug 
  LIMIT 1;
  
  IF default_loc_id IS NULL THEN
    -- Create default location if it doesn't exist
    INSERT INTO locations (
      name, 
      slug, 
      brand_title, 
      projects_title, 
      approval_proof_title,
      is_active
    ) VALUES (
      default_loc_name,
      default_loc_slug,
      'ARLINGTON MEMORIAL',
      'ARLINGTON MEMORIAL',
      'ARLINGTON MEMORIAL PARK',
      true
    )
    RETURNING id INTO default_loc_id;
    
    RAISE NOTICE 'Created default location: % (ID: %)', default_loc_name, default_loc_id;
  ELSE
    RAISE NOTICE 'Default location already exists: % (ID: %)', default_loc_name, default_loc_id;
  END IF;
END $$;

-- ============================================
-- Step 2: Get Default Location ID for subsequent queries
-- ============================================

-- Store default location ID in a temp table for use in other queries
CREATE TEMP TABLE IF NOT EXISTS temp_default_location AS
SELECT id as location_id, slug, name
FROM locations 
WHERE slug = 'arlington-memorial'
LIMIT 1;

-- Verify we have a default location
SELECT * FROM temp_default_location;

-- ============================================
-- Step 3: Migrate Projects to Default Location
-- ============================================

-- Count projects without location_id
SELECT 
  COUNT(*) as projects_without_location,
  (SELECT COUNT(*) FROM projects) as total_projects
FROM projects 
WHERE location_id IS NULL;

-- Update projects without location_id to use default location
UPDATE projects
SET location_id = (SELECT location_id FROM temp_default_location)
WHERE location_id IS NULL;

-- Verify all projects now have a location
SELECT 
  'Projects Migration Complete' as status,
  COUNT(*) FILTER (WHERE location_id IS NOT NULL) as with_location,
  COUNT(*) FILTER (WHERE location_id IS NULL) as without_location
FROM projects;

-- ============================================
-- Step 4: Create user_accounts for Users Without Them
-- ============================================

-- First, let's see which auth users don't have user_accounts
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN ua.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as user_account_status
FROM auth.users au
LEFT JOIN user_accounts ua ON au.id = ua.id
ORDER BY user_account_status DESC, au.created_at;

-- Create user_accounts for any auth.users that don't have them
INSERT INTO user_accounts (id, email, full_name, location_id, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as full_name,
  (SELECT location_id FROM temp_default_location) as location_id,
  'user' as role,  -- Default to regular user role
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_accounts ua WHERE ua.id = au.id
);

-- Verify all auth users now have user_accounts
SELECT 
  'User Accounts Migration Complete' as status,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM user_accounts) as total_user_accounts,
  (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = au.id)) as missing_accounts;

-- ============================================
-- Step 5: Assign Location to Users Without One
-- ============================================

-- Update user_accounts without location_id to use default location
UPDATE user_accounts
SET location_id = (SELECT location_id FROM temp_default_location)
WHERE location_id IS NULL;

-- Verify all user_accounts now have a location
SELECT 
  'User Location Assignment Complete' as status,
  COUNT(*) FILTER (WHERE location_id IS NOT NULL) as with_location,
  COUNT(*) FILTER (WHERE location_id IS NULL) as without_location
FROM user_accounts;

-- ============================================
-- Step 6: Summary Report
-- ============================================

-- Location summary
SELECT 
  l.id,
  l.name,
  l.slug,
  l.is_active,
  (SELECT COUNT(*) FROM projects p WHERE p.location_id = l.id) as project_count,
  (SELECT COUNT(*) FROM user_accounts u WHERE u.location_id = l.id) as user_count,
  (SELECT COUNT(*) FROM products pr WHERE pr.location_id = l.id) as location_product_count,
  (SELECT COUNT(*) FROM artwork a WHERE a.location_id = l.id) as location_artwork_count,
  (SELECT COUNT(*) FROM artwork_templates at WHERE at.location_id = l.id) as location_template_count
FROM locations l
ORDER BY l.name;

-- Global resources summary (location_id IS NULL)
SELECT 
  'Global Resources (No Location)' as category,
  (SELECT COUNT(*) FROM products WHERE location_id IS NULL) as global_products,
  (SELECT COUNT(*) FROM artwork WHERE location_id IS NULL) as global_artwork,
  (SELECT COUNT(*) FROM artwork_templates WHERE location_id IS NULL) as global_templates;

-- Master admins summary
SELECT 
  'Master Admins' as category,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM master_admins;

-- Location admins summary
SELECT 
  'Location Admins' as category,
  ua.location_id,
  l.name as location_name,
  COUNT(*) as count,
  string_agg(ua.email, ', ') as emails
FROM user_accounts ua
JOIN locations l ON l.id = ua.location_id
WHERE ua.role = 'admin'
GROUP BY ua.location_id, l.name;

-- ============================================
-- Step 7: Cleanup
-- ============================================

-- Drop temp table
DROP TABLE IF EXISTS temp_default_location;

-- ============================================
-- OPTIONAL: Promote a User to Location Admin
-- ============================================
-- Uncomment and modify the following to make a user a location admin:
--
-- UPDATE user_accounts
-- SET role = 'admin'
-- WHERE email = 'user@example.com';
--
-- Verify:
-- SELECT id, email, role, location_id FROM user_accounts WHERE role = 'admin';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these after migration to verify everything is correct:

-- 1. All projects have location_id
SELECT 'Projects Check' as check_name, 
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL: ' || COUNT(*) || ' projects without location' END as result
FROM projects WHERE location_id IS NULL;

-- 2. All user_accounts have location_id
SELECT 'User Accounts Check' as check_name,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL: ' || COUNT(*) || ' users without location' END as result
FROM user_accounts WHERE location_id IS NULL;

-- 3. All auth.users have user_accounts
SELECT 'Auth Users Check' as check_name,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL: ' || COUNT(*) || ' auth users without accounts' END as result
FROM auth.users au 
WHERE NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = au.id);

-- 4. At least one location exists
SELECT 'Locations Check' as check_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS: ' || COUNT(*) || ' locations' ELSE '❌ FAIL: No locations' END as result
FROM locations WHERE is_active = true;

-- 5. At least one master admin exists
SELECT 'Master Admin Check' as check_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS: ' || COUNT(*) || ' master admins' ELSE '⚠️ WARNING: No master admins' END as result
FROM master_admins;
