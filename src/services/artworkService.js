/**
 * Artwork Service
 * Handles CRUD operations for artwork in the database
 */

import { supabase } from '../lib/supabase';

class ArtworkService {
  /**
   * Get all artwork from database
   */
  async getAllArtwork(includeInactive = false) {
    try {
      let query = supabase
        .from('artwork')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching artwork:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get artwork by category
   */
  async getArtworkByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('artwork')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching artwork by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from('artwork')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      // Extract unique categories
      const categories = [...new Set((data || []).map(item => item.category))].sort();
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single artwork by ID
   */
  async getArtworkById(artworkId) {
    try {
      const { data, error } = await supabase
        .from('artwork')
        .select('*')
        .eq('id', artworkId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching artwork:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new artwork
   */
  async createArtwork(artwork) {
    try {
      const artworkData = {
        id: artwork.id,
        name: artwork.name,
        category: artwork.category,
        image_url: artwork.imageUrl || null,
        texture_url: artwork.textureUrl || null,
        default_width: artwork.defaultWidth || 5.0,
        min_width: artwork.minWidth || null,
        is_active: artwork.isActive !== undefined ? artwork.isActive : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('artwork')
        .insert(artworkData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating artwork:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing artwork
   */
  async updateArtwork(artworkId, updates) {
    try {
      const updateData = {
        name: updates.name,
        category: updates.category,
        image_url: updates.imageUrl || null,
        texture_url: updates.textureUrl || null,
        default_width: updates.defaultWidth || 5.0,
        min_width: updates.minWidth || null,
        is_active: updates.isActive !== undefined ? updates.isActive : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('artwork')
        .update(updateData)
        .eq('id', artworkId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating artwork:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an artwork
   * Also deletes associated files from Supabase Storage
   */
  async deleteArtwork(artworkId) {
    try {
      // First, delete all artwork files from storage
      const { deleteAllArtworkFiles } = await import('../utils/storageService');
      const fileResults = await deleteAllArtworkFiles(artworkId);
      
      console.log('Artwork files deletion status:', fileResults);
      
      // Then delete the database record
      const { error } = await supabase
        .from('artwork')
        .delete()
        .eq('id', artworkId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting artwork:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ArtworkService();

