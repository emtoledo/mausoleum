# Configure CORS for Supabase Storage

## Method 1: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Create a CORS configuration file** (`storage-cors.json`):
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["*"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

5. **Apply CORS configuration**:
   ```bash
   # For artwork bucket
   supabase storage update cors artwork --file storage-cors.json
   ```

## Method 2: Using Supabase Management API

You can configure CORS programmatically using the Supabase Management API:

```javascript
// This requires a service role key (keep it secret!)
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // Service role key, not anon key!
);

// Note: Supabase Storage uses S3-compatible API
// You may need to use AWS SDK or direct S3 API calls
```

## Method 3: Direct S3 API (since Supabase Storage is S3-compatible)

Since Supabase Storage is S3-compatible, you can use AWS SDK:

```javascript
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/s3',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  region: 'us-east-1',
  s3ForcePathStyle: true
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ['*'], // Or specify your domain: ['https://yourdomain.com']
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3000
    }
  ]
};

s3.putBucketCors({
  Bucket: 'artwork',
  CORSConfiguration: corsConfiguration
}, (err, data) => {
  if (err) console.error('Error setting CORS:', err);
  else console.log('CORS configured successfully');
});
```

## Method 4: SQL Function (if Supabase supports it)

Some Supabase setups allow CORS configuration via SQL functions. Check your Supabase version:

```sql
-- This may or may not work depending on your Supabase version
-- Check Supabase documentation for your specific version

SELECT storage.set_bucket_cors(
  'artwork',
  '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'
);
```

## Recommended CORS Configuration

For your use case (loading images in canvas), use:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

**Security Note**: Using `"*"` for AllowedOrigins allows any domain to access your images. For production, consider restricting to your specific domain:

```json
{
  "AllowedOrigins": [
    "https://yourdomain.com",
    "http://localhost:3000"  // For development
  ]
}
```

## Verify CORS Configuration

After configuring, test if CORS is working:

```javascript
fetch('https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/artwork/PATH/TO/IMAGE.png', {
  method: 'HEAD',
  mode: 'cors'
})
.then(response => {
  console.log('CORS headers:', {
    'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
    'access-control-allow-methods': response.headers.get('access-control-allow-methods')
  });
});
```

## Alternative: Use Supabase CDN

If CORS configuration is difficult, Supabase Storage URLs should work with CORS by default when accessed through the public URL endpoint. Make sure:

1. The bucket is set to **Public**
2. You're using the public URL format: `https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/artwork/...`
3. Images are loaded with `crossOrigin: 'anonymous'` (which we've already added to the code)

## Troubleshooting

If CORS errors persist:

1. **Check bucket is public**: Storage → artwork → Settings → Public bucket
2. **Verify URL format**: Use `/storage/v1/object/public/` not `/storage/v1/object/sign/`
3. **Check browser console**: Look for specific CORS error messages
4. **Test with curl**: 
   ```bash
   curl -I -H "Origin: http://localhost:3000" \
     https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/artwork/PATH/TO/IMAGE.png
   ```

