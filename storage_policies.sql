-- Storage Bucket RLS Policies for project-files bucket
-- Run this in Supabase SQL Editor after creating the 'project-files' bucket

-- Enable RLS on the storage.objects table (if not already enabled)
-- Note: Storage RLS is managed through Storage policies in Supabase Dashboard

-- Policy: Allow authenticated users to upload files to their own project folders
-- This policy allows users to upload files to: approvals/{projectId}/*
-- where the projectId belongs to a project owned by the user

-- Note: Storage policies need to be created in the Supabase Dashboard:
-- 1. Go to Storage > project-files > Policies
-- 2. Create a new policy with the following settings:

-- Policy Name: "Users can upload to own project approvals"
-- Allowed operation: INSERT
-- Policy definition:
-- (bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'approvals'::text) AND 
-- (EXISTS (SELECT 1 FROM projects WHERE projects.id::text = (storage.foldername(name))[2] AND projects.user_account_id = auth.uid()))

-- Policy Name: "Users can read own project approvals"
-- Allowed operation: SELECT
-- Policy definition:
-- (bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'approvals'::text) AND 
-- (EXISTS (SELECT 1 FROM projects WHERE projects.id::text = (storage.foldername(name))[2] AND projects.user_account_id = auth.uid()))

-- Policy Name: "Users can update own project approvals"
-- Allowed operation: UPDATE
-- Policy definition:
-- (bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'approvals'::text) AND 
-- (EXISTS (SELECT 1 FROM projects WHERE projects.id::text = (storage.foldername(name))[2] AND projects.user_account_id = auth.uid()))

-- Policy Name: "Users can delete own project approvals"
-- Allowed operation: DELETE
-- Policy definition:
-- (bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'approvals'::text) AND 
-- (EXISTS (SELECT 1 FROM projects WHERE projects.id::text = (storage.foldername(name))[2] AND projects.user_account_id = auth.uid()))

-- ALTERNATIVE: If you want to make the bucket public for reading (but still require auth for uploads):
-- You can set the bucket to public in Storage settings, then only create INSERT/UPDATE/DELETE policies

