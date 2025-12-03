# Migration: Check for Static Asset URLs

This document explains how to check if any products are still using static asset URLs instead of Supabase Storage URLs.

## Overview

After migrating product images to Supabase Storage, you should verify that all products in the database are using Supabase Storage URLs instead of static asset URLs (webpack-bundled paths).

## Browser Console Method (Recommended)

The easiest way to check is using the browser console:

1. **Open your app** and log in
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Copy and paste** the contents of `scripts/check-static-asset-urls-browser.js` into the console
4. **Run** `checkStaticAssetUrls()`

The script will:
- Check all products in the database
- Identify which products still use static asset URLs
- Show a summary with statistics
- List each product with issues

## Node.js Script Method

If you prefer to run it from the command line:

```bash
node scripts/check-static-asset-urls.js
```

**Note:** This requires:
- Node.js installed
- `.env` file with `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
- `@supabase/supabase-js` package installed

## What the Script Checks

The script identifies products with:

1. **Static Asset URLs** - URLs that match patterns like:
   - `/static/media/...` (webpack-bundled assets)
   - `/images/products/...` (public folder assets)
   - `/images/previews/...` (public folder assets)
   - `../assets/images/...` (relative asset paths)

2. **Missing URLs** - Products missing `preview_image_url` or `product_image_url`

3. **Supabase Storage URLs** - URLs pointing to `supabase.co/storage/v1/object/public/product-images`

## Example Output

```
═══════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════

Total Products: 13
✅ Using Supabase Storage: 10
⚠️  Using Static Assets: 3
❌ Missing URLs: 0
🔀 Mixed (some static, some storage): 0

═══════════════════════════════════════════════════════════
⚠️  PRODUCTS WITH ISSUES
═══════════════════════════════════════════════════════════

📦 Estate Collection 1 (product-001)
   Category: Estate Collection
   ⚠️  preview_image_url uses static asset: /static/media/estate1.abc123.png...
   ⚠️  product_image_url uses static asset: /static/media/estate1.abc123.svg...

💡 RECOMMENDATIONS
═══════════════════════════════════════════════════════════

1. Go to /admin → Products
2. Edit each product with static asset URLs
3. Upload new images using the upload buttons
4. Save the product
```

## Fixing Products with Static Asset URLs

1. Navigate to `/admin` → Products tab
2. Click on a product that has static asset URLs
3. In the Images section:
   - Click "Choose File" to select the image
   - Click "Upload Preview/Product/Overlay" button
   - The image will be uploaded to Supabase Storage
   - The URL will automatically update
4. Click "Save" to save the product

## After Migration

Once all products are using Supabase Storage URLs:

1. ✅ Run the check script again to verify
2. ✅ Test creating a new project to ensure images load correctly
3. ✅ Test editing an existing project to ensure images load correctly
4. ✅ You can then safely delete static product/preview images from `src/assets/images/products/` and `src/assets/images/previews/`

**Note:** Keep floral images (`src/assets/images/floral/`) as they're still used in product definitions.

