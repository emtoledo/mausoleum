-- Storage Bucket RLS Policies for preview images
-- Run this in Supabase SQL Editor after creating the 'project-files' bucket
-- These policies allow users to upload/read preview images for their own projects

-- Note: Storage policies need to be created in the Supabase Dashboard:
-- 1. Go to Storage > project-files > Policies
-- 2. Create new policies with the following settings:

-- ============================================
-- Policy 1: Users can upload preview images to own projects
-- ============================================
-- Policy Name: "Users can upload to own project previews"
-- Allowed operation: INSERT
-- Policy definition:
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))

-- ============================================
-- Policy 2: Users can read preview images from own projects
-- ============================================
-- Policy Name: "Users can read own project previews"
-- Allowed operation: SELECT
-- Policy definition:
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))

-- ============================================
-- Policy 3: Users can update preview images in own projects
-- ============================================
-- Policy Name: "Users can update own project previews"
-- Allowed operation: UPDATE
-- Policy definition:
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))

-- ============================================
-- Policy 4: Users can delete preview images from own projects
-- ============================================
-- Policy Name: "Users can delete own project previews"
-- Allowed operation: DELETE
-- Policy definition:
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))

-- ============================================
-- ALTERNATIVE: Public Read Access (if previews should be publicly viewable)
-- ============================================
-- If you want preview images to be publicly accessible (anyone can view them),
-- you can make the bucket public for SELECT operations, or create a public SELECT policy:
-- 
-- Policy Name: "Public can read preview images"
-- Allowed operation: SELECT
-- Policy definition:
-- (bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'previews'::text)
--
-- This allows anyone with the URL to view preview images, but still requires authentication for uploads.

