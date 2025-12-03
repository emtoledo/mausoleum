/**
 * Browser Version: Check for Products Using Static Asset URLs
 * 
 * Run this in the browser console on your app (after logging in):
 * 
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire file
 * 3. Or import it if you have a way to load modules
 * 
 * It will check all products and show which ones still use static asset URLs.
 */

async function checkStaticAssetUrls() {
  console.log('🔍 Checking products for static asset URLs...\n');

  // Get Supabase client from window (if exposed) or use fetch directly
  const supabaseUrl = window.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = window.REACT_APP_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase URL or key not found.');
    console.error('Make sure you\'re running this in the app context where Supabase is configured.');
    return;
  }

  /**
   * Check if a URL is a static asset URL (webpack-bundled path)
   */
  function isStaticAssetUrl(url) {
    if (!url) return false;
    
    const staticAssetPatterns = [
      /^\/static\/media\//,           // Webpack bundled assets
      /^\/images\/(products|previews)/, // Public folder assets
      /^\.\.\/assets\/images\//,      // Relative asset paths
      /^\/assets\/images\//           // Absolute asset paths
    ];
    
    return staticAssetPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if a URL is a Supabase Storage URL
   */
  function isSupabaseStorageUrl(url) {
    if (!url) return false;
    return url.includes('supabase.co/storage/v1/object/public/product-images');
  }

  try {
    // Use fetch to query Supabase REST API
    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?select=id,name,product_category,preview_image_url,product_image_url,product_overlay_url&order=product_category.asc,name.asc`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products = await response.json();

    if (!products || products.length === 0) {
      console.log('No products found in database.');
      return;
    }

    console.log(`Found ${products.length} products\n`);

    const issues = [];
    const stats = {
      total: products.length,
      usingStaticAssets: 0,
      usingSupabaseStorage: 0,
      missingUrls: 0,
      mixed: 0
    };

    products.forEach(product => {
      const issuesForProduct = [];
      let hasStaticAsset = false;
      let hasSupabaseStorage = false;
      let hasMissingUrl = false;

      // Check preview image
      if (!product.preview_image_url) {
        issuesForProduct.push('  ❌ Missing preview_image_url');
        hasMissingUrl = true;
      } else if (isStaticAssetUrl(product.preview_image_url)) {
        issuesForProduct.push(`  ⚠️  preview_image_url uses static asset: ${product.preview_image_url.substring(0, 60)}...`);
        hasStaticAsset = true;
      } else if (isSupabaseStorageUrl(product.preview_image_url)) {
        hasSupabaseStorage = true;
      }

      // Check product image
      if (!product.product_image_url) {
        issuesForProduct.push('  ❌ Missing product_image_url');
        hasMissingUrl = true;
      } else if (isStaticAssetUrl(product.product_image_url)) {
        issuesForProduct.push(`  ⚠️  product_image_url uses static asset: ${product.product_image_url.substring(0, 60)}...`);
        hasStaticAsset = true;
      } else if (isSupabaseStorageUrl(product.product_image_url)) {
        hasSupabaseStorage = true;
      }

      // Check overlay image
      if (product.product_overlay_url) {
        if (isStaticAssetUrl(product.product_overlay_url)) {
          issuesForProduct.push(`  ⚠️  product_overlay_url uses static asset: ${product.product_overlay_url.substring(0, 60)}...`);
          hasStaticAsset = true;
        } else if (isSupabaseStorageUrl(product.product_overlay_url)) {
          hasSupabaseStorage = true;
        }
      }

      // Update stats
      if (hasMissingUrl) {
        stats.missingUrls++;
      } else if (hasStaticAsset && hasSupabaseStorage) {
        stats.mixed++;
      } else if (hasStaticAsset) {
        stats.usingStaticAssets++;
      } else if (hasSupabaseStorage) {
        stats.usingSupabaseStorage++;
      }

      // Add to issues if there are any problems
      if (issuesForProduct.length > 0) {
        issues.push({
          product: product,
          issues: issuesForProduct
        });
      }
    });

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total Products: ${stats.total}`);
    console.log(`✅ Using Supabase Storage: ${stats.usingSupabaseStorage}`);
    console.log(`⚠️  Using Static Assets: ${stats.usingStaticAssets}`);
    console.log(`❌ Missing URLs: ${stats.missingUrls}`);
    console.log(`🔀 Mixed (some static, some storage): ${stats.mixed}\n`);

    // Print detailed issues
    if (issues.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  PRODUCTS WITH ISSUES');
      console.log('═══════════════════════════════════════════════════════════\n');

      issues.forEach(({ product, issues: productIssues }) => {
        console.log(`\n📦 ${product.name} (${product.id})`);
        console.log(`   Category: ${product.product_category}`);
        productIssues.forEach(issue => console.log(issue));
      });

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('💡 RECOMMENDATIONS');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('1. Go to /admin → Products');
      console.log('2. Edit each product with static asset URLs');
      console.log('3. Upload new images using the upload buttons');
      console.log('4. Save the product\n');
    } else {
      console.log('✅ All products are using Supabase Storage URLs!\n');
    }

    return {
      stats,
      issues,
      allGood: issues.length === 0
    };

  } catch (error) {
    console.error('Error checking products:', error);
    throw error;
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('📋 Static Asset URL Checker loaded.');
  console.log('💡 Run checkStaticAssetUrls() to check products.\n');
  
  // Make it available globally
  window.checkStaticAssetUrls = checkStaticAssetUrls;
}

export default checkStaticAssetUrls;

