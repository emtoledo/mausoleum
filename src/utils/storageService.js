/**
 * Storage Service
 * 
 * Handles file uploads to Supabase Storage
 */

import { supabase } from '../lib/supabase';

/**
 * Upload product image to Supabase Storage
 * @param {Blob|File} imageFile - Image file
 * @param {string} productId - Product ID
 * @param {string} imageType - Type of image: 'preview', 'product', or 'overlay'
 * @param {string} filename - Optional custom filename
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadProductImage(imageFile, productId, imageType = 'product', filename = null) {
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

    // Determine filename if not provided
    if (!filename) {
      const extension = imageFile.name?.split('.').pop() || 'png';
      filename = `${imageType}-${productId}.${extension}`;
    }

    // Create file path: {productId}/{imageType}-{productId}.{ext}
    const filePath = `products/${productId}/${filename}`;

    // Determine content type
    const contentType = imageFile.type || 
      (filename.endsWith('.svg') ? 'image/svg+xml' :
       filename.endsWith('.png') ? 'image/png' :
       filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
       'image/png');

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile, {
        contentType: contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading product image:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
}

/**
 * Delete product image from Supabase Storage
 * @param {string} productId - Product ID
 * @param {string} imageType - Type of image: 'preview', 'product', or 'overlay'
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteProductImage(productId, imageType = 'product') {
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase is not configured');
    }

    // List files in the product directory to find the image
    const { data: files, error: listError } = await supabase.storage
      .from('product-images')
      .list(`products/${productId}`);

    if (listError) {
      console.error('Error listing product images:', listError);
      return false;
    }

    // Find the file matching the image type
    const fileToDelete = files?.find(file => 
      file.name.startsWith(`${imageType}-`) || 
      file.name.includes(imageType)
    );

    if (!fileToDelete) {
      console.log(`No ${imageType} image found for product ${productId}`);
      return true; // Not an error if file doesn't exist
    }

    const filePath = `products/${productId}/${fileToDelete.name}`;

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting product image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProductImage:', error);
    return false;
  }
}

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
 * Delete approval PDF from Supabase Storage
 * @param {string} projectId - Project ID
 * @param {string} filename - Filename for the PDF (default: 'approval-proof.pdf')
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
export async function deleteApprovalPDF(projectId, filename = 'approval-proof.pdf') {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('Supabase not configured, skipping PDF deletion');
      return false;
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.warn('Not authenticated, skipping PDF deletion');
      return false;
    }

    // Create file path: approvals/{projectId}/{filename}
    const filePath = `approvals/${projectId}/${filename}`;

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from('project-files')
      .remove([filePath]);

    if (error) {
      // If file doesn't exist, that's okay - log but don't fail
      if (error.message && error.message.includes('not found')) {
        console.log('Approval PDF not found in storage, skipping deletion:', filePath);
        return true;
      }
      console.error('Error deleting approval PDF:', error);
      return false;
    }

    console.log('Successfully deleted approval PDF:', filePath);
    return true;
  } catch (error) {
    console.error('Error in deleteApprovalPDF:', error);
    return false;
  }
}

/**
 * Delete preview image from Supabase Storage
 * @param {string} projectId - Project ID
 * @param {string} filename - Filename for the image (default: 'preview.png')
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
export async function deletePreviewImage(projectId, filename = 'preview.png') {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('Supabase not configured, skipping preview image deletion');
      return false;
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.warn('Not authenticated, skipping preview image deletion');
      return false;
    }

    // Create file path: previews/{projectId}/{filename}
    const filePath = `previews/${projectId}/${filename}`;

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from('project-files')
      .remove([filePath]);

    if (error) {
      // If file doesn't exist, that's okay - log but don't fail
      if (error.message && error.message.includes('not found')) {
        console.log('Preview image not found in storage, skipping deletion:', filePath);
        return true;
      }
      console.error('Error deleting preview image:', error);
      return false;
    }

    console.log('Successfully deleted preview image:', filePath);
    return true;
  } catch (error) {
    console.error('Error in deletePreviewImage:', error);
    return false;
  }
}

/**
 * Delete all project files from Supabase Storage (approval PDF and preview image)
 * Also attempts to delete all files in the approvals folder for this project
 * @param {string} projectId - Project ID
 * @returns {Promise<{pdfDeleted: boolean, previewDeleted: boolean}>} Status of deletions
 */
