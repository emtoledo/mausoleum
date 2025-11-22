# Supabase Storage Policy Setup Guide

## Issue
The test is failing with: "new row violates row-level security policy"

This means the Storage RLS policies need to be configured correctly.

## Step-by-Step Setup

### 1. Navigate to Storage Policies
1. Go to your Supabase Dashboard
2. Click **Storage** in the left sidebar
3. Click on the **project-files** bucket
4. Click on the **Policies** tab

### 2. Create INSERT Policy (Required for Uploads)

**Policy Name:** `Users can upload to own project approvals`

**Allowed operation:** `INSERT`

**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'approvals'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

**What this does:**
- Allows uploads only to the `project-files` bucket
- Only allows paths starting with `approvals/`
- Only allows uploads to folders matching a project ID owned by the current user

### 3. Create SELECT Policy (Required for Downloads)

**Policy Name:** `Users can read own project approvals`

**Allowed operation:** `SELECT`

**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'approvals'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

### 4. Create UPDATE Policy (Optional, for overwriting files)

**Policy Name:** `Users can update own project approvals`

**Allowed operation:** `UPDATE`

**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'approvals'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

### 5. Create DELETE Policy (Optional, for cleanup)

**Policy Name:** `Users can delete own project approvals`

**Allowed operation:** `DELETE`

**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'approvals'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

## Alternative: Public Bucket (Simpler, Less Secure)

If you want to test quickly, you can make the bucket public:

1. Go to Storage → project-files → Settings
2. Toggle **"Public bucket"** to ON
3. Then you only need the INSERT policy (for uploads)

**Note:** Public buckets allow anyone with the URL to read files. For production, use RLS policies instead.

## Preview Images Policies

Preview images are stored in `previews/{projectId}/preview.png`. You need to add similar policies for the `previews/` folder:

### Policy: Users can upload to own project previews
**Policy Name:** `Users can upload to own project previews`  
**Allowed operation:** `INSERT`  
**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

### Policy: Users can read own project previews
**Policy Name:** `Users can read own project previews`  
**Allowed operation:** `SELECT`  
**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

### Policy: Users can update own project previews
**Policy Name:** `Users can update own project previews`  
**Allowed operation:** `UPDATE`  
**Policy definition:**
```sql
(bucket_id = 'project-files'::text) AND 
((storage.foldername(name))[1] = 'previews'::text) AND 
(EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id::text = (storage.foldername(name))[2] 
  AND projects.user_account_id = auth.uid()
))
```

**Note:** If you want preview images to be publicly viewable (anyone can see project thumbnails), you can create a public SELECT policy that doesn't check ownership:
```sql
(bucket_id = 'project-files'::text) AND ((storage.foldername(name))[1] = 'previews'::text)
```

## Testing

After setting up the policies:

1. Refresh your browser
2. Navigate to an Approval Proof page
3. Check the browser console for test results
4. You should see: `✓ Can Upload: YES`
5. Save a project to test preview image upload

## Troubleshooting

### Policy not working?
- Make sure the policy is **enabled** (toggle switch)
- Check that the policy definition matches exactly (copy-paste from above)
- Verify you're logged in as the project owner
- Check that the project exists in the `projects` table

### Still getting RLS errors?
- Try making the bucket public temporarily to test if it's a policy issue
- Check Supabase logs in Dashboard → Logs → Storage
- Verify the `projects` table has the correct `user_account_id` values

