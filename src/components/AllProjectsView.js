import React from 'react';
import AppHeader from './AppHeader';
import AccountSettingsView from './AccountSettingsView';
import dataService from '../services/dataService';
import templateService from '../services/templateService';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const AllProjectsView = ({ onBack, onCreateNewProject, onProjectClick, onAllProjectsNavigation, onAccountSettingsNavigation }) => {
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const { setCanvasLayout } = useCanvasLayout();

  React.useEffect(() => {
    setCanvasLayout(true);
    loadProjects();
  }, [setCanvasLayout]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await dataService.getAllProjects();
      console.log('AllProjectsView - Loaded projects:', allProjects);
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await dataService.deleteProject(projectId);
        await loadProjects(); // Reload the projects list
        console.log('Project deleted successfully');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      }
    }
  };

  const handleProjectClick = (project) => {
    console.log('AllProjectsView - handleProjectClick called with project:', project);
    console.log('AllProjectsView - Navigating to Template Grid for project:', project.title);
    
    // Call the onProjectClick prop to navigate to Template Grid
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  const handleCreateNewProject = () => {
    if (onCreateNewProject) {
      onCreateNewProject();
    }
  };

  const handleSave = () => {
    console.log('Save clicked');
  };

  const handleShare = () => {
    console.log('Share clicked');
  };


  const handleMoreOptions = () => {
    console.log('More options clicked');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };




  const formatLastEdited = (lastEdited) => {
    if (!lastEdited) return 'Never edited';
    
    const now = new Date();
    const editedDate = new Date(lastEdited);
    const diffTime = Math.abs(now - editedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Edited 1 day ago';
    if (diffDays < 7) return `Edited ${diffDays} days ago`;
    if (diffDays < 30) return `Edited ${Math.ceil(diffDays / 7)} weeks ago`;
    return `Edited ${Math.ceil(diffDays / 30)} months ago`;
  };

  const getProjectThumbnail = (project) => {
    if (project.selectedTemplates && project.selectedTemplates.length > 0) {
      return project.selectedTemplates[0].baseImage;
    }
    return '/images/templates/template_1.png'; // Default thumbnail
  };


  if (loading) {
    return (
      <div className="all-projects-container">
        <AppHeader
          projectTitle="All Projects"
          currentPage=""
          onSave={handleSave}
          onShare={handleShare}
          onMoreOptions={handleMoreOptions}
          onProfileClick={handleProfileClick}
          onAllProjectsNavigation={onAllProjectsNavigation}
          onAccountSettingsNavigation={onAccountSettingsNavigation}
          showCanvasControls={false}
          showFullBreadcrumb={false}
          showSaveButton={false}
          showShareButton={false}
        />
        <div className="projects-content">
          <div className="loading-message">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="all-projects-container">
      <AppHeader
        projectTitle="All Projects"
        currentPage=""
        onSave={handleSave}
        onShare={handleShare}
        onMoreOptions={handleMoreOptions}
        onProfileClick={handleProfileClick}
        onAllProjectsNavigation={onAllProjectsNavigation}
        onAccountSettingsNavigation={onAccountSettingsNavigation}
        showCanvasControls={false}
        showFullBreadcrumb={false}
        showSaveButton={false}
        showShareButton={false}
      />
      
      <div className="projects-content">
        <div className="projects-header">
          <h1 className="projects-title">VALHALLA MEMORIAL</h1>
          <button className="create-new-project-btn" onClick={handleCreateNewProject}>
            Create New Project
          </button>
        </div>
        
        <div className="projects-list">
          {projects.length === 0 ? (
            <div className="no-projects">
              <p>No projects found. Create your first memorial project!</p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="project-card" onClick={() => handleProjectClick(project)}>
                <div className="project-thumbnail">
                  <img 
                    src={templateService.getTemplateImagePath(getProjectThumbnail(project))} 
                    alt={`${project.title} thumbnail`}
                    className="thumbnail-image"
                  />
                </div>
                <div className="project-info">
                  <div className="project-name">
                    {project.title}
                  </div>
                </div>
                <div className="project-info">
                  <div className="project-meta">
                    <span className="last-edited">{formatLastEdited(project.lastEdited)}</span>
                  </div>
                </div>    
                <div className="project-info">
                  <div className="project-meta">
                    <span className="project-status">Draft</span>
                  </div>
                </div>         
                <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="delete-project-btn"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="footer-branding">
      <div className="mausoleum-logo">
        <img src="/images/poweredby_dark.png" alt="MAUSOLEUM" className="mausoleum-img" />
      </div>
    </div>

    </div>



  );
};

export default AllProjectsView;
