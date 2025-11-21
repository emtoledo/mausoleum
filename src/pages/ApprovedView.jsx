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
import { useProjectFlow } from '../context/ProjectFlowContext';

const ApprovedView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject } = useProjectMutations();
  const { openWizard } = useProjectFlow();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadProject();
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
    navigate(`/projects/${projectId}/edit`);
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const handleCreateNewProject = () => {
    openWizard(() => {
      navigate('/projects');
    });
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

  return (
    <div className="approved-view-container">
      <div className="approved-view-content">
        <div className="approved-status-card">
          <div className="approved-icon">✓</div>
          <h1 className="approved-title">This project has been approved</h1>
          <p className="approved-subtitle">Project: {project.title}</p>
          
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
                <p className="approved-action-label">Export Design to DXF:</p>
                <Button
                  variant="secondary"
                  onClick={handleExportDXF}
                  disabled={exporting}
                  className="approved-export-btn"
                >
                  {exporting ? 'Exporting...' : 'Export DXF'}
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
              variant="primary"
              onClick={handleCreateNewProject}
              className="approved-new-btn"
            >
              Create New Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedView;

