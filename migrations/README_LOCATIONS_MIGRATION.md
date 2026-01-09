# Locations Migration Guide

## Overview
This migration adds location support to the database schema, enabling multi-tenant functionality.

## Migration File
`add_locations_support.sql`

## What This Migration Does

### 1. Updates `locations` Table
- Adds `slug` column (unique URL-friendly identifier)
- Adds `brand_title` (for login/signup pages)
- Adds `projects_title` (for projects list page)
- Adds `approval_proof_title` (for approval documents)
- Adds `background_video_url` (for login/signup background)
- Adds `is_active` flag
- Creates indexes for performance

### 2. Adds `location_id` to Related Tables
- `projects` - Links projects to locations
- `products` - Links products to locations (null = available to all)
- `artwork` - Links artwork to locations (null = available to all)
- `artwork_templates` - Links templates to locations (null = available to all)

### 3. Creates Helper Functions
- `generate_slug(input_name)` - Converts location name to URL-friendly slug
- `ensure_unique_slug(base_slug, location_id)` - Ensures slug uniqueness
- `set_location_slug()` - Trigger function to auto-generate slugs

### 4. Data Migration
- Creates default location "Arlington Memorial" if none exists
- Assigns all existing data to default location:
  - Projects
  - Products
  - Artwork
  - Artwork Templates
  - User Accounts

## How to Run

1. **Backup your database** (recommended)
2. Open Supabase SQL Editor
3. Copy and paste the contents of `add_locations_support.sql`
4. Run the migration
5. Verify the migration succeeded:
   ```sql
   -- Check locations table has new columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'locations' AND column_name IN ('slug', 'brand_title', 'projects_title');
   
   -- Check default location was created
   SELECT * FROM locations WHERE slug = 'arlington-memorial';
   
   -- Verify indexes were created
   SELECT indexname FROM pg_indexes WHERE tablename = 'locations' AND indexname LIKE 'idx_locations%';
   ```

## Post-Migration Steps

1. **Update existing location records** (if any exist):
   ```sql
   -- Generate slugs for existing locations without slugs
   UPDATE locations 
   SET slug = generate_slug(name)
   WHERE slug IS NULL;
   ```

2. **Set branding for default location**:
   ```sql
   UPDATE locations 
   SET 
     brand_title = 'ARLINGTON MEMORIAL',
     projects_title = 'ARLINGTON MEMORIAL',
     approval_proof_title = 'ARLINGTON MEMORIAL PARK',
     background_video_url = '/videos/arlington_bg.mp4'
   WHERE slug = 'arlington-memorial';
   ```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove location_id columns
ALTER TABLE projects DROP COLUMN IF EXISTS location_id;
ALTER TABLE products DROP COLUMN IF EXISTS location_id;
ALTER TABLE artwork DROP COLUMN IF EXISTS location_id;
ALTER TABLE artwork_templates DROP COLUMN IF EXISTS location_id;

-- Remove new location columns (be careful - this will lose data)
ALTER TABLE locations DROP COLUMN IF EXISTS slug;
ALTER TABLE locations DROP COLUMN IF EXISTS brand_title;
ALTER TABLE locations DROP COLUMN IF EXISTS projects_title;
ALTER TABLE locations DROP COLUMN IF EXISTS approval_proof_title;
ALTER TABLE locations DROP COLUMN IF EXISTS background_video_url;
ALTER TABLE locations DROP COLUMN IF EXISTS is_active;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS trigger_set_location_slug ON locations;
DROP FUNCTION IF EXISTS set_location_slug();
DROP FUNCTION IF EXISTS ensure_unique_slug(VARCHAR, UUID);
DROP FUNCTION IF EXISTS generate_slug(VARCHAR);

-- Drop indexes
DROP INDEX IF EXISTS idx_locations_slug;
DROP INDEX IF EXISTS idx_locations_active;
DROP INDEX IF EXISTS idx_projects_location_id;
DROP INDEX IF EXISTS idx_products_location_id;
DROP INDEX IF EXISTS idx_artwork_location_id;
DROP INDEX IF EXISTS idx_artwork_templates_location_id;
```

## Notes

- The migration uses `IF NOT EXISTS` and `IF EXISTS` clauses to be idempotent (safe to run multiple times)
- Existing data is preserved and assigned to the default location
- The `slug` column allows NULL initially, but the trigger will auto-generate it
- Consider making `slug` NOT NULL after verifying all locations have slugs

