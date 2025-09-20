// Debug helper for viewing stored data
import dataService from '../services/dataService';

export const debugHelper = {
  // View all projects in console
  viewAllProjects() {
    const projects = dataService.getAllProjects();
    console.log('All Projects:', projects);
    console.log('Project Count:', projects.length);
    return projects;
  },

  // View projects in a formatted table
  viewProjectsTable() {
    const projects = dataService.getAllProjects();
    console.table(projects);
    return projects;
  },

  // Clear all projects (useful for testing)
  clearAllProjects() {
    dataService.clearAllProjects();
    console.log('All projects cleared');
  },

  // Search projects by title
  searchProjects(searchTerm) {
    const results = dataService.searchProjects(searchTerm);
    console.log(`Search results for "${searchTerm}":`, results);
    return results;
  },

  // Get project statistics
  getStats() {
    const projects = dataService.getAllProjects();
    const stats = {
      totalProjects: projects.length,
      oldestProject: projects.length > 0 ? projects[0] : null,
      newestProject: projects.length > 0 ? projects[projects.length - 1] : null,
      projectTitles: projects.map(p => p.title)
    };
    console.log('Project Statistics:', stats);
    return stats;
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.debugHelper = debugHelper;
  console.log('Debug helper available as window.debugHelper');
}
