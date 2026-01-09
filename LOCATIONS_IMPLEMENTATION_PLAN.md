# Locations Implementation Plan

## Overview
This document outlines the implementation plan for adding multi-tenant location support to the Mausoleum application. Each location will have its own branding, URL slug, users, and projects.

---

## Phase 1: Database Schema Updates

### 1.1 Update `locations` Table
**File**: `supabase_schema.sql` or new migration file

```sql
-- Add missing columns to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS brand_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS projects_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS approval_proof_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS background_video_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);

-- Function to generate slug from name (helper function)
CREATE OR REPLACE FUNCTION generate_slug(input_name VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN lower(regexp_replace(input_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;
```

### 1.2 Add `location_id` to `projects` Table
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_location_id ON projects(location_id);
```

### 1.3 Add `location_id` to `products`, `artwork`, and `artwork_templates`
```sql
-- Products scoped to locations
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_location_id ON products(location_id);

-- Artwork scoped to locations
ALTER TABLE artwork 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_artwork_location_id ON artwork(location_id);

-- Artwork templates scoped to locations
ALTER TABLE artwork_templates 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_artwork_templates_location_id ON artwork_templates(location_id);
```

### 1.4 Update RLS Policies
Update Row Level Security policies to include location-based filtering:
- Projects: Users can only see projects from their location
- Products/Artwork/Templates: Location admins can manage their location's resources
- Master admins bypass location restrictions

---

## Phase 2: Location Context & State Management

### 2.1 Create Location Context
**File**: `src/context/LocationContext.js`

```javascript
// Context to manage current location
// - Detects location from URL slug
// - Loads location configuration
// - Provides location data to all components
// - Handles location switching for master admins
```

**Key Features**:
- `useLocation()` hook
- `currentLocation` state
- `locationConfig` (branding, titles, video URL)
- `isMasterAdmin` check
- `getLocationFromSlug(slug)` function

### 2.2 Update Auth Context
**File**: `src/context/AuthContext.js`

**Changes**:
- Load user's `location_id` from `user_accounts` table
- Store location info in auth context
- Check if user is master admin (has entry in `master_admins` table)
- Handle location-specific user creation during signup

---

## Phase 3: Routing Updates

### 3.1 Update App Router
**File**: `src/App.jsx`

**New Route Structure**:
```
/:locationSlug/login
/:locationSlug/signup
/:locationSlug/projects
/:locationSlug/projects/:projectId/edit
/:locationSlug/projects/:projectId/approval
/:locationSlug/projects/:projectId/approved
/:locationSlug/admin (location admin)
/admin (master admin - no slug needed)
```

**Implementation**:
- Wrap routes with location detection
- Create `LocationRoute` component that:
  - Extracts slug from URL
  - Loads location data
  - Validates location exists
  - Redirects if invalid
- Fallback routes (without slug) redirect to default or show error

### 3.2 Location Detection Middleware
**File**: `src/components/routing/LocationRoute.jsx`

- Extracts `locationSlug` from URL params
- Queries `locations` table by slug
- Sets location context
- Handles 404 for invalid slugs

---

## Phase 4: UI Customization Based on Location

### 4.1 Dynamic Branding Components
**Files to Update**:
- `src/pages/LoginPage.js` - Use `locationConfig.brandTitle`
- `src/pages/SignUpPage.js` - Use `locationConfig.brandTitle`
- `src/pages/AllProjectsView.js` - Use `locationConfig.projectsTitle`
- `src/pages/ApprovalProofView.jsx` - Use `locationConfig.approvalProofTitle`
- `src/components/ui/BackgroundVideo.js` - Use `locationConfig.backgroundVideoUrl`

**Pattern**:
```javascript
const { locationConfig } = useLocation();
const brandTitle = locationConfig?.brandTitle || 'Default Title';
```

### 4.2 Background Video Component Update
**File**: `src/components/ui/BackgroundVideo.js`

```javascript
const { locationConfig } = useLocation();
const videoUrl = locationConfig?.backgroundVideoUrl || '/videos/default_bg.mp4';
```

---

## Phase 5: Location Management UI

### 5.1 Locations Management Component
**File**: `src/components/admin/LocationsManagement.jsx`

**Features**:
- List all locations (master admin) or single location (location admin)
- Create new location
- Edit location (name, slug, branding, video URL)
- Delete location (with confirmation)
- Toggle active/inactive status

**Fields**:
- Name (required)
- Slug (auto-generated from name, editable)
- Brand Title
- Projects Title
- Approval Proof Title
- Background Video URL (file upload or URL)
- Active status

### 5.2 Location Edit Form
**File**: `src/components/admin/LocationEditForm.jsx`

Similar structure to `ProductEditForm.jsx`:
- Form validation
- Slug generation helper
- Video upload component
- Save/Cancel/Delete actions

### 5.3 Add to Master Admin Panel
**File**: `src/pages/MasterAdminPanel.jsx`

Add "Locations" tab (remove disabled state):
```javascript
<button
  className={`admin-tab ${activeTab === 'locations' ? 'active' : ''}`}
  onClick={() => setActiveTab('locations')}
>
  Locations
