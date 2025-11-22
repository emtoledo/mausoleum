/**
 * Supabase Service
 * 
 * Replaces localStorage-based dataService with Supabase backend.
 * Falls back to localStorage if Supabase is not configured.
 */

import { supabase } from '../lib/supabase';
import dataService from './dataService'; // Fallback to localStorage

class SupabaseService {
  /**
   * Check if Supabase is configured
   */
  isConfigured() {
    return !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  }

  /**
   * Get all projects for the current user
   */
  async getAllProjects() {
    // Fallback to localStorage if Supabase not configured
    if (!this.isConfigured()) {
      console.log('Supabase not configured, using localStorage fallback');
      return this.getAllProjectsFromLocalStorage();
    }

    try {
      // Use getSession instead of getUser for more reliable auth check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        // Only log once per session to avoid spam
        if (!this._loggedAuthFallback) {
          console.log('Not authenticated with Supabase, using localStorage fallback');
          this._loggedAuthFallback = true;
        }
        return this.getAllProjectsFromLocalStorage();
      }

      const user = session.user;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_details (*)
        `)
        .eq('user_account_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase query error, falling back to localStorage:', error);
        return this.getAllProjectsFromLocalStorage();
      }

      // If no data, return empty array (not an error)
      if (!data || data.length === 0) {
        console.log('No projects found in Supabase, returning empty array');
        return [];
      }

      // Transform to match existing data structure
      return data.map(project => this.transformProject(project));
    } catch (error) {
      console.error('Error fetching projects from Supabase:', error);
      return this.getAllProjectsFromLocalStorage();
    }
  }

  /**
   * Get projects from localStorage (avoids circular dependency)
   */
  getAllProjectsFromLocalStorage() {
    try {
      const storageKey = 'valhalla_memorial_projects';
      const projects = localStorage.getItem(storageKey);
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(projectId) {
    // Fallback to localStorage if Supabase not configured
    if (!this.isConfigured()) {
      return dataService.getProjectById(projectId);
    }

    try {
      // Use getSession instead of getUser for more reliable auth check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        return dataService.getProjectById(projectId);
      }

      const user = session.user;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_details (*)
        `)
        .eq('id', projectId)
        .eq('user_account_id', user.id)
        .single();

      if (error) {
        console.error('Supabase error loading project:', error);
        return await dataService.getProjectById(projectId);
      }

      if (!data) {
        console.log('Project not found in Supabase');
        return null;
      }

