// Local database service using localStorage
import templateService from './templateService';

class DataService {
  constructor() {
    this.storageKey = 'valhalla_memorial_projects';
  }

  // Get all projects from localStorage
  getAllProjects() {
    try {
      const projects = localStorage.getItem(this.storageKey);
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  // Save a new project
  async saveProject(project) {
    try {
      const projects = this.getAllProjects();
      const newProject = {
        id: this.generateId(),
        title: project.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templates: await templateService.initializeProjectTemplates(),
        ...project
      };
      
      projects.push(newProject);
      localStorage.setItem(this.storageKey, JSON.stringify(projects));
      
      console.log('Project saved:', newProject);
      return newProject;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  // Get a project by ID
  getProjectById(id) {
    const projects = this.getAllProjects();
    return projects.find(project => project.id === id);
  }

  // Update an existing project
  updateProject(id, updates) {
    try {
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(project => project.id === id);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(projects));
      return projects[projectIndex];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Delete a project
  deleteProject(id) {
    try {
      const projects = this.getAllProjects();
      const filteredProjects = projects.filter(project => project.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredProjects));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Clear all projects (useful for testing)
  clearAllProjects() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('All projects cleared');
      return true;
    } catch (error) {
      console.error('Error clearing projects:', error);
      throw error;
    }
  }

  // Generate a unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get project count
  getProjectCount() {
    return this.getAllProjects().length;
  }

  // Search projects by title
  searchProjects(searchTerm) {
    const projects = this.getAllProjects();
    return projects.filter(project => 
      project.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Template management methods
  async updateProjectTemplates(projectId, templateUpdates) {
    try {
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(project => project.id === projectId);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      projects[projectIndex].templates = templateUpdates;
      projects[projectIndex].updatedAt = new Date().toISOString();
      
      localStorage.setItem(this.storageKey, JSON.stringify(projects));
      return projects[projectIndex];
    } catch (error) {
      console.error('Error updating project templates:', error);
      throw error;
    }
  }

  async selectProjectTemplate(projectId, templateId) {
    try {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedTemplates = templateService.selectTemplate(project.templates, templateId);
      return await this.updateProjectTemplates(projectId, updatedTemplates);
    } catch (error) {
      console.error('Error selecting template:', error);
      throw error;
    }
  }

  async configureProjectTemplate(projectId, templateId, customizations) {
    try {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedTemplates = templateService.updateTemplateConfiguration(
        project.templates, 
        templateId, 
        { customizations }
      );
      
      return await this.updateProjectTemplates(projectId, updatedTemplates);
    } catch (error) {
      console.error('Error configuring template:', error);
      throw error;
    }
  }

  getProjectTemplates(projectId) {
    const project = this.getProjectById(projectId);
    return project ? project.templates : [];
  }

  getSelectedProjectTemplate(projectId) {
    const project = this.getProjectById(projectId);
    if (!project || !project.templates) {
      return null;
    }
    return templateService.getSelectedTemplate(project.templates);
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
