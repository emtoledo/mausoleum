#!/bin/bash

# Quick script to configure CORS for Supabase Storage artwork bucket
# Requires Supabase CLI: npm install -g supabase

# Create CORS configuration file
cat > storage-cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

echo "CORS configuration file created: storage-cors.json"
echo ""
echo "To apply this configuration:"
echo "1. Make sure you're logged in: supabase login"
echo "2. Link your project: supabase link --project-ref YOUR_PROJECT_REF"
echo "3. Apply CORS: supabase storage update cors artwork --file storage-cors.json"
echo ""
echo "Or if the CLI doesn't support CORS directly, you may need to:"
echo "- Use the Supabase Dashboard → Storage → artwork → Settings → CORS"
echo "- Or configure via Supabase Management API"