      console.log('Supabase project loaded:', data);
      const transformed = this.transformProject(data);
      console.log('Transformed project:', transformed);
      return transformed;
    } catch (error) {
      console.error('Error fetching project from Supabase:', error);
      return dataService.getProjectById(projectId);
    }
  }

  /**
   * Create a new project
   */
  async saveProject(projectData) {
    // Fallback to localStorage if Supabase not configured
    if (!this.isConfigured()) {
      return dataService.saveProject(projectData);
    }

    try {
      // First try to get the session (more reliable than getUser)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        console.log('Not authenticated, using localStorage fallback');
        return dataService.saveProject(projectData);
      }

      const user = session.user;

      // Check if user's email is confirmed
      // Supabase stores email confirmation in email_confirmed_at field
      if (!user.email_confirmed_at) {
        console.log('User email not confirmed, blocking project creation');
        throw new Error('Please confirm your email address before creating projects. Check your inbox for the confirmation email.');
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_account_id: user.id,
          title: projectData.title,
          status: 'draft'
        })
        .select()
        .single();

      if (projectError) {
        console.error('Supabase error creating project:', projectError);
        // Re-throw RLS/permission errors so they're shown to the user
        if (projectError.code === '42501' || projectError.message?.includes('permission denied')) {
          throw new Error(`Permission denied: ${projectError.message}. Please ensure you're logged in and your email is confirmed.`);
        }
        // For other errors, fall back to localStorage
        return dataService.saveProject(projectData);
      }

      // Create project details if template is provided
      if (projectData.selectedTemplate) {
        const template = projectData.selectedTemplate;
        
        console.log('Creating project_details with template:', template);
        
        const { data: detailsData, error: detailsError } = await supabase
          .from('project_details')
          .insert({
            project_id: project.id,
            template_id: template.id,
            template_name: template.name,
            template_category: template.productCategory || null,
            preview_image_url: template.previewImage || null,
            template_image_url: template.imageUrl || null,
            template_overlay_url: template.overlayUrl || null,
            real_world_width: template.realWorldWidth || 24,
            real_world_height: template.realWorldHeight || 18,
            available_materials: template.availableMaterials || [],
            default_material_id: template.defaultMaterialId || null,
            canvas_width: template.canvas?.width || null,
            canvas_height: template.canvas?.height || null,
            edit_zones: template.editZones || [],
            product_base: template.productBase || [],
            selected_material_id: null,
            selected_material_name: null,
            design_elements: [],
            customizations: {}
          })
          .select()
          .single();

        if (detailsError) {
          console.error('Supabase error creating project details:', detailsError);
          console.error('Details error details:', JSON.stringify(detailsError, null, 2));
          // Don't continue - this is critical
          throw new Error(`Failed to create project details: ${detailsError.message}`);
        }
        
        console.log('Project details created successfully:', detailsData);
      } else {
        console.warn('No selectedTemplate provided when creating project');
      }

      // Return the created project
      return await this.getProjectById(project.id);
    } catch (error) {
      console.error('Error creating project in Supabase:', error);
      // Re-throw the error if it's an email confirmation error
      // This ensures the error message is shown to the user
      if (error.message && error.message.includes('confirm your email')) {
        throw error;
      }
      // For other errors, fall back to localStorage
      return dataService.saveProject(projectData);
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId, updateData) {
    // Fallback to localStorage if Supabase not configured
    if (!this.isConfigured()) {
      return dataService.updateProject(projectId, updateData);
    }

    try {
      // Use getSession instead of getUser for more reliable auth check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        return dataService.updateProject(projectId, updateData);
      }

      const user = session.user;

      // Update project
      const projectUpdates = {};
      if (updateData.title) projectUpdates.title = updateData.title;
      if (updateData.status) projectUpdates.status = updateData.status;
      if (updateData.approvalPdfUrl) projectUpdates.approval_pdf_url = updateData.approvalPdfUrl;
      if (updateData.previewImageUrl) projectUpdates.preview_image_url = updateData.previewImageUrl;
      if (updateData.lastEdited) projectUpdates.last_edited = updateData.lastEdited;
      projectUpdates.updated_at = new Date().toISOString();

      if (Object.keys(projectUpdates).length > 0) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectUpdates)
          .eq('id', projectId)
          .eq('user_account_id', user.id);

        if (projectError) {
          console.error('Supabase error updating project:', projectError);
          return dataService.updateProject(projectId, updateData);
        }
      }

      // Update project details if provided
      const detailsUpdates = {
        updated_at: new Date().toISOString()
      };
      
      let hasDetailsUpdates = false;

      if (updateData.template) {
        const template = updateData.template;
        hasDetailsUpdates = true;

        // Update design elements
        if (template.customizations?.designElements) {
          detailsUpdates.design_elements = template.customizations.designElements;
        }

        // Update customizations
        if (template.customizations) {
          detailsUpdates.customizations = {
            colors: template.customizations.colors || {},
            fonts: template.customizations.fonts || {},
            layout: template.customizations.layout || {}
          };
        }
      }

      // Update selected material if provided (can be updated independently of template)
      if (updateData.material) {
        hasDetailsUpdates = true;
        detailsUpdates.selected_material_id = updateData.material.id;
        detailsUpdates.selected_material_name = updateData.material.name;
        console.log('=== SUPABASE: Updating material ===');
        console.log('Material object:', updateData.material);
        console.log('Material ID:', updateData.material.id);
        console.log('Material name:', updateData.material.name);
      } else {
        console.warn('=== SUPABASE: No material in updateData ===');
        console.log('updateData keys:', Object.keys(updateData));
        console.log('updateData.material:', updateData.material);
      }

      // Only update project_details if there are actual updates
      if (hasDetailsUpdates) {
        const { error: detailsError } = await supabase
          .from('project_details')
          .update(detailsUpdates)
          .eq('project_id', projectId);

        if (detailsError) {
          console.error('Supabase error updating project details:', detailsError);
          // Continue anyway - project is updated
        } else {
          console.log('Project details updated successfully:', detailsUpdates);
        }
      }

      // Return updated project
      return await this.getProjectById(projectId);
    } catch (error) {
      console.error('Error updating project in Supabase:', error);
      return dataService.updateProject(projectId, updateData);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId) {
    // Fallback to localStorage if Supabase not configured
    if (!this.isConfigured()) {
      return dataService.deleteProject(projectId);
    }

    try {
      // Use getSession instead of getUser for more reliable auth check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        return dataService.deleteProject(projectId);
      }

      const user = session.user;

      // First, try to get the project to check for associated files
      // This helps us delete the files before deleting the project record
      let projectData = null;
      try {
        const { data: project, error: fetchError } = await supabase
          .from('projects')
          .select('approval_pdf_url, preview_image_url')
          .eq('id', projectId)
          .eq('user_account_id', user.id)
          .single();

        if (!fetchError && project) {
          projectData = project;
        }
      } catch (fetchErr) {
        console.warn('Could not fetch project data before deletion:', fetchErr);
        // Continue with deletion even if we can't fetch project data
      }

      // Delete associated files from storage (approval PDF and preview image)
      // Import dynamically to avoid circular dependencies
      try {
        const { deleteProjectFiles } = await import('../utils/storageService');
        await deleteProjectFiles(projectId);
      } catch (storageErr) {
        console.warn('Error deleting project files from storage:', storageErr);
        // Continue with project deletion even if file deletion fails
      }

      // Delete project (cascade will delete project_details)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_account_id', user.id);

      if (error) {
        console.error('Supabase error deleting project:', error);
        return dataService.deleteProject(projectId);
      }

      console.log('Project deleted successfully:', projectId);
      return true;
    } catch (error) {
      console.error('Error deleting project in Supabase:', error);
      return dataService.deleteProject(projectId);
    }
  }

  /**
   * Transform Supabase project data to match existing structure
   */
  transformProject(project) {
    console.log('Transforming project:', project);
    console.log('Project details:', project.project_details);
    
    // Handle both array and single object formats from Supabase
    const projectDetails = Array.isArray(project.project_details) 
      ? project.project_details[0] 
      : project.project_details;
    
    const template = projectDetails 
      ? this.transformProjectDetails(projectDetails)
      : null;
    
    console.log('Transformed template:', template);
    
    return {
      id: project.id,
      title: project.title,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      lastEdited: project.last_edited,
      status: project.status,
      approvalPdfUrl: project.approval_pdf_url,
      previewImageUrl: project.preview_image_url, // Preview image from projects table
      template: template
    };
  }

  /**
   * Transform project details to match existing structure
   */
  transformProjectDetails(details) {
    return {
      templateId: details.template_id,
      templateName: details.template_name,
      previewImage: details.preview_image_url,
      imageUrl: details.template_image_url,
      overlayUrl: details.template_overlay_url,
      realWorldWidth: parseFloat(details.real_world_width) || 24,
      realWorldHeight: parseFloat(details.real_world_height) || 18,
      availableMaterials: Array.isArray(details.available_materials) 
        ? details.available_materials 
        : (details.available_materials ? [details.available_materials] : []),
      defaultMaterialId: details.default_material_id,
      canvas: {
        width: parseFloat(details.canvas_width) || null,
        height: parseFloat(details.canvas_height) || null
      },
      editZones: details.edit_zones || [],
      productBase: details.product_base || [],
      customizations: {
        designElements: details.design_elements || [],
        colors: details.customizations?.colors || {},
        fonts: details.customizations?.fonts || {},
        layout: details.customizations?.layout || {}
      },
      selectedMaterialId: details.selected_material_id,
      selectedMaterialName: details.selected_material_name,
      // Store material object if we have the ID (will be resolved in transformProject)
      selectedMaterial: details.selected_material_id ? {
        id: details.selected_material_id,
        name: details.selected_material_name || ''
      } : null,
      configured: true
    };
  }
}

// Export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;