</button>
```

---

## Phase 6: User Management Updates

### 6.1 Signup Flow Updates
**File**: `src/pages/SignUpPage.js`

**Changes**:
- Capture `locationSlug` from URL
- Lookup location by slug
- Create user account with `location_id`
- Set default role based on location needs

### 6.2 User Account Creation
**File**: `src/services/userService.js` (new)

```javascript
async createUserAccount(userId, email, fullName, locationId, role = 'user') {
  // Create entry in user_accounts table
  // Link to location
  // Set role (user, admin, sales)
}
```

### 6.3 Role Management
- **Master Admin**: Access to all locations, `/admin` panel
- **Location Admin**: Access to `/:slug/admin` for their location
- **Sales User**: Can create/view projects, limited admin access
- **Regular User**: Can create/view own projects

---

## Phase 7: Project Scoping

### 7.1 Project Creation
**File**: `src/services/supabaseService.js`

**Changes**:
- Auto-assign `location_id` from current user's location
- Filter projects by location in queries
- Update RLS policies to enforce location scoping

### 7.2 Project Queries
**File**: `src/hooks/useProjects.js`

**Changes**:
- Add location filter to all project queries
- Master admins can see all projects
- Location users only see their location's projects

---

## Phase 8: Resource Scoping (Products, Artwork, Templates)

### 8.1 Location Admin Panel
**File**: `src/pages/LocationAdminPanel.jsx` (new)

**Route**: `/:locationSlug/admin`

**Features**:
- Manage products for this location
- Manage artwork for this location
- Manage templates for this location
- Similar to master admin but scoped to location

### 8.2 Update Existing Admin Components
**Files**:
- `src/components/admin/ProductsManagement.jsx`
- `src/components/admin/ArtworkManagement.jsx`
- `src/components/admin/ArtworkTemplatesManagement.jsx`

**Changes**:
- Filter by `location_id` when loading
- Set `location_id` when creating new items
- Only show location-specific resources

---

## Phase 9: Service Layer Updates

### 9.1 Location Service
**File**: `src/services/locationService.js` (new)

**Methods**:
- `getLocationBySlug(slug)`
- `getAllLocations()` (master admin only)
- `createLocation(locationData)`
- `updateLocation(locationId, updates)`
- `deleteLocation(locationId)`
- `getLocationConfig(locationId)` - Returns branding config

### 9.2 Update Existing Services
**Files**:
- `src/services/productService.js`
- `src/services/artworkService.js`
- `src/services/artworkTemplateService.js`
- `src/services/supabaseService.js`

**Changes**:
- Add `location_id` parameter to create/update methods
- Filter queries by `location_id`
- Master admin bypasses location filters

---

## Phase 10: RLS Policy Updates

### 10.1 Projects RLS
```sql
-- Users can only see projects from their location
CREATE POLICY "Users can view location projects"
  ON projects FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_accounts WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM master_admins WHERE id = auth.uid())
  );
```

### 10.2 Products/Artwork/Templates RLS
```sql
-- Location admins can manage their location's resources
-- All users can view active resources from their location
-- Master admins have full access
```

---

## Phase 11: Migration Strategy

### 11.1 Data Migration Script
**File**: `migrations/add_locations_support.sql`

**Steps**:
1. Create default location (e.g., "Arlington Memorial")
2. Assign all existing users to default location
3. Assign all existing projects to default location
4. Assign all existing products/artwork/templates to default location
5. Generate slugs for existing locations

### 11.2 Backward Compatibility
- Default routes (without slug) redirect to default location
- Existing URLs continue to work with redirect
- Gradual migration to slug-based URLs

---

## Phase 12: Testing Checklist

### 12.1 Location Management
- [ ] Create new location
- [ ] Edit location details
- [ ] Delete location
- [ ] Slug generation works correctly
- [ ] Slug uniqueness enforced

### 12.2 User Flow
- [ ] Signup through location-specific URL assigns correct location
- [ ] Login redirects to location-specific routes
- [ ] Users only see their location's projects
- [ ] Master admin sees all locations/projects

### 12.3 Admin Flow
- [ ] Location admin can access `/:slug/admin`
- [ ] Location admin only manages their location's resources
- [ ] Master admin can access `/admin` (all locations)
- [ ] Master admin can manage all locations

### 12.4 UI Customization
- [ ] Brand title displays correctly per location
- [ ] Background video loads per location
- [ ] Approval proof title uses location config
- [ ] Projects title uses location config

---

## Implementation Order

1. **Phase 1**: Database schema updates
2. **Phase 2**: Location context & state management
3. **Phase 3**: Basic routing with location detection
4. **Phase 4**: UI customization (branding)
5. **Phase 5**: Location management UI
6. **Phase 6**: User management updates
7. **Phase 7**: Project scoping
8. **Phase 8**: Resource scoping
9. **Phase 9**: Service layer updates
10. **Phase 10**: RLS policy updates
11. **Phase 11**: Data migration
12. **Phase 12**: Testing

---

## Files to Create

1. `src/context/LocationContext.js`
2. `src/services/locationService.js`
3. `src/components/admin/LocationsManagement.jsx`
4. `src/components/admin/LocationEditForm.jsx`
5. `src/pages/LocationAdminPanel.jsx`
6. `src/components/routing/LocationRoute.jsx`
7. `migrations/add_locations_support.sql`

## Files to Modify

1. `supabase_schema.sql` - Add location columns and RLS
2. `src/App.jsx` - Update routing structure
3. `src/context/AuthContext.js` - Add location info
4. `src/pages/LoginPage.js` - Use location config
5. `src/pages/SignUpPage.js` - Capture location on signup
6. `src/pages/AllProjectsView.js` - Use location title
7. `src/pages/ApprovalProofView.jsx` - Use location title
8. `src/components/ui/BackgroundVideo.js` - Use location video
9. `src/pages/MasterAdminPanel.jsx` - Add locations tab
10. All admin management components - Add location filtering
11. All service files - Add location scoping

---

## Notes

- Slug format: lowercase, hyphens instead of spaces (e.g., "arlington-memorial")
- Default location: Consider creating a "default" location for backward compatibility
- Master admin access: Master admins should be able to switch between locations
- URL structure: Consider keeping `/admin` for master admin, `/:slug/admin` for location admin
- Video storage: Background videos should be stored in Supabase Storage under `locations/{locationId}/background-video.mp4`

