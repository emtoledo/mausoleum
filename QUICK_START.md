# Quick Start Guide - Supabase Integration

## ✅ Step 1: Environment Variables (DONE)
Your `.env.local` file is already created with the correct values!

## ⏳ Step 2: Create Database Schema

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/zidkxosolsacxgdyplmx/sql/new

2. **Copy the SQL Schema**
   - Open `supabase_schema.sql` in this project
   - Copy the entire contents

3. **Paste and Run**
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - You should see "Success. No rows returned"

4. **Verify Tables Created**
   - Go to **Table Editor** in Supabase dashboard
   - You should see:
     - ✅ `projects` table
     - ✅ `project_details` table

## ⏳ Step 3: Add Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your **mausoleum** project

2. **Add Environment Variables**
   - Go to **Settings** > **Environment Variables**
   - Add these two variables (see `VERCEL_ENV_SETUP.md` for details):
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`
   - Select **Production**, **Preview**, and **Development**

3. **Redeploy**
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment
   - Click **Redeploy**

## ✅ Step 4: Test Locally

1. **Start Dev Server**
   ```bash
   npm start
   ```

2. **Check Console**
   - Open browser console (F12)
   - You should NOT see: "Supabase environment variables are not set"
   - If you see that, restart the dev server

3. **Test Authentication**
   - Try logging in (will use Supabase Auth if configured)
   - Or use localStorage fallback (works without Supabase Auth)

4. **Test Project Creation**
   - Create a new project
   - Check Supabase **Table Editor** > `projects` table
   - You should see your new project!

## 🎉 You're Done!

The app will now:
- ✅ Save projects to Supabase
- ✅ Load projects from Supabase
- ✅ Save design elements with all properties
- ✅ Save selected materials
- ✅ Fall back to localStorage if Supabase isn't configured

## Troubleshooting

### "Supabase environment variables are not set"
- Restart your dev server after creating `.env.local`
- Check that variables start with `REACT_APP_` (not `NEXT_PUBLIC_`)

### "Row Level Security policy violation"
- Make sure you ran the SQL schema (Step 2)
- Check that RLS policies were created

### Projects not showing up
- Check Supabase **Table Editor** to see if data is being saved
- Check browser console for errors
- Verify you're logged in (Supabase Auth or localStorage)

