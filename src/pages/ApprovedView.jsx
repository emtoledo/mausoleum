/**
 * ApprovedView Component
 * 
 * Displays confirmation that project has been approved,
 * provides link to download PDF, and DXF export button.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectMutations } from '../hooks/useProjectMutations';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { buildLocationPath } from '../utils/navigation';

const ApprovedView = () => {
  const { projectId, locationSlug } = useParams();
  const navigate = useNavigate();
  const { getProject, deleteProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false });

  useEffect(() => {
    loadProject();
    
    // Enable scrolling on body when on approved view page
    document.body.style.overflow = 'auto';
    
    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = 'hidden';
    };
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(projectId);
      if (result.success) {
        setProject(result.data);
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (project?.approvalPdfUrl) {
      // Open PDF in new tab or download
      const link = document.createElement('a');
      link.href = project.approvalPdfUrl;
      link.target = '_blank';
      link.download = `approval-proof-${projectId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('PDF not available. Please contact support.');
    }
  };

  const handleExportDXF = async () => {
    // Navigate to edit view where DXF export is available
    const editPath = buildLocationPath(`/projects/${projectId}/edit`, locationSlug);
    navigate(editPath);
  };

  const handleBackToProjects = () => {
    const projectsPath = buildLocationPath('/projects', locationSlug);
    navigate(projectsPath);
  };

  const handleDeleteProject = () => {
    setDeleteConfirm({ isOpen: true });
  };

  const handleConfirmDelete = async () => {
    if (!projectId) return;

    try {
      setDeleting(true);
      const result = await deleteProject(projectId);
      if (result.success) {
        // Navigate back to projects list after successful deletion
        const projectsPath = buildLocationPath('/projects', locationSlug);
        navigate(projectsPath);
      } else {
        alert('Error deleting project. Please try again.');
        setDeleteConfirm({ isOpen: false });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
      setDeleteConfirm({ isOpen: false });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false });
  };

  if (loading) {
    return (
      <div className="approved-view-container">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="approved-view-container">
        <div className="error-message">Error: {error || 'Project not found'}</div>
        <Button onClick={handleBackToProjects}>Back to Projects</Button>
      </div>
    );
  }

  // Get preview image URL (prioritize saved preview, fallback to template preview)
  const getPreviewImage = () => {
    if (project.previewImageUrl) {
      return project.previewImageUrl;
    }
    if (project.template?.previewImage) {
      return project.template.previewImage;
    }
    if (project.template?.baseImage) {
      return project.template.baseImage;
    }
    // Legacy support
    if (project.templates && project.templates.length > 0) {
      return project.templates[0].previewImage || project.templates[0].baseImage;
    }
    return null;
  };

  const previewImageUrl = getPreviewImage();

  return (
    <div className="approved-view-container">
      <div className="approved-view-content">
        <div className="approved-status-card">
          
          {previewImageUrl && (
            <div className="approved-preview-image-container">
              <img 
                src={previewImageUrl} 
                alt={`${project.title} preview`}
                className="approved-preview-image"
              />
              <div className="approved-icon">✓</div>
            </div>
          )}
          
          <h1 className="approved-title">Project approved!</h1>
          <p className="approved-subtitle">Project {project.title} has been approved and can no longer be edited.</p>
          
          {project.approvalPdfUrl && (
            <div className="approved-actions">
              <div className="approved-action-item">
                <p className="approved-action-label">Download Approval Proof:</p>
                <Button
                  variant="primary"
                  onClick={handleDownloadPDF}
                  className="approved-download-btn"
                >
                  Download PDF
                </Button>
              </div>
              
              <div className="approved-action-item">
                <p className="approved-action-label">Export Design to DXF (coming soon):</p>
                <Button
                  variant="secondary"
                  onClick={handleExportDXF}
                  disabled={true}
                  className="approved-export-btn"
                >
                  Export DXF
                </Button>
              </div>
            </div>
          )}

          <div className="approved-navigation">
            <Button
              variant="secondary"
              onClick={handleBackToProjects}
              className="approved-back-btn"
            >
              Back to Projects
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
              disabled={deleting}
              className="button--primary alert"
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete project "${project?.title || ''}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default ApprovedView;

