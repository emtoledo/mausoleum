# Storage Policies Setup for Artwork Templates

## Overview
This guide explains how to set up storage policies for artwork template preview images in Supabase Storage.

## Step 1: Run the SQL Script

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `storage_artwork_templates_policies.sql`
5. Run the query

This will create the necessary RLS policies for the `artwork-templates/` folder in the `project-files` storage bucket.

## Step 2: Verify Policies

After running the SQL script, verify the policies were created:

1. Go to **Storage** → **Policies** in Supabase Dashboard
2. Select the `project-files` bucket
3. You should see the following policies:
   - "Master admins can upload artwork template previews"
   - "Anyone can view artwork template previews"
   - "Master admins can update artwork template previews"
   - "Master admins can delete artwork template previews"

## Policy Details

- **Upload (INSERT)**: Only master admins can upload preview images to `artwork-templates/{templateId}/preview.png`
- **View (SELECT)**: Anyone can view artwork template preview images (for use in admin panel)
- **Update (UPDATE)**: Only master admins can update preview images
- **Delete (DELETE)**: Only master admins can delete preview images

## Troubleshooting

If you encounter "new row violates row-level security policy" errors:

1. Ensure you've run the SQL script
2. Verify you're logged in as a master admin user
3. Check that the `master_admins` table contains your user ID
4. Ensure the storage bucket name is `project-files` (case-sensitive)

