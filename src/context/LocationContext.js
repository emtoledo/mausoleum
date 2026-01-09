/**
 * Location Context
 * 
 * Manages current location state and configuration for multi-tenant support.
 * Provides location data, branding configuration, and location detection from URL.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import locationService from '../services/locationService';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const params = useParams(); // Now safe to use since we're inside Router
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationConfig, setLocationConfig] = useState(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Helper to check if a string is a valid UUID
   */
  const isValidUUID = (str) => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  /**
   * Check if current user is a master admin
   */
  const checkMasterAdmin = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setIsMasterAdmin(false);
      return false;
    }

    // Skip database query if user.id is not a valid UUID (e.g., localStorage fallback)
    if (!isValidUUID(user.id)) {
      setIsMasterAdmin(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('master_admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking master admin status:', error);
        return false;
      }

      const isAdmin = !!data;
      setIsMasterAdmin(isAdmin);
      return isAdmin;
    } catch (err) {
      console.error('Error checking master admin:', err);
      setIsMasterAdmin(false);
      return false;
    }
  }, [user, isAuthenticated]);

  /**
   * Get location from slug
   */
  const getLocationFromSlug = useCallback(async (slug) => {
    if (!slug) return null;

    try {
      const result = await locationService.getLocationBySlug(slug);
      return result.success ? result.data : null;
    } catch (err) {
      console.error('Error fetching location by slug:', err);
      return null;
    }
  }, []);

  /**
   * Get user's location from user_accounts table
   */
  const getUserLocation = useCallback(async () => {
    if (!user || !isAuthenticated) return null;

    // Skip database query if user.id is not a valid UUID (e.g., localStorage fallback)
    if (!isValidUUID(user.id)) {
      return null;
    }

    try {
      // First get the user_account to find location_id
      const { data: userAccount, error: accountError } = await supabase
        .from('user_accounts')
        .select('location_id')
        .eq('id', user.id)
        .maybeSingle();

      if (accountError) {
        // Don't log error for "no rows" - this is expected for users not yet assigned to a location
        if (accountError.code !== 'PGRST116') {
          console.warn('Error fetching user account:', accountError.message);
        }
        return null;
      }

      if (!userAccount?.location_id) {
        // User account exists but no location assigned - this is normal during migration
        return null;
      }

      // Then fetch the location details
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', userAccount.location_id)
        .maybeSingle();

      if (locationError) {
        console.error('Error fetching location:', locationError);
        return null;
      }

      return location;
    } catch (err) {
      console.error('Error getting user location:', err);
      return null;
    }
  }, [user, isAuthenticated]);

  /**
   * Detect location from URL or user account
   */
  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, check if user is master admin
      const isAdmin = await checkMasterAdmin();

      // Reserved paths that should NOT be treated as location slugs
      const reservedPaths = [
        'login', 'signup', 'auth', 'admin', 'projects', 'selection',
        'account-settings', '404', 'error'
      ];

      // Try to get location from URL slug first
      // Check params first (from React Router), then fallback to window.location
      const slugFromParams = params?.locationSlug;
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const slugFromPath = pathSegments[0]; // First path segment could be location slug
      
      // Only use slugFromPath if it's not a reserved path
      const isReservedPath = reservedPaths.includes(slugFromPath?.toLowerCase());
      const slugFromUrl = slugFromParams || (isReservedPath ? null : slugFromPath);
      
      if (slugFromUrl) {
        const location = await getLocationFromSlug(slugFromUrl);
        if (location) {
          setCurrentLocation(location);
          setLocationConfig({
            brandTitle: location.brand_title || location.name,
            projectsTitle: location.projects_title || location.name,
            approvalProofTitle: location.approval_proof_title || location.name,
            backgroundVideoUrl: location.background_video_url || '/videos/arlington_bg.mp4'
          });
          setLoading(false);
          return;
        }
      }

      // If no slug in URL, get user's location from account
      if (isAuthenticated && user) {
        const userLocation = await getUserLocation();
        if (userLocation) {
          setCurrentLocation(userLocation);
          setLocationConfig({
            brandTitle: userLocation.brand_title || userLocation.name,
            projectsTitle: userLocation.projects_title || userLocation.name,
            approvalProofTitle: userLocation.approval_proof_title || userLocation.name,
            backgroundVideoUrl: userLocation.background_video_url || '/videos/arlington_bg.mp4'
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: Get default location (first active location)
      const { data: defaultLocation, error: defaultError } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (defaultError || !defaultLocation) {
        console.warn('No default location found');
        setError('No location found');
        setLoading(false);
        return;
      }

      setCurrentLocation(defaultLocation);
      setLocationConfig({
        brandTitle: defaultLocation.brand_title || defaultLocation.name,
        projectsTitle: defaultLocation.projects_title || defaultLocation.name,
        approvalProofTitle: defaultLocation.approval_proof_title || defaultLocation.name,
        backgroundVideoUrl: defaultLocation.background_video_url || '/videos/arlington_bg.mp4'
      });
    } catch (err) {
      console.error('Error detecting location:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params, user, isAuthenticated, checkMasterAdmin, getLocationFromSlug, getUserLocation]);

  /**
   * Load location when component mounts or when user/params change
   * Note: We intentionally only include user and isAuthenticated as dependencies
   * to prevent infinite loops from navigation events
   */
  useEffect(() => {
    detectLocation();
  }, [user, isAuthenticated]);

  /**
   * Get all locations (for master admin)
   */
  const getAllLocations = useCallback(async () => {
    if (!isMasterAdmin) {
      return [];
    }

    try {
      const result = await locationService.getAllLocations();
      return result.success ? result.data : [];
    } catch (err) {
      console.error('Error fetching all locations:', err);
      return [];
    }
  }, [isMasterAdmin]);

  /**
   * Switch to a different location (for master admin)
   */
  const switchLocation = useCallback(async (locationId) => {
    if (!isMasterAdmin) {
      console.warn('Only master admins can switch locations');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (error) throw error;

      setCurrentLocation(data);
      setLocationConfig({
        brandTitle: data.brand_title || data.name,
        projectsTitle: data.projects_title || data.name,
        approvalProofTitle: data.approval_proof_title || data.name,
        backgroundVideoUrl: data.background_video_url || '/videos/arlington_bg.mp4'
      });

      return true;
    } catch (err) {
      console.error('Error switching location:', err);
      return false;
    }
  }, [isMasterAdmin]);

  const value = {
    // Current location data
    currentLocation,
    locationConfig,
    
    // Status flags
    isMasterAdmin,
    loading,
    error,
    
    // Functions
    getLocationFromSlug,
    getAllLocations,
    switchLocation,
    refreshLocation: detectLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

