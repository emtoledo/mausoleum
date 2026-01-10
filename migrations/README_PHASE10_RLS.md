# Phase 10: Location-Based RLS Policy Updates

## Overview

This migration updates Row Level Security (RLS) policies to support multi-tenant, location-based access control.

## What It Does

### 1. Creates Helper Functions

| Function | Purpose |
|----------|---------|
| `is_master_admin()` | Returns true if current user is a master admin |
| `is_location_admin()` | Returns true if current user has `role = 'admin'` |
| `get_user_location_id()` | Returns the current user's location_id |
| `is_admin_for_location(uuid)` | Returns true if user is admin for specified location |

These functions are marked as `SECURITY DEFINER` and `STABLE` to avoid recursion issues and improve performance.

### 2. Access Control Matrix

| Table | Master Admin | Location Admin | Regular User |
|-------|--------------|----------------|--------------|
| **projects** | Full access to all | Full access to their location's projects | Own projects only |
| **products** | Full CRUD on all | CRUD on location products, view global | View active (global + location) |
| **artwork** | Full CRUD on all | CRUD on location artwork, view global | View active (global + location) |
| **artwork_templates** | Full CRUD on all | CRUD on location templates, view global | View (global + location) |
| **user_accounts** | Full CRUD on all | View users in their location | Own account only |
| **project_details** | Follows project access | Follows project access | Follows project access |
| **project_customers** | Follows project access | Follows project access | Follows project access |
| **project_approvals** | Follows project access | Follows project access | Follows project access |

### 3. Global vs Location-Specific Resources

| Resource Type | Who Can Create | Who Can Edit | Who Can Delete |
|---------------|----------------|--------------|----------------|
| **Global** (`location_id = NULL`) | Master Admin only | Master Admin only | Master Admin only |
| **Location-specific** | Master Admin + Location Admin | Master Admin + Location Admin | Master Admin + Location Admin |

## Running the Migration

### Step 1: Run in Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `phase10_location_rls_policies.sql`
4. Paste and run the entire script

### Step 2: Verify Policies

After running, check the verification queries at the end of the script. You should see:

**Policies created for each table:**
- `projects`: 4 policies (view, create, update, delete)
- `products`: 5 policies (view + master all + location insert/update/delete)
- `artwork`: 5 policies (same as products)
- `artwork_templates`: 5 policies (same as products)
- `user_accounts`: 4 policies (own read/update + master all + location view)
- `project_details`: 4 policies (view, create, update, delete)
- `project_customers`: 4 policies (view, create, update, delete)
- `project_approvals`: 3 policies (view, create, delete)

**Helper functions:**
- `is_master_admin`
- `is_location_admin`
- `get_user_location_id`
- `is_admin_for_location`

## Testing

### Test Master Admin Access

```sql
-- As a master admin, should see all projects
SELECT * FROM projects;

-- Should be able to update any product
UPDATE products SET name = 'Test' WHERE id = 'some-id';
```

### Test Location Admin Access

```sql
-- As a location admin, should only see projects from their location
SELECT * FROM projects;

-- Should be able to create location-specific products
INSERT INTO products (id, name, product_category, location_id, ...)
VALUES ('test', 'Test', 'Category', 'my-location-id', ...);

-- Should NOT be able to create global products (will fail)
INSERT INTO products (id, name, product_category, location_id, ...)
VALUES ('test', 'Test', 'Category', NULL, ...);
```

### Test Regular User Access

```sql
-- As a regular user, should only see own projects
SELECT * FROM projects;

-- Should only see active products (global + their location)
SELECT * FROM products;
```

## Rollback

If you need to rollback, run the original policies from `supabase_schema.sql`:

```sql
-- Drop new policies and recreate original ones
-- See supabase_schema.sql for original policy definitions
```

## Troubleshooting

### Infinite Recursion Error

If you see `infinite recursion detected in policy for relation`, it means a policy is querying the same table it's protecting. The helper functions (`SECURITY DEFINER`) should prevent this, but if it happens:

1. Check if any custom policies were added
2. Ensure helper functions are created before policies
3. Try dropping all policies on the affected table and re-running

### Permission Denied Error

If users get permission denied:

1. Verify their `role` in `user_accounts` (should be 'admin' for location admins)
2. Verify their `location_id` in `user_accounts`
3. Check if they're in `master_admins` table (for master admin access)
4. Use `SELECT is_master_admin()` and `SELECT is_location_admin()` to debug

### Users Can't See Expected Data

1. Check if resources have correct `location_id` set
2. Verify `is_active = true` for products/artwork
3. Use `SELECT get_user_location_id()` to verify user's location
