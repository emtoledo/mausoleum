/**
 * Navigation Utilities
 * 
 * Helper functions for location-aware navigation.
 * Automatically includes location slug in navigation paths.
 */

import { useLocation } from '../context/LocationContext';

/**
 * Get the base path with location slug
 * @param {string} locationSlug - Optional location slug (if not provided, uses current location)
 * @returns {string} Base path with location slug (e.g., "/arlington-memorial" or "")
 */
export const getLocationPath = (locationSlug = null) => {
  // If no slug provided, try to get from current location context
  // Note: This won't work in all contexts, so slug should be passed when available
  if (!locationSlug) {
    // Return empty string for default/fallback routes
    return '';
  }
  return `/${locationSlug}`;
};

/**
 * Build a path with location slug
 * @param {string} path - The path to navigate to (e.g., "/projects", "/login")
 * @param {string} locationSlug - Optional location slug
 * @returns {string} Full path with location slug
 */
export const buildLocationPath = (path, locationSlug = null) => {
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If no location slug, return path as-is (for master admin routes, etc.)
  if (!locationSlug) {
    return `/${cleanPath}`;
  }
  
  return `/${locationSlug}/${cleanPath}`;
};

/**
 * Hook to get location-aware navigation helper
 * @returns {Function} Function that builds paths with location slug
 */
export const useLocationNavigation = () => {
  const { currentLocation } = useLocation();
  const locationSlug = currentLocation?.slug;

  return {
    /**
     * Build a path with current location slug
     * @param {string} path - The path to navigate to
     * @returns {string} Full path with location slug
     */
    buildPath: (path) => {
      return buildLocationPath(path, locationSlug);
    },
    
    /**
     * Get current location slug
     * @returns {string|null} Current location slug or null
     */
    getLocationSlug: () => locationSlug,
    
    /**
     * Check if we're in a location-specific route
     * @returns {boolean} True if location slug is present
     */
    hasLocationSlug: () => !!locationSlug
  };
};

/**
 * Extract location slug from current URL
 * @returns {string|null} Location slug from URL or null
 */
export const getLocationSlugFromUrl = () => {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  return pathSegments[0] || null;
};
