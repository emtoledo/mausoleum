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
  
  -- Design Elements (stored as JSONB array)
  design_elements JSONB DEFAULT '[]'::jsonb,
  
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
-- PHASE 2: Hierarchy Tables (Optional - Add Later)
-- ============================================
-- Uncomment these when you're ready to implement the full hierarchy

/*
-- Master Admins
CREATE TABLE IF NOT EXISTS master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Then update projects table to reference user_accounts instead:
-- ALTER TABLE projects DROP CONSTRAINT projects_user_account_id_fkey;
-- ALTER TABLE projects ADD CONSTRAINT projects_user_account_id_fkey 
--   FOREIGN KEY (user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE;
*/

