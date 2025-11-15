# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Project name: "valhalla-memorial"
   - Database password: (save this!)
   - Region: Choose closest to you
5. Wait for project to initialize (~2 minutes)

## Step 2: Get API Keys

1. Go to Project Settings > API
2. Copy:
   - `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key (for client-side)
   - `service_role` key (for server-side - keep secret!)

## Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 4: Create Supabase Client

Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Step 5: Environment Variables

Create `.env.local`:

```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

Add to `.gitignore`:
```
.env.local
```

## Step 6: Create Database Schema

1. Go to Supabase Dashboard > SQL Editor
2. Run the SQL from `DATABASE_SCHEMA.md`
3. Verify tables are created in Table Editor

## Step 7: Configure Vercel Environment Variables

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
3. Redeploy

## Step 8: Update Authentication

Replace localStorage auth with Supabase Auth:

```javascript
// src/hooks/useAuth.js
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) return { success: false, error: error.message }
    return { success: true, user: data.user }
  }
  
  // ... rest of auth logic
}
```