export async function deleteProjectFiles(projectId) {
  const results = {
    pdfDeleted: false,
    previewDeleted: false
  };

  try {
    // Delete both files in parallel
    // Use the same filename format as upload: approval-proof-{projectId}.pdf
    const [pdfResult, previewResult] = await Promise.allSettled([
      deleteApprovalPDF(projectId, `approval-proof-${projectId}.pdf`),
      deletePreviewImage(projectId)
    ]);

    results.pdfDeleted = pdfResult.status === 'fulfilled' && pdfResult.value === true;
    results.previewDeleted = previewResult.status === 'fulfilled' && previewResult.value === true;

    // Also try to delete any other files in the approvals folder for this project
    // This ensures we clean up any orphaned files
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      if (supabaseUrl) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // List all files in the approvals/{projectId} folder
          const { data: files, error: listError } = await supabase.storage
            .from('project-files')
            .list(`approvals/${projectId}`);

          if (!listError && files && files.length > 0) {
            // Delete all files in the folder
            const filePaths = files.map(file => `approvals/${projectId}/${file.name}`);
            const { error: removeError } = await supabase.storage
              .from('project-files')
              .remove(filePaths);

            if (!removeError) {
              console.log(`Deleted ${filePaths.length} file(s) from approvals/${projectId}/`);
            }
          }
        }
      }
    } catch (folderCleanupError) {
      // Don't fail if folder cleanup fails - main files are already deleted
      console.warn('Error cleaning up approvals folder:', folderCleanupError);
    }

    console.log('Project files deletion results:', {
      projectId,
      pdfDeleted: results.pdfDeleted,
      previewDeleted: results.previewDeleted
    });

    return results;
  } catch (error) {
    console.error('Error deleting project files:', error);
    return results;
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

/**
 * Upload artwork file to Supabase Storage
 * @param {Blob|File} artworkFile - Artwork file (DXF, SVG, PNG, etc.)
 * @param {string} artworkId - Artwork ID
 * @param {string} fileType - Type: 'image' or 'texture'
 * @param {string} filename - Optional custom filename
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadArtworkFile(artworkFile, artworkId, fileType = 'image', filename = null) {
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase is not configured');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    // Determine filename if not provided
    if (!filename) {
      // Use the file's actual extension (will be .svg if converted from DXF)
      const extension = artworkFile.name?.split('.').pop() || 'svg';
      filename = `${fileType}-${artworkId}.${extension}`;
    }

    // Create file path: {artworkId}/{fileType}-{artworkId}.{ext}
    const filePath = `${artworkId}/${filename}`;

    // Determine content type based on file extension
    const contentType = artworkFile.type || 
      (filename.endsWith('.dxf') ? 'application/dxf' :
       filename.endsWith('.svg') ? 'image/svg+xml' :
       filename.endsWith('.png') ? 'image/png' :
       filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
       'application/octet-stream');

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('artwork')
      .upload(filePath, artworkFile, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      console.error('Error uploading artwork file:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('artwork')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadArtworkFile:', error);
    throw error;
  }
}

/**
 * Delete artwork file from Supabase Storage
 * @param {string} artworkId - Artwork ID
 * @param {string} fileType - Type: 'image' or 'texture'
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteArtworkFile(artworkId, fileType = 'image') {
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase is not configured');
    }

    // List files in the artwork directory
    const { data: files, error: listError } = await supabase.storage
      .from('artwork')
      .list(artworkId);

    if (listError) {
      console.error('Error listing artwork files:', listError);
      return false;
    }

    // Find the file matching the file type
    const fileToDelete = files?.find(file => 
      file.name.startsWith(`${fileType}-`) || 
      file.name.includes(fileType)
    );

    if (!fileToDelete) {
      console.log(`No ${fileType} file found for artwork ${artworkId}`);
      return true; // Not an error if file doesn't exist
    }

    const filePath = `${artworkId}/${fileToDelete.name}`;

    const { error } = await supabase.storage
      .from('artwork')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting artwork file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteArtworkFile:', error);
    return false;
  }
}

/**
 * Delete all artwork files from Supabase Storage (image and texture)
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<{imageDeleted: boolean, textureDeleted: boolean}>} Status of deletions
 */
export async function deleteAllArtworkFiles(artworkId) {
  const results = {
    imageDeleted: false,
    textureDeleted: false
  };

  try {
    // Delete both files in parallel
    const [imageResult, textureResult] = await Promise.allSettled([
      deleteArtworkFile(artworkId, 'image'),
      deleteArtworkFile(artworkId, 'texture')
    ]);

    results.imageDeleted = imageResult.status === 'fulfilled' && imageResult.value === true;
    results.textureDeleted = textureResult.status === 'fulfilled' && textureResult.value === true;

    console.log('Artwork files deletion results:', {
      artworkId,
      imageDeleted: results.imageDeleted,
      textureDeleted: results.textureDeleted
    });

    return results;
  } catch (error) {
    console.error('Error deleting artwork files:', error);
    return results;
  }
}

