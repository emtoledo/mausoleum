-- Supabase Database Schema for Memorial App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zidkxosolsacxgdyplmx/sql

-- ============================================
-- PHASE 1: Core Tables (Start Here)
-- ============================================

-- Projects table (simplified - uses auth.users directly)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  approval_pdf_url TEXT, -- URL to the approved PDF stored in Supabase Storage
  preview_image_url TEXT, -- URL to the preview image stored in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_edited TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Details table (stores all design data)
CREATE TABLE IF NOT EXISTS project_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  
  -- Product Information
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100),
  preview_image_url TEXT,
  product_image_url TEXT,
  product_overlay_url TEXT,
  
  -- Product Dimensions
  real_world_width DECIMAL(10, 2) NOT NULL DEFAULT 24,
  real_world_height DECIMAL(10, 2) NOT NULL DEFAULT 18,
  canvas_width DECIMAL(10, 2),
  canvas_height DECIMAL(10, 2),
  
  -- Edit Zones (stored as JSONB)
  edit_zones JSONB DEFAULT '[]'::jsonb,
  
  -- Product Base (stored as JSONB)
  product_base JSONB DEFAULT '[]'::jsonb,
  
  -- Available Materials (stored as JSONB array)
  available_materials JSONB DEFAULT '[]'::jsonb,
  default_material_id VARCHAR(100),
  
  -- Selected Material
  selected_material_id VARCHAR(100),
  selected_material_name VARCHAR(255),
  
  -- Current View (front, back, or top)
  current_view VARCHAR(50) DEFAULT 'front',
  
  -- Design Elements (stored as JSONB object with view keys: { "front": [...], "back": [...], "top": [...] })
  design_elements JSONB DEFAULT '{"front": []}'::jsonb,
  
  -- Additional customizations
  customizations JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Information table (stores customer details for projects)
CREATE TABLE IF NOT EXISTS project_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Signatures table (stores digital signatures for project approvals)
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signer_name VARCHAR(255) NOT NULL,
  signed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_customers_project_id ON project_customers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_project_id ON project_approvals(project_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_details_project_id ON project_details(project_id);
CREATE INDEX IF NOT EXISTS idx_project_details_product_id ON project_details(product_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_account_id ON projects(user_account_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create RLS policies for projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (user_account_id = auth.uid());

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (user_account_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (user_account_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (user_account_id = auth.uid());

-- Enable RLS on project_details
ALTER TABLE project_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own project details" ON project_details;
DROP POLICY IF EXISTS "Users can create own project details" ON project_details;
DROP POLICY IF EXISTS "Users can update own project details" ON project_details;
DROP POLICY IF EXISTS "Users can delete own project details" ON project_details;

-- Create RLS policies for project_details
CREATE POLICY "Users can view own project details"
  ON project_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project details"
  ON project_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project details"
  ON project_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project details"
  ON project_details FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_details.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

-- Enable RLS on project_customers
ALTER TABLE project_customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can create own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can update own project customers" ON project_customers;
DROP POLICY IF EXISTS "Users can delete own project customers" ON project_customers;

-- Create RLS policies for project_customers
CREATE POLICY "Users can view own project customers"
  ON project_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project customers"
  ON project_customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project customers"
  ON project_customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project customers"
  ON project_customers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_customers.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

-- Enable RLS on project_approvals
ALTER TABLE project_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own project approvals" ON project_approvals;
DROP POLICY IF EXISTS "Users can create own project approvals" ON project_approvals;
DROP POLICY IF EXISTS "Users can delete own project approvals" ON project_approvals;

-- Create RLS policies for project_approvals
CREATE POLICY "Users can view own project approvals"
  ON project_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project approvals"
  ON project_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project approvals"
  ON project_approvals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_approvals.project_id
      AND projects.user_account_id = auth.uid()
    )
  );

-- ============================================
-- PHASE 2: Hierarchy Tables
-- ============================================

-- Master Admins
CREATE TABLE IF NOT EXISTS master_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent Companies
CREATE TABLE IF NOT EXISTS parent_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_admin_id UUID REFERENCES master_admins(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_company_id UUID REFERENCES parent_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Accounts (extends auth.users with hierarchy)
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Catalog (for master admin management)
CREATE TABLE IF NOT EXISTS products (
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
  dimensions_for_display TEXT,
  available_views JSONB DEFAULT '["front"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

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

-- RLS for master_admins
ALTER TABLE master_admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can check own master admin status" ON master_admins;
DROP POLICY IF EXISTS "Master admins can view all master admins" ON master_admins;
DROP POLICY IF EXISTS "Master admins can update own record" ON master_admins;

-- Allow users to check if they are a master admin (for access control)
-- NOTE: We removed "Master admins can view all master admins" policy because
-- it creates infinite recursion (checking master_admins requires checking master_admins)
CREATE POLICY "Users can check own master admin status"
  ON master_admins FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Master admins can update own record"
  ON master_admins FOR UPDATE
  USING (id = auth.uid());

-- RLS for products (master admins can manage, all authenticated users can view active products)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Master admins can manage products" ON products;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

CREATE POLICY "Master admins can manage products"
  ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

-- RLS for parent_companies
ALTER TABLE parent_companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master admins can manage parent companies" ON parent_companies;

CREATE POLICY "Master admins can manage parent companies"
  ON parent_companies FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

-- RLS for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master admins can manage locations" ON locations;

CREATE POLICY "Master admins can manage locations"
  ON locations FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

-- RLS for user_accounts
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master admins can manage user accounts" ON user_accounts;

CREATE POLICY "Master admins can manage user accounts"
  ON user_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

-- RLS for artwork (master admins can manage, all authenticated users can view active artwork)
ALTER TABLE artwork ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active artwork" ON artwork;
DROP POLICY IF EXISTS "Master admins can manage artwork" ON artwork;

CREATE POLICY "Anyone can view active artwork"
  ON artwork FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

CREATE POLICY "Master admins can manage artwork"
  ON artwork FOR ALL
  USING (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE master_admins.id = auth.uid()));

