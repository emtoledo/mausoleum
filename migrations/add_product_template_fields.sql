-- Migration: Add available_templates and default_template_id to products table
-- Run this migration in your Supabase SQL Editor

-- Add available_templates column (JSONB array of template IDs)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available_templates JSONB DEFAULT '[]'::jsonb;

-- Add default_template_id column (UUID foreign key to artwork_templates)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS default_template_id UUID REFERENCES artwork_templates(id) ON DELETE SET NULL;

-- Add index on default_template_id for better query performance
CREATE INDEX IF NOT EXISTS idx_products_default_template_id ON products(default_template_id);

-- Add comment to document the columns
COMMENT ON COLUMN products.available_templates IS 'Array of artwork template IDs that are available for this product';
COMMENT ON COLUMN products.default_template_id IS 'The default artwork template ID to load when users click "Add Template" for this product';

