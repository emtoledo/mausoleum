# Vercel Environment Variables Setup

## Add These Variables in Vercel

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your **mausoleum** project
3. Go to **Settings** > **Environment Variables**
4. Add the following variables:

### Required Variables

| Variable Name | Value |
|--------------|-------|
| `REACT_APP_SUPABASE_URL` | `https://zidkxosolsacxgdyplmx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZGt4b3NvbHNhY3hnZHlwbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjQyNzMsImV4cCI6MjA3ODgwMDI3M30.ePsSMn9wmDtJ2Hk4p7SnoJxdESieHXQGulKVJY7vnAU` |

### Important Notes

- **Environment**: Select **Production**, **Preview**, and **Development** (all three)
- **REACT_APP_ prefix**: Required for Create React App to expose these variables
- After adding, you'll need to **redeploy** for changes to take effect

## After Adding Variables

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

## Verify It's Working

After redeploy, check the browser console. You should see:
- No "Supabase environment variables are not set" warning
- Projects loading from Supabase instead of localStorage

