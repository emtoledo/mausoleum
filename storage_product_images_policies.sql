-- Storage policies for product images
-- Run this in Supabase SQL Editor
-- 
-- IMPORTANT: First create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage → New bucket
-- 2. Name: product-images
-- 3. Set to Public (so images can be accessed without auth)
-- 4. Click Create bucket

-- Policy: Anyone can view product images (public access)
CREATE POLICY IF NOT EXISTS "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Master admins can upload product images
-- Note: This policy checks if the user is a master admin
CREATE POLICY IF NOT EXISTS "Master admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);

-- Policy: Master admins can update product images
CREATE POLICY IF NOT EXISTS "Master admins can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);

-- Policy: Master admins can delete product images
CREATE POLICY IF NOT EXISTS "Master admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);

