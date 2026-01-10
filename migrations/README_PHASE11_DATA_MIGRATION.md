# Phase 11: Data Migration for Location Support

## Overview

This migration ensures all existing data is properly assigned to locations for multi-tenant support. It's **idempotent** (safe to run multiple times).

## What It Does

### Step 1: Verify Default Location
- Checks if "Arlington Memorial" location exists
- Creates it if missing with default branding

### Step 2: Migrate Projects
- Finds all projects without `location_id`
- Assigns them to the default location

### Step 3: Create Missing User Accounts
- Finds `auth.users` without corresponding `user_accounts` records
- Creates `user_accounts` entries with:
  - Default location assigned
  - Role set to 'user'
  - Full name extracted from metadata or email

### Step 4: Assign Locations to Users
- Updates any `user_accounts` without `location_id`
- Assigns them to the default location

### Step 5: Summary Report
Shows counts for:
- Projects per location
- Users per location
- Global resources (products, artwork, templates)
- Master admins
- Location admins

### Step 6: Verification
Runs checks to ensure:
- ✅ All projects have `location_id`
- ✅ All `user_accounts` have `location_id`
- ✅ All `auth.users` have `user_accounts`
- ✅ At least one location exists
- ✅ At least one master admin exists

## Running the Migration

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy contents of `phase11_data_migration.sql`
3. Run the entire script
4. Review the output for any warnings or failures

## Expected Output

You should see multiple result tables:

```
-- Default location check
location_id | slug              | name
------------|-------------------|------------------
abc-123...  | arlington-memorial| Arlington Memorial

-- Projects migration
status                      | with_location | without_location
----------------------------|---------------|------------------
Projects Migration Complete | 15            | 0

-- User accounts migration  
status                           | total_auth_users | total_user_accounts | missing_accounts
---------------------------------|------------------|---------------------|------------------
User Accounts Migration Complete | 5                | 5                   | 0

-- Verification checks
check_name          | result
--------------------|------------------
Projects Check      | ✅ PASS
User Accounts Check | ✅ PASS
Auth Users Check    | ✅ PASS
Locations Check     | ✅ PASS: 1 locations
Master Admin Check  | ✅ PASS: 1 master admins
```

## Post-Migration Tasks

### 1. Promote Location Admins (if needed)

To make a user a location admin for their assigned location:

```sql
UPDATE user_accounts
SET role = 'admin'
WHERE email = 'location-admin@example.com';
```

### 2. Create Additional Locations

```sql
INSERT INTO locations (name, slug, brand_title, projects_title, approval_proof_title, is_active)
VALUES (
  'Sunset Memorial',
  'sunset-memorial', 
  'SUNSET MEMORIAL',
  'SUNSET MEMORIAL',
  'SUNSET MEMORIAL PARK',
  true
);
```

### 3. Move Users to Different Locations

```sql
-- Get location ID first
SELECT id, name, slug FROM locations;

-- Update user's location
UPDATE user_accounts
SET location_id = 'new-location-uuid-here'
WHERE email = 'user@example.com';
```

### 4. Move Projects to Different Locations

```sql
UPDATE projects
SET location_id = 'new-location-uuid-here'
WHERE id = 'project-uuid-here';
```

## Troubleshooting

### "No default location found"
The script should create it automatically. If it fails, manually create:

```sql
INSERT INTO locations (name, slug, brand_title, projects_title, approval_proof_title, is_active)
VALUES ('Arlington Memorial', 'arlington-memorial', 'ARLINGTON MEMORIAL', 'ARLINGTON MEMORIAL', 'ARLINGTON MEMORIAL PARK', true);
```

### Users Can't See Their Projects
1. Check user's `location_id` matches project's `location_id`
2. Verify RLS policies are applied (Phase 10)
3. Check if user is in `user_accounts` table

### Location Admin Can't Access Admin Panel
1. Verify `role = 'admin'` in `user_accounts`
2. Verify `location_id` is set correctly
3. Test with: `SELECT is_location_admin()` while logged in as that user

## Rollback

To undo location assignments (if needed):

```sql
-- WARNING: This removes all location assignments!
-- Only use if you need to completely restart

-- Remove location from projects (they'll be orphaned)
UPDATE projects SET location_id = NULL;

-- Remove location from user_accounts
UPDATE user_accounts SET location_id = NULL;
```

## Global Resources Note

This migration does NOT assign locations to products, artwork, or templates. Resources with `location_id = NULL` are considered **global** and available to all locations. This is intentional - master admins can manage global resources from `/admin`.
