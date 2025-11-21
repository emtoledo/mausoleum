/**
 * Test Storage Configuration Utility
 * 
 * Tests if Supabase Storage is properly configured for PDF uploads
 */

import { supabase } from '../lib/supabase';

/**
 * Test if storage bucket is accessible and policies are configured correctly
 */
export async function testStorageConfig() {
  const results = {
    supabaseConfigured: false,
    authenticated: false,
    bucketExists: false,
    canUpload: false,
    canRead: false,
    databaseColumnExists: false,
    errors: []
  };

  try {
    // Test 1: Check if Supabase is configured
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      results.errors.push('Supabase environment variables are not set');
      return results;
    }
    results.supabaseConfigured = true;

    // Test 2: Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      results.errors.push('Not authenticated. Please log in first.');
      return results;
    }
    results.authenticated = true;

    // Test 3: Check if bucket exists by trying to access it directly
    // (listBuckets might not work due to permissions, so we'll test by trying to upload)
    // We'll determine if bucket exists based on upload attempt
    
    // Test 4: Test upload capability with a path that matches the RLS policy
    // First, try to get a project ID to use for testing
    const { data: testProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_account_id', session.user.id)
      .limit(1);

    if (projectsError || !testProjects || testProjects.length === 0) {
      results.errors.push('No projects found. Cannot test upload without a project ID.');
    } else {
      const testProjectId = testProjects[0].id;
      const testFilePath = `approvals/${testProjectId}/test-${Date.now()}.txt`;
      const testContent = new Blob(['Test file for storage configuration'], { type: 'text/plain' });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(testFilePath, testContent, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
          results.errors.push('Bucket "project-files" not found. Please create it in Supabase Storage.');
        } else if (uploadError.message.includes('row-level security') || uploadError.message.includes('RLS')) {
          results.errors.push(`Upload test failed: ${uploadError.message}`);
          results.errors.push('Storage RLS policies may not be configured correctly.');
          results.errors.push('Make sure you have an INSERT policy for: approvals/{projectId}/* paths');
        } else {
          results.errors.push(`Upload test failed: ${uploadError.message}`);
        }
      } else {
        // Upload succeeded, so bucket exists and policies work
        results.bucketExists = true;
        results.canUpload = true;
        
        // Test 5: Test read capability
        const { data: readData, error: readError } = await supabase.storage
          .from('project-files')
          .download(testFilePath);

        if (readError) {
          results.errors.push(`Read test failed: ${readError.message}`);
          if (readError.message.includes('row-level security') || readError.message.includes('RLS')) {
            results.errors.push('Make sure you have a SELECT policy for: approvals/{projectId}/* paths');
          }
        } else {
          results.canRead = true;
        }

        // Clean up test file
        await supabase.storage
          .from('project-files')
          .remove([testFilePath]);
      }
    }

    // Test 6: Check if database column exists
    // We'll test this by trying to query the column
    const { data: testProject, error: dbError } = await supabase
      .from('projects')
      .select('id, approval_pdf_url')
      .limit(1);

    if (dbError) {
      if (dbError.message.includes('approval_pdf_url')) {
        results.errors.push('Database column "approval_pdf_url" does not exist. Run the SQL migration.');
      } else {
        results.errors.push(`Database query error: ${dbError.message}`);
      }
    } else {
      results.databaseColumnExists = true;
    }

  } catch (error) {
    results.errors.push(`Unexpected error: ${error.message}`);
  }

  return results;
}

/**
 * Print test results in a readable format
 */
export function printTestResults(results) {
  console.log('\n=== Supabase Storage Configuration Test ===\n');
  
  console.log(`✓ Supabase Configured: ${results.supabaseConfigured ? 'YES' : 'NO'}`);
  console.log(`✓ Authenticated: ${results.authenticated ? 'YES' : 'NO'}`);
  console.log(`✓ Bucket Exists: ${results.bucketExists ? 'YES' : 'NO'}`);
  console.log(`✓ Can Upload: ${results.canUpload ? 'YES' : 'NO'}`);
  console.log(`✓ Can Read: ${results.canRead ? 'YES' : 'NO'}`);
  console.log(`✓ Database Column Exists: ${results.databaseColumnExists ? 'YES' : 'NO'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ All tests passed! Storage is configured correctly.');
  }
  
  console.log('\n==========================================\n');
  
  return results;
}

