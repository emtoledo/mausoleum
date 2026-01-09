import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import { useLocation } from '../context/LocationContext';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get current location from context
  const { currentLocation, isMasterAdmin, loading: locationLoading } = useLocation();

  const loadProjects = useCallback(async () => {
    // Wait for location context to finish loading
    if (locationLoading) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get location ID from current location
      const locationId = currentLocation?.id || null;
      
      console.log('useProjects: Loading projects for location:', locationId, 'isMasterAdmin:', isMasterAdmin);
      
      const allProjects = await dataService.getAllProjects(locationId, isMasterAdmin);
      setProjects(allProjects);
    } catch (err) {
      setError(err.message);
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, [currentLocation?.id, isMasterAdmin, locationLoading]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refreshProjects = useCallback(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading: loading || locationLoading,
    error,
    refreshProjects
  };
};
