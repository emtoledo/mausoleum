/**
 * Product Service
 * Handles CRUD operations for products in the database
 */

import { supabase } from '../lib/supabase';

class ProductService {
  /**
   * Check if current user is a master admin
   */
  async isMasterAdmin() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('No authenticated user:', authError);
        return false;
      }

      console.log('Checking master admin status for user:', {
        id: user.id,
        email: user.email
      });

      // Try using .maybeSingle() instead of .single() to avoid errors when no row found
      const { data, error } = await supabase
        .from('master_admins')
        .select('id, email, name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error querying master_admins:', error);
        // If it's a permission error, try a different approach
        if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          console.error('RLS policy may be blocking access. User ID:', user.id);
        }
        return false;
      }

      const isAdmin = !!data;
      console.log('Master admin check result:', {
        isAdmin,
        userInTable: !!data,
        userData: data
      });

      return isAdmin;
    } catch (error) {
      console.error('Error checking master admin status:', error);
      return false;
    }
  }

  /**
   * Get all products from database
   */
  async getAllProducts(includeInactive = false) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('product_category', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(productId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching product:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new product
   */
  async createProduct(product) {
    try {
      const productData = {
        id: product.id,
        name: product.name,
        product_category: product.productCategory,
        preview_image_url: product.previewImage || null,
        product_image_url: product.imageUrl || null,
        product_overlay_url: product.overlayUrl || null,
        real_world_width: product.realWorldWidth,
        real_world_height: product.realWorldHeight,
        canvas_width: product.canvas?.width || null,
        canvas_height: product.canvas?.height || null,
        available_materials: product.availableMaterials || [],
        default_material_id: product.defaultMaterialId || null,
        edit_zones: product.editZones || [],
        product_base: product.productBase || [],
        floral: product.floral || [],
        dimensions_for_display: product.dimensionsForDisplay || null,
        available_views: product.availableViews || ['front'],
        available_templates: product.availableTemplates || [],
        default_template_id: product.defaultTemplateId || null,
        is_active: product.isActive !== undefined ? product.isActive : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId, updates) {
    try {
      const updateData = {
        name: updates.name,
        product_category: updates.productCategory,
        preview_image_url: updates.previewImage || null,
        product_image_url: updates.imageUrl || null,
        product_overlay_url: updates.overlayUrl || null,
        real_world_width: updates.realWorldWidth,
        real_world_height: updates.realWorldHeight,
        canvas_width: updates.canvas?.width || null,
        canvas_height: updates.canvas?.height || null,
        available_materials: updates.availableMaterials || [],
        default_material_id: updates.defaultMaterialId || null,
        edit_zones: updates.editZones || [],
        product_base: updates.productBase || [],
        floral: updates.floral || [],
        dimensions_for_display: updates.dimensionsForDisplay || null,
        available_views: updates.availableViews || ['front'],
        available_templates: updates.availableTemplates || [],
        default_template_id: updates.defaultTemplateId || null,
        is_active: updates.isActive !== undefined ? updates.isActive : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
  }


  /**
   * Get products by category
   */
  async getProductsByCategory(category) {
    try {
      // Fetch products and sort by extracting the numeric part of the name
      // This ensures "Estate 1" comes before "Estate 2" and "Estate 10" comes after "Estate 9"
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_category', category)
        .eq('is_active', true);

      if (error) throw error;

      // Sort products by extracting the number from the name
      // Handles patterns like "Estate 1", "Estate Collection 2", etc.
      const sortedData = (data || []).sort((a, b) => {
        // Extract number from product name (e.g., "Estate 1" -> 1, "Estate Collection 12" -> 12)
        const extractNumber = (name) => {
          const match = name.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };

        const numA = extractNumber(a.name);
        const numB = extractNumber(b.name);

        // If both have numbers, sort numerically
        if (numA > 0 && numB > 0) {
          return numA - numB;
        }

        // If only one has a number, put it first
        if (numA > 0) return -1;
        if (numB > 0) return 1;

        // If neither has a number, sort alphabetically
        return a.name.localeCompare(b.name);
      });

      return { success: true, data: sortedData };
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('product_category')
        .eq('is_active', true);

      if (error) throw error;

      const categories = [...new Set(data.map(p => p.product_category))].sort();
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: error.message };
    }
  }
}

const productService = new ProductService();
export default productService;

