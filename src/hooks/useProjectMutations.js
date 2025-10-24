import { useState } from 'react';
import dataService from '../services/dataService';

export const useProjectMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      const project = await dataService.saveProject(projectData);
      return { success: true, data: project };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (projectId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      const project = await dataService.updateProject(projectId, updateData);
      return { success: true, data: project };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      await dataService.deleteProject(projectId);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getProject = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      const project = dataService.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      return { success: true, data: project };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProject
  };
};
