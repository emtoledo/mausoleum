-- Migration: Enable All Artwork Templates for All Products
-- This script sets all available artwork templates to be available for every product
-- Run this script in your Supabase SQL editor or via psql

-- Step 1: Get all artwork template IDs and update all products
-- This will set available_templates to include all template IDs for every product

UPDATE products
SET 
  available_templates = (
    -- Create a JSONB array of all template IDs
    SELECT jsonb_agg(id ORDER BY created_at)
    FROM artwork_templates
  ),
  updated_at = NOW()
WHERE EXISTS (
  -- Only update if there are templates in the database
  SELECT 1 FROM artwork_templates LIMIT 1
);

-- Step 2: Verify the update
-- Check how many products were updated and how many templates are now available
SELECT 
  p.id,
  p.name,
  p.product_category,
  jsonb_array_length(p.available_templates) as template_count,
  p.available_templates
FROM products p
ORDER BY p.name;

-- Step 3: Show summary statistics
SELECT 
  COUNT(DISTINCT p.id) as total_products,
  COUNT(DISTINCT at.id) as total_templates,
  COUNT(DISTINCT p.id) * COUNT(DISTINCT at.id) as total_assignments
FROM products p
CROSS JOIN artwork_templates at;

