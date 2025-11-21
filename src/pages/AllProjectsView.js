import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import { useProjects } from '../hooks/useProjects';
import { useProjectMutations } from '../hooks/useProjectMutations';
import { useProjectFlow } from '../context/ProjectFlowContext';
import templateService from '../services/templateService';

const AllProjectsView = () => {
  const navigate = useNavigate();
  const { projects, loading, error, refreshProjects } = useProjects();
  const { deleteProject, updateProject } = useProjectMutations();
  const { openWizard } = useProjectFlow();
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, project: null });
  const [editModal, setEditModal] = useState({ isOpen: false, project: null });
  const [editValues, setEditValues] = useState({ name: '', status: '' });

  const handleProjectClick = (project) => {
    console.log('AllProjectsView - Project clicked:', project);
    // If project is approved, navigate to approved view instead of edit mode
    if (project.status === 'approved') {
      navigate(`/projects/${project.id}/approved`);
    } else {
      // Navigate directly to edit mode since each project has only one template
      navigate(`/projects/${project.id}/edit`);
    }
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

  const handleOpenEdit = (project, e) => {
    e.stopPropagation(); // Prevent triggering project click
    setEditModal({ isOpen: true, project });
    setEditValues({
      name: project.title || '',
      status: project.status || 'draft'
    });
  };

  const isProjectApproved = (project) => {
    return project && project.status === 'approved';
  };

  const handleCloseEdit = () => {
    setEditModal({ isOpen: false, project: null });
    setEditValues({ name: '', status: '' });
  };

  const handleSaveEdit = async () => {
    if (!editModal.project) return;

    const updates = {};
    
    if (editValues.name.trim() && editValues.name.trim() !== editModal.project.title) {
      updates.title = editValues.name.trim();
    }
    
    // Only allow status changes if project is not approved
    if (!isProjectApproved(editModal.project) && editValues.status !== editModal.project.status) {
      updates.status = editValues.status;
    }

    if (Object.keys(updates).length > 0) {
      try {
        const result = await updateProject(editModal.project.id, updates);
        if (result.success) {
          refreshProjects();
          handleCloseEdit();
        } else {
          alert('Error updating project. Please try again.');
        }
      } catch (error) {
        console.error('Error updating project:', error);
        alert('Error updating project. Please try again.');
      }
    } else {
      handleCloseEdit();
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'draft': 'Draft',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'approved': 'Approved'
    };
    return statusMap[status] || status || 'Draft';
  };

  const getStatusClass = (status) => {
    const statusClassMap = {
      'draft': 'status-draft',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'approved': 'status-approved'
    };
    return statusClassMap[status] || 'status-draft';
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
                    <span className={`project-status ${getStatusClass(project.status)}`}>
                      {getStatusDisplay(project.status)}
                    </span>
                  </div>
                </div>         
                <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                  {isProjectApproved(project) ? (
                    <Button 
                      variant="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/approved`);
                      }}
                      className="view-approved-btn"
                    >
                      View Approved
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="link"
                        size="small"
                        onClick={(e) => handleOpenEdit(project, e)}
                        className="edit-project-btn"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="danger"
                        size="small"
                        onClick={(e) => handleDeleteProject(project, e)}
                        className="delete-project-btn"
                      >
                        Delete
                      </Button>
                    </>
                  )}
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

      {/* Edit Project Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={handleCloseEdit}
        className="edit-project-modal"
      >
        <div className="edit-project-modal-content">
          <h3 className="edit-project-modal-title">Edit Project</h3>
          
          <div className="edit-project-form">
            <div className="form-group">
              <label htmlFor="project-name" className="form-label">Project Name</label>
              <input
                id="project-name"
                type="text"
                value={editValues.name}
                onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                className="form-input"
                placeholder="Enter project name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-status" className="form-label">Status</label>
              {editModal.project && isProjectApproved(editModal.project) ? (
                <div className="form-readonly-status">
                  <span className={`project-status ${getStatusClass(editValues.status)}`}>
                    {getStatusDisplay(editValues.status)}
                  </span>
                  <p className="form-help-text">Approved projects cannot have their status changed.</p>
                </div>
              ) : (
                <select
                  id="project-status"
                  value={editValues.status}
                  onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                  className={`form-select ${getStatusClass(editValues.status)}`}
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                </select>
              )}
            </div>
          </div>

          <div className="edit-project-modal-actions">
            <Button
              variant="secondary"
              onClick={handleCloseEdit}
              className="edit-project-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              className="edit-project-save"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllProjectsView;
