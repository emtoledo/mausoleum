-- Add approval_pdf_url column to projects table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approval_pdf_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN projects.approval_pdf_url IS 'URL to the approved PDF stored in Supabase Storage';

