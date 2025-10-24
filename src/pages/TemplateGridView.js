import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import templateService from '../services/templateService';

const TemplateGridView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(projectId);
      if (result.success) {
        setProject(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, getProject]);

  const loadSelectedTemplates = useCallback(async () => {
    if (!project) return;

    try {
      console.log('TemplateGridView - Loading templates from project:', project);
      
      if (project.selectedTemplates && project.selectedTemplates.length > 0) {
        console.log('TemplateGridView - Project has selectedTemplates:', project.selectedTemplates);
        setTemplates(project.selectedTemplates);
      } else {
        console.log('TemplateGridView - No selected templates found');
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading selected templates:', error);
      setTemplates([]);
    }
  }, [project]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project) {
      loadSelectedTemplates();
    }
  }, [project, loadSelectedTemplates]);

  const handleTemplateClick = (template) => {
    console.log('TemplateGridView - Template clicked:', template);
    navigate(`/projects/${projectId}/edit/${template.id}`);
  };

  const handleBack = () => {
    navigate('/projects');
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

  const handleCanvasControl = (action) => {
    console.log('Canvas control:', action);
  };

  const handleProjectTitleClick = () => {
    navigate('/projects');
  };

  if (loading) {
    return (
      <div className="canvas-layout">
        <div className="loading-message">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Error: {error}</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Project not found</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="canvas-layout">
      <div className="app-header">
        <div className="header-left">
          <div className="menu-icon" onClick={handleBack}>
            <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
          </div>
          <div className="breadcrumb">
            <span className="breadcrumb-item clickable" onClick={handleProjectTitleClick}>
              {project.title}
            </span>
            <span className="breadcrumb-separator">
              <img src="/images/breadcrumb_icon.png" alt=">" className="breadcrumb-icon" />
            </span>
            <span className="breadcrumb-item active">All Options</span>
          </div>
        </div>
        
        <div className="header-right">
          <button className="save-button" onClick={handleSave}>Save</button>
          <button className="share-button" onClick={handleShare}>Share</button>
          <div className="more-options" onClick={handleMoreOptions}>
            <div className="more-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="template-grid-container">
        <div className="memorial-text-overlay">
          <div className="memorial-headline">{project.markerHeadline}</div>
          <div className="memorial-year">{project.year}</div>
          <div className="memorial-epitaph">{project.epitaph}</div>
        </div>
        
        <div className="template-grid">
          {templates.map((template, index) => (
            <Card 
              key={template.id || `template-${index}`}
              className="template-card" 
              onClick={() => handleTemplateClick(template)}
              hoverable
            >
              <div className="template-preview">
                <img 
                  src={templateService.getTemplateImagePath(template.baseImage)} 
                  alt={template.templateName || `Template ${index + 1}`}
                  className="template-image"
                />
              </div>
              <div className="template-info">
                <div className="template-name">
                  {template.templateName || `Option ${index + 1}`}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateGridView;
