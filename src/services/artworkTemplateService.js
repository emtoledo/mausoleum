/**
 * Artwork Template Service
 * Handles CRUD operations for artwork templates
 */

import { supabase } from '../lib/supabase';
import productService from './productService';

class ArtworkTemplateService {
  /**
   * Get all artwork templates
   */
  async getAllTemplates() {
    try {
      const { data, error } = await supabase
        .from('artwork_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching artwork templates:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single artwork template by ID
   */
  async getTemplateById(templateId) {
    try {
      const { data, error } = await supabase
        .from('artwork_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching artwork template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new artwork template
   * @param {Object} templateData - Template data
   * @param {string} templateData.name - Template name
   * @param {Array} templateData.designElements - Design elements array
   * @param {Object} templateData.customizations - Customizations object
   * @param {Blob} previewBlob - Preview image blob
   */
  async createTemplate(templateData, previewBlob) {
    try {
      // Check if user is master admin
      const isAdmin = await productService.isMasterAdmin();
      if (!isAdmin) {
        throw new Error('Master admin access required to create artwork templates');
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Create template record first to get the ID
      const { data: templateRecord, error: insertError } = await supabase
        .from('artwork_templates')
        .insert({
          name: templateData.name,
          preview_image_url: null, // Will be updated after upload
          design_elements: templateData.designElements || [],
          customizations: templateData.customizations || {},
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload preview image if provided (using the database-generated template ID)
      let previewImageUrl = null;
      if (previewBlob && templateRecord?.id) {
        const filePath = `artwork-templates/${templateRecord.id}/preview.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, previewBlob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading preview image:', uploadError);
          // Don't throw - template is already created, just log the error
          // We can update the template later if needed
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(filePath);

          previewImageUrl = urlData.publicUrl;

          // Update template with preview URL
          const { error: updateError } = await supabase
            .from('artwork_templates')
            .update({ preview_image_url: previewImageUrl })
            .eq('id', templateRecord.id);

          if (updateError) {
            console.error('Error updating template with preview URL:', updateError);
          }
        }
      }

      // Return the template with updated preview URL
      return { 
        success: true, 
        data: { ...templateRecord, preview_image_url: previewImageUrl } 
      };
    } catch (error) {
      console.error('Error creating artwork template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an artwork template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates to apply
   */
  async updateTemplate(templateId, updates) {
    try {
      // Check if user is master admin
      const isAdmin = await productService.isMasterAdmin();
      if (!isAdmin) {
        throw new Error('Master admin access required to update artwork templates');
      }

      const updateData = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.designElements !== undefined) updateData.design_elements = updates.designElements;
      if (updates.customizations !== undefined) updateData.customizations = updates.customizations;

      const { data, error } = await supabase
        .from('artwork_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating artwork template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an artwork template
   * @param {string} templateId - Template ID
   */
  async deleteTemplate(templateId) {
    try {
      // Check if user is master admin
      const isAdmin = await productService.isMasterAdmin();
      if (!isAdmin) {
        throw new Error('Master admin access required to delete artwork templates');
      }

      // First, get the template to retrieve preview image URL
      const { data: template, error: fetchError } = await supabase
        .from('artwork_templates')
        .select('preview_image_url')
        .eq('id', templateId)
        .single();

      if (fetchError) {
        console.error('Error fetching template for deletion:', fetchError);
        // Continue with deletion even if fetching fails
      } else if (template?.preview_image_url) {
        // Delete preview image from storage
        try {
          const urlParts = template.preview_image_url.split('/public/');
          if (urlParts.length >= 2) {
            const pathAfterPublic = urlParts[1];
            const pathSegments = pathAfterPublic.split('/');
            const bucketName = pathSegments[0];
            const filePath = pathSegments.slice(1).join('/');

            if (bucketName && filePath) {
              await supabase.storage
                .from(bucketName)
                .remove([filePath]);
            }
          }
        } catch (storageError) {
          console.error('Error deleting preview image:', storageError);
          // Continue with template deletion even if image deletion fails
        }
      }

      // Delete template record
      const { error } = await supabase
        .from('artwork_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting artwork template:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const artworkTemplateService = new ArtworkTemplateService();
export default artworkTemplateService;

