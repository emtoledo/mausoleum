/**
 * Storage Service
 * 
 * Handles file uploads to Supabase Storage
 */

import { supabase } from '../lib/supabase';

/**
 * Upload PDF to Supabase Storage
 * @param {Blob} pdfBlob - PDF file as blob
 * @param {string} projectId - Project ID
 * @param {string} filename - Filename for the PDF
 * @returns {Promise<string>} Public URL of the uploaded PDF
 */
export async function uploadApprovalPDF(pdfBlob, projectId, filename = 'approval-proof.pdf') {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase is not configured');
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    // Create file path: approvals/{projectId}/{filename}
    const filePath = `approvals/${projectId}/${filename}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project-files') // You'll need to create this bucket in Supabase
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadApprovalPDF:', error);
    throw error;
  }
}

/**
 * Upload preview image to Supabase Storage
 * @param {Blob|File} imageBlob - Image file as blob
 * @param {string} projectId - Project ID
 * @param {string} filename - Filename for the image (default: 'preview.png')
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadPreviewImage(imageBlob, projectId, filename = 'preview.png') {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase is not configured');
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    // Create file path: previews/{projectId}/{filename}
    const filePath = `previews/${projectId}/${filename}`;

    // Determine content type based on filename extension
    const contentType = filename.endsWith('.png') ? 'image/png' : 
                       filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                       'image/png';

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project-files') // Use the same bucket as PDFs
      .upload(filePath, imageBlob, {
        contentType: contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading preview image:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPreviewImage:', error);
    throw error;
  }
}

/**
 * Fallback: Convert PDF blob to base64 and store in database
 * Use this if Supabase Storage is not set up
 * @param {Blob} pdfBlob - PDF file as blob
 * @returns {Promise<string>} Base64 encoded PDF
 */
export async function pdfBlobToBase64(pdfBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });
}

