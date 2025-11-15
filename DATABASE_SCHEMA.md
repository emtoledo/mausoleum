# Database Schema Design

## Hierarchical Structure

```
Master Admin
  └── Parent Company
      └── Location
          └── User Account
              └── Project
                  └── Project Details
```

## Tables

### 1. `master_admins`
```sql
CREATE TABLE master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `parent_companies`
```sql
CREATE TABLE parent_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_admin_id UUID REFERENCES master_admins(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `locations`
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_company_id UUID REFERENCES parent_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `user_accounts` (Supabase Auth Integration)
```sql
-- Supabase handles auth.users table automatically
-- This table extends auth.users with hierarchy info

CREATE TABLE user_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'manager'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_edited TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. `project_details` (Main Design Data)
```sql
CREATE TABLE project_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  
  -- Template Information
  template_id VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_category VARCHAR(100),
  preview_image_url TEXT,
  template_image_url TEXT,
  template_overlay_url TEXT,
  
  -- Template Dimensions
  real_world_width DECIMAL(10, 2) NOT NULL, -- inches
  real_world_height DECIMAL(10, 2) NOT NULL, -- inches
  canvas_width DECIMAL(10, 2), -- inches
  canvas_height DECIMAL(10, 2), -- inches
  
  -- Edit Zones (stored as JSONB)
  edit_zones JSONB DEFAULT '[]'::jsonb,
  
  -- Product Base (stored as JSONB)
  product_base JSONB DEFAULT '[]'::jsonb,
  
  -- Selected Material
  selected_material_id VARCHAR(100),
  selected_material_name VARCHAR(255),
  
  -- Design Elements (stored as JSONB array)
  design_elements JSONB DEFAULT '[]'::jsonb,
  /*
  Example design_elements structure:
  [
    {
      "id": "el-1",
      "type": "text",
      "content": "In Loving Memory",
      "x": 12.5,
      "y": 5.0,
      "fontSize": 2.0,
      "font": "Times New Roman",
      "fill": "#000000"
    },
    {
      "id": "el-2",
      "type": "image",
      "content": "/path/to/artwork.png",
      "x": 15.0,
      "y": 8.0,
      "width": 4.0,
      "height": 3.0,
      "opacity": 1.0
    }
  ]
  */
  
  -- Additional customizations
  customizations JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_project_details_project_id ON project_details(project_id);
CREATE INDEX idx_project_details_template_id ON project_details(template_id);
```

## Row Level Security (RLS) Policies

### Projects - Users can only see their own projects
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

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
```

### Project Details - Same as projects
```sql
ALTER TABLE project_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project details"
  ON project_details FOR SELECT
  USING (
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
```

## Design Elements JSONB Structure

```json
{
  "id": "el-1",
  "type": "text",
  "content": "In Loving Memory",
  "x": 12.5,
  "y": 5.0,
  "fontSize": 2.0,
  "font": "Times New Roman",
  "fill": "#000000",
  "zIndex": 1
}
```

```json
{
  "id": "el-2",
  "type": "image",
  "content": "/path/to/artwork.png",
  "x": 15.0,
  "y": 8.0,
  "width": 4.0,
  "height": 3.0,
  "opacity": 1.0,
  "scaleX": 1.0,
  "scaleY": 1.0,
  "rotation": 0,
  "zIndex": 2
}
```

