# Artwork Management Setup Guide

This guide will help you set up the artwork management system in the admin panel, which replaces the static `ArtworkData.js` file with a database-backed solution.

## Prerequisites

- Supabase project configured
- Master admin access
- Artwork files ready to upload

## Step 1: Create Database Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Artwork Catalog (for master admin management)
CREATE TABLE IF NOT EXISTS artwork (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  texture_url TEXT,
  default_width DECIMAL(10, 2) DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for artwork
CREATE INDEX IF NOT EXISTS idx_artwork_category ON artwork(category);
CREATE INDEX IF NOT EXISTS idx_artwork_active ON artwork(is_active);

-- RLS for artwork (master admins can manage, all authenticated users can view active artwork)
ALTER TABLE artwork ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active artwork"
  ON artwork FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

CREATE POLICY "Master admins can manage artwork"
  ON artwork FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));
```

## Step 2: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `artwork`
4. Set to **Public** (so artwork files can be accessed without auth)
5. Click "Create bucket"

## Step 3: Set Up Storage Policies

Run the SQL from `storage_artwork_policies.sql` in your Supabase SQL Editor, or run:

```sql
-- Policy: Anyone can view artwork files (public access)
CREATE POLICY IF NOT EXISTS "Artwork files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'artwork');

-- Policy: Master admins can upload artwork files
CREATE POLICY IF NOT EXISTS "Master admins can upload artwork files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artwork' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);

-- Policy: Master admins can update artwork files
CREATE POLICY IF NOT EXISTS "Master admins can update artwork files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artwork' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);

-- Policy: Master admins can delete artwork files
CREATE POLICY IF NOT EXISTS "Master admins can delete artwork files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artwork' AND
  EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid())
);
```

## Step 4: Migrate Existing Artwork (Optional)

If you have existing artwork in `ArtworkData.js`, you can migrate it using the admin panel:

1. Navigate to `/admin` in your app
2. Click on the "Artwork" tab
3. Click "Add New Artwork"
4. For each artwork item:
   - Enter the ID (e.g., `panel-03`)
   - Enter the name (e.g., `PANEL03`)
   - Select or enter the category
   - Set the default width
   - Upload the image file (DXF, SVG, PNG, etc.)
   - Upload texture file if applicable
   - Click "Save"

## Step 5: Verify Setup

1. Navigate to `/admin` → "Artwork" tab
2. You should see the artwork management interface
3. Try adding a new artwork item
4. Verify it appears in the design studio's artwork library

## Storage Structure

Artwork files are stored in the `artwork` bucket with the following structure:

```
artwork/
  {artworkId}/
    image-{artworkId}.{ext}    # Main artwork file (DXF, SVG, PNG, etc.)
    texture-{artworkId}.{ext}   # Optional texture file (PNG, JPG)
```

## Usage

Once set up, artwork is automatically loaded from the database when:
- Opening a project in the design studio
- The artwork library panel is opened

The system will:
1. Load all active artwork from the database
2. Transform it to match the expected format
3. Display it in the artwork library
4. Allow users to add artwork to their designs

## Notes

- Artwork files support: DXF, SVG, PNG, JPG, JPEG
- Texture files support: PNG, JPG, JPEG
- DXF files are automatically converted to SVG for preview in the library
- All artwork is publicly accessible (read-only) for authenticated users
- Only master admins can create, update, or delete artwork

