# Master Admin Panel Setup Guide

## Overview
This guide will help you set up the Master Admin Panel for managing products and the application hierarchy.

## Step 1: Database Setup

### 1.1 Run the Updated Schema
Run the updated `supabase_schema.sql` file in your Supabase SQL Editor. This will create:
- `master_admins` table
- `parent_companies` table
- `locations` table
- `user_accounts` table
- `products` table (for product catalog management)
- All necessary RLS policies

### 1.2 Fix RLS Policies (IMPORTANT!)
**If you get a 500 error when accessing `/admin`, run `fix_master_admin_rls.sql` first:**
This fixes a circular dependency issue in the RLS policies that prevents checking master admin status.

### 1.3 Initialize First Master Admin
Run the `init_master_admin.sql` script to create the first master admin:

```sql
INSERT INTO master_admins (id, email, name)
VALUES (
  '7d84fab0-b48c-4c81-a859-838761a1218d',
  (SELECT email FROM auth.users WHERE id = '7d84fab0-b48c-4c81-a859-838761a1218d'),
  'Master Admin'
)
ON CONFLICT (id) DO NOTHING;
```

**Note:** Make sure the user with UID `7d84fab0-b48c-4c81-a859-838761a1218d` exists in `auth.users` before running this script.

## Step 2: Access the Master Admin Panel

1. Log in as the master admin user
2. Navigate to `/admin` in your application
3. The panel will verify you're a master admin before allowing access

## Step 3: Product Management

### 3.1 Initial Product Sync (Optional)
If you want to sync existing products from `ProductData.js` to the database, you can use the sync function in the browser console:

```javascript
// In browser console after logging in as master admin
import productService from './services/productService';
productService.syncProductsFromData();
```

### 3.2 Managing Products
- **View Products**: The products table shows all products with preview images, names, categories, and dimensions
- **Filter by Category**: Use the category dropdown to filter products
- **Add Product**: Click "Add Product" to create a new product
- **Edit Product**: Click on any product row to edit its properties
- **Delete Product**: Click "Delete" in the edit form (with confirmation)

### 3.3 Product Properties
The product edit form allows you to manage:
- Basic Info: ID, Name, Category, Active status
- Images: Preview, Product Image, Overlay Image URLs
- Dimensions: Real World Width/Height, Canvas Width/Height
- Materials: Available Materials list, Default Material ID
- Advanced: Edit Zones, Product Base, Floral arrangements, Vase Dimensions (all as JSON)

## Step 4: Database Schema Details

### Products Table Structure
```sql
CREATE TABLE products (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100) NOT NULL,
  preview_image_url TEXT,
  product_image_url TEXT,
  product_overlay_url TEXT,
  real_world_width DECIMAL(10, 2) NOT NULL,
  real_world_height DECIMAL(10, 2) NOT NULL,
  canvas_width DECIMAL(10, 2),
  canvas_height DECIMAL(10, 2),
  available_materials JSONB DEFAULT '[]'::jsonb,
  default_material_id VARCHAR(100),
  edit_zones JSONB DEFAULT '[]'::jsonb,
  product_base JSONB DEFAULT '[]'::jsonb,
  floral JSONB DEFAULT '[]'::jsonb,
  vase_dimensions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Policies
- **Products**: All authenticated users can view active products. Only master admins can create/update/delete.
- **Master Admins**: Only master admins can view and manage master admin records.
- **Hierarchy Tables**: Only master admins can manage parent companies, locations, and user accounts.

## Step 5: Future Enhancements

The master admin panel currently includes:
- ✅ Product Management (fully functional)
- ⏳ Hierarchy Management (coming soon)

Future features will include:
- Managing parent companies
- Managing locations
- Managing user accounts
- Viewing system statistics

## Troubleshooting

### "Access Denied" Error
- Verify the user is in the `master_admins` table
- Check that the user ID matches the authenticated user's ID
- Ensure RLS policies are correctly set up

### Products Not Loading
- Check that the `products` table exists
- Verify RLS policies allow master admin access
- Check browser console for specific error messages

### Cannot Create/Update Products
- Verify you're logged in as a master admin
- Check that the `master_admins` table has your user ID
- Ensure RLS policies are active and correct

## Security Notes

- Master admin access is restricted via RLS policies
- Only users in the `master_admins` table can access the admin panel
- Product management operations are logged via `updated_at` timestamps
- Consider adding audit logging for sensitive operations in the future

