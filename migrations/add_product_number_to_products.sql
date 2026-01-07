-- Migration: Add product_number column to products table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zidkxosolsacxgdyplmx/sql

-- Add product_number column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_number VARCHAR(100);

-- Add comment to document the column
COMMENT ON COLUMN products.product_number IS 'Product number displayed on approval proofs (e.g., 001, A-123)';

