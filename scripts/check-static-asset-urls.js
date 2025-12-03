/**
 * Migration Script: Check for Products Using Static Asset URLs
 * 
 * This script checks the products table for any products that still reference
 * static asset URLs (webpack-bundled paths) instead of Supabase Storage URLs.
 * 
 * Usage:
 *   node scripts/check-static-asset-urls.js
 * 
 * Or run in browser console after importing:
 *   import checkStaticAssetUrls from './scripts/check-static-asset-urls.js';
 *   checkStaticAssetUrls();
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if a URL is a static asset URL (webpack-bundled path)
 */
function isStaticAssetUrl(url) {
  if (!url) return false;
  
  // Webpack-bundled paths typically look like:
  // - /static/media/estate1.abc123.svg
  // - /static/media/estate1.abc123.png
  // - /images/products/estate/estate1.svg (public folder)
  // - /images/previews/estate/estate1.png (public folder)
  
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
  
  // Supabase Storage URLs look like:
  // - https://[project-id].supabase.co/storage/v1/object/public/product-images/...
  return url.includes('supabase.co/storage/v1/object/public/product-images');
}

/**
 * Main function to check products for static asset URLs
 */
async function checkStaticAssetUrls() {
  console.log('🔍 Checking products for static asset URLs...\n');

  try {
    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, product_category, preview_image_url, product_image_url, product_overlay_url')
      .order('product_category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

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
      if (!product.product_overlay_url) {
        // Overlay is optional, so we don't count this as missing
      } else if (isStaticAssetUrl(product.product_overlay_url)) {
        issuesForProduct.push(`  ⚠️  product_overlay_url uses static asset: ${product.product_overlay_url.substring(0, 60)}...`);
        hasStaticAsset = true;
      } else if (isSupabaseStorageUrl(product.product_overlay_url)) {
        hasSupabaseStorage = true;
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
      console.log('4. Save the product');
      console.log('\nOr use the sync script to bulk update if needed.\n');
    } else {
      console.log('✅ All products are using Supabase Storage URLs!\n');
    }

    // Return results for programmatic use
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkStaticAssetUrls()
    .then(() => {
      console.log('\n✅ Check complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

export default checkStaticAssetUrls;

