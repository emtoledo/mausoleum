# Supabase Backend Setup Instructions

## Quick Start (5 minutes)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project name**: `valhalla-memorial`
   - **Database password**: (save this securely!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project to initialize

### 2. Get API Keys
1. In Supabase Dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 3. Set Environment Variables

**Local Development:**
Create `.env.local` in project root:
```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Vercel Deployment:**
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon key
3. Redeploy

### 4. Create Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy and paste the SQL from `DATABASE_SCHEMA.md`
3. Click "Run" to execute
4. Verify tables are created in **Table Editor**

### 5. Test the Integration
1. Start your dev server: `npm start`
2. The app will automatically use Supabase if environment variables are set
3. If not set, it falls back to localStorage (no errors)

## What's Already Implemented

✅ **Supabase client** (`src/lib/supabase.js`)
✅ **Supabase service** (`src/services/supabaseService.js`) with localStorage fallback
✅ **Updated dataService** to use Supabase when available
✅ **Updated authentication** to use Supabase Auth
✅ **Material saving** included in project details
✅ **Design elements** saved with all properties (coordinates, sizes, colors, fonts)

## Data Flow

1. **Create Project**: Saves to `projects` table + `project_details` table
2. **Save Design**: Updates `project_details.design_elements` (JSONB array)
3. **Load Project**: Retrieves project + details, transforms to match existing structure
4. **Delete Project**: Cascades to delete project_details

## Current Status

- ✅ Code is ready
- ⏳ Waiting for Supabase project setup
- ⏳ Waiting for database schema creation
- ⏳ Waiting for environment variables

Once you complete steps 1-4 above, everything will work automatically!

