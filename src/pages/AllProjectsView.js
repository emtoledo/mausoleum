import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useProjects } from '../hooks/useProjects';
import { useProjectMutations } from '../hooks/useProjectMutations';
import { useProjectFlow } from '../context/ProjectFlowContext';
import templateService from '../services/templateService';

const AllProjectsView = () => {
  const navigate = useNavigate();
  const { projects, loading, error, refreshProjects } = useProjects();
  const { deleteProject } = useProjectMutations();
  const { openWizard } = useProjectFlow();
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, project: null });

  const handleProjectClick = (project) => {
    console.log('AllProjectsView - Project clicked:', project);
    // Navigate directly to edit mode since each project has only one template
    navigate(`/projects/${project.id}/edit`);
  };

  const handleCreateNewProject = () => {
    console.log('AllProjectsView - Create New Project clicked');
    openWizard(refreshProjects);
  };

  const handleDeleteProject = (project, e) => {
    e.stopPropagation(); // Prevent triggering project click
    setDeleteConfirm({ isOpen: true, project });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.project) return;

    try {
      const result = await deleteProject(deleteConfirm.project.id);
      if (result.success) {
        refreshProjects();
        console.log('Project deleted successfully');
      } else {
        alert('Error deleting project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    } finally {
      setDeleteConfirm({ isOpen: false, project: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, project: null });
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
    // Check if project has single template (new format)
    if (project.template) {
      // Use previewImage if available, otherwise fallback to baseImage
      return project.template.previewImage || project.template.baseImage;
    }
    // Legacy support: check templates array
    if (project.templates && project.templates.length > 0) {
      return project.templates[0].previewImage || project.templates[0].baseImage;
    }
    // Fallback to selectedTemplates (legacy format)
    if (project.selectedTemplates && project.selectedTemplates.length > 0) {
      return project.selectedTemplates[0].previewImage || project.selectedTemplates[0].baseImage;
    }
    // Default thumbnail
    return 'template_1.png';
  };

  if (loading) {
    return (
      <div className="all-projects-container">
        <div className="projects-content">
          <div className="loading-message">Loading projects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-projects-container">
        <div className="projects-content">
          <div className="error-message">Error loading projects: {error}</div>
          <Button onClick={refreshProjects}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="all-projects-container">
      <div className="projects-content">
        <div className="projects-header">
          <h1 className="projects-title">ARLINGTON MEMORIAL</h1>
          <Button 
            variant="primary"
            onClick={handleCreateNewProject}
            className="create-new-project-btn"
          >
            Create New Project
          </Button>
        </div>
        
        <div className="projects-list">
          {projects.length === 0 ? (
            <div className="no-projects">
              <img src="/images/empty.png" alt="No projects found" className="no-projects-image" />
              <p className="no-projects-quote">"A memory in stone is forever"</p>
              <p><a onClick={handleCreateNewProject}>Create Your First Project</a></p>
            </div>
          ) : (
            projects.map((project) => (
              <Card 
                key={project.id} 
                className="project-card" 
                onClick={() => handleProjectClick(project)}
                hoverable
              >
                <div className="project-thumbnail">
                  <img 
                    src={getProjectThumbnail(project)} 
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
                  <Button 
                    variant="danger"
                    size="small"
                    onClick={(e) => handleDeleteProject(project, e)}
                    className="delete-project-btn"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete project ${deleteConfirm.project?.title || ''}?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default AllProjectsView;
