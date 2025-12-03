# Product Images Storage Setup

## Overview
Product images are now stored in Supabase Storage and can be managed through the Master Admin Panel.

## Setup Instructions

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard → Storage
2. Click "New bucket"
3. Create a bucket named: `product-images`
4. Set it to **Public** (so images can be accessed without authentication)
5. Click "Create bucket"

### Step 2: Set Up Storage Policies

Run the `storage_product_images_policies.sql` script in your Supabase SQL Editor. This will:
- Allow public read access to product images
- Allow master admins to upload, update, and delete product images

### Step 3: Upload Images via Admin Panel

1. Navigate to `/admin` → Products tab
2. Click on a product to edit it (or create a new product)
3. In the Images section:
   - Click "Choose File" to select an image
   - Click "Upload Preview/Product/Overlay" button
   - The image will be uploaded to Supabase Storage
   - The URL will automatically populate in the form

### Step 4: Image Storage Structure

Images are stored in Supabase Storage with this structure:
```
product-images/
  └── products/
      └── {productId}/
          ├── preview-{productId}.{ext}
          ├── product-{productId}.{ext}
          └── overlay-{productId}.{ext}
```

## Image Management Features

### Upload Images
- Select image file from your computer
- Click upload button
- Image is uploaded to Supabase Storage
- URL is automatically saved to the product

### Manual URL Entry
- You can still manually enter image URLs if needed
- Useful for external CDN URLs or existing hosted images

### Image Types
- **Preview Image**: Used in product selection grids
- **Product Image**: Main product image (SVG typically)
- **Overlay Image**: Overlay image for the product

## Migration from Static Assets

If you have existing products with static asset URLs (from ProductData.js):
1. Products will continue to work with existing URLs
2. To migrate to Supabase Storage:
   - Edit each product in the admin panel
   - Upload new images via the upload buttons
   - The new Supabase Storage URLs will replace the old static URLs

## Benefits

- ✅ Images managed through admin panel (no code changes needed)
- ✅ CDN delivery via Supabase Storage
- ✅ No app rebuilds required for image updates
- ✅ Easy to update/replace images
- ✅ Scalable storage solution

## Troubleshooting

### "Bucket not found" Error
- Make sure you've created the `product-images` bucket in Supabase Storage
- Verify the bucket is set to Public

### "Access denied" Error
- Make sure you're logged in as a master admin
- Verify the storage policies have been applied

### Images Not Displaying
- Check that the bucket is set to Public
- Verify the image URLs are correct in the database
- Check browser console for CORS or loading errors

