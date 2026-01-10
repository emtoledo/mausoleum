/**
 * User Service
 * Handles user account management with location support
 */

import { supabase } from '../lib/supabase';

class UserService {
  /**
   * Create a user account entry with location and role
   * @param {string} userId - Auth user ID (from Supabase Auth)
   * @param {string} email - User's email
   * @param {string} fullName - User's full name
   * @param {string} locationId - Location UUID to assign user to
   * @param {string} role - User role (user, admin, sales)
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createUserAccount(userId, email, fullName, locationId = null, role = 'user') {
    try {
      if (!userId || !email) {
        return { success: false, error: 'User ID and email are required' };
      }

      const { data, error } = await supabase
        .from('user_accounts')
        .insert({
          id: userId,
          email: email,
          full_name: fullName || null,
          location_id: locationId || null,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error (user already exists)
        if (error.code === '23505') {
          console.log('User account already exists, updating instead');
          return this.updateUserAccount(userId, { 
            full_name: fullName,
            location_id: locationId 
          });
        }
        throw error;
      }

      console.log('User account created:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating user account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user account by ID
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getUserAccount(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      // First try to get user account without location join (simpler query)
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User account doesn't exist - this is expected for users created before this feature
          return { success: false, error: 'User account not found', notFound: true };
        }
        throw error;
      }

      // If user has a location_id, fetch location data separately
      if (data.location_id) {
        try {
          const { data: locationData } = await supabase
            .from('locations')
            .select('*')
            .eq('id', data.location_id)
            .single();
          
          if (locationData) {
            data.location = locationData;
          }
        } catch (locError) {
          // Location fetch failed, but we still have user data
          console.warn('Could not fetch location for user:', locError);
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user account
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateUserAccount(userId, updates) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
      if (updates.location_id !== undefined) updateData.location_id = updates.location_id;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.email !== undefined) updateData.email = updates.email;

      const { data, error } = await supabase
        .from('user_accounts')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating user account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's location
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getUserLocation(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const { data, error } = await supabase
        .from('user_accounts')
        .select('location_id, location:locations(*)')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User account not found' };
        }
        throw error;
      }

      return { 
        success: true, 
        data: data.location || null,
        locationId: data.location_id
      };
    } catch (error) {
      console.error('Error fetching user location:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's role
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, role?: string, error?: string}>}
   */
  async getUserRole(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const { data, error } = await supabase
        .from('user_accounts')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, role: 'user' }; // Default role
        }
        throw error;
      }

      return { success: true, role: data.role || 'user' };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is a location admin
   * @param {string} userId - User ID
   * @param {string} locationId - Location ID to check
   * @returns {Promise<boolean>}
   */
  async isLocationAdmin(userId, locationId) {
    try {
      if (!userId || !locationId) return false;

      const result = await this.getUserAccount(userId);
      if (!result.success) return false;

      const { data } = result;
      return data.role === 'admin' && data.location_id === locationId;
    } catch (error) {
      console.error('Error checking location admin status:', error);
      return false;
    }
  }

  /**
   * Get all users for a location (location admin only)
   * @param {string} locationId - Location ID
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getUsersByLocation(locationId) {
    try {
      if (!locationId) {
        return { success: false, error: 'Location ID is required' };
      }

      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching users by location:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign user to a location
   * @param {string} userId - User ID
   * @param {string} locationId - Location ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async assignUserToLocation(userId, locationId) {
    try {
      return await this.updateUserAccount(userId, { location_id: locationId });
    } catch (error) {
      console.error('Error assigning user to location:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user role
   * @param {string} userId - User ID
   * @param {string} role - New role (user, admin, sales)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateUserRole(userId, role) {
    try {
      const validRoles = ['user', 'admin', 'sales', 'master_admin'];
      if (!validRoles.includes(role)) {
        return { success: false, error: 'Invalid role. Must be one of: user, admin, sales, master_admin' };
      }

      return await this.updateUserAccount(userId, { role });
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (master admin only)
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*, location:locations(id, name, slug)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which users are master admins
      const { data: masterAdmins } = await supabase
        .from('master_admins')
        .select('id, email');

      const masterAdminIds = new Set((masterAdmins || []).map(ma => ma.id));

      // Add master admin flag to users
      const usersWithMasterFlag = (data || []).map(user => ({
        ...user,
        is_master_admin: masterAdminIds.has(user.id)
      }));

      return { success: true, data: usersWithMasterFlag };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add user as master admin
   * @param {string} userId - User ID
   * @param {string} email - User's email
   * @param {string} name - User's name
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async addMasterAdmin(userId, email, name) {
    try {
      if (!userId || !email) {
        return { success: false, error: 'User ID and email are required' };
      }

      const { data, error } = await supabase
        .from('master_admins')
        .insert({
          id: userId,
          email: email,
          name: name || email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'User is already a master admin' };
        }
        throw error;
      }

      // Also update user_accounts role to master_admin
      await this.updateUserAccount(userId, { role: 'master_admin' });

      return { success: true, data };
    } catch (error) {
      console.error('Error adding master admin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove user from master admins
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeMasterAdmin(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const { error } = await supabase
        .from('master_admins')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Update user_accounts role back to user
      await this.updateUserAccount(userId, { role: 'user' });

      return { success: true };
    } catch (error) {
      console.error('Error removing master admin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is a master admin
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async checkIsMasterAdmin(userId) {
    try {
      if (!userId) return false;

      const { data, error } = await supabase
        .from('master_admins')
        .select('id')
        .eq('id', userId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const userService = new UserService();
export default userService;
