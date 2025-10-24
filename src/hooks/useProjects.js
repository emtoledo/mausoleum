import { useState, useEffect } from 'react';
import dataService from '../services/dataService';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const allProjects = await dataService.getAllProjects();
      setProjects(allProjects);
    } catch (err) {
      setError(err.message);
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const refreshProjects = () => {
    loadProjects();
  };

  return {
    projects,
    loading,
    error,
    refreshProjects
  };
};
