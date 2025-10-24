import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';

const EditModeView = () => {
  const { projectId, templateId } = useParams();
  const navigate = useNavigate();
  const { getProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        
        // Find the selected template
        if (result.data.selectedTemplates) {
          const template = result.data.selectedTemplates.find(t => t.id === templateId);
          if (template) {
            setSelectedTemplate(template);
          } else {
            setError('Template not found');
          }
        } else {
          setError('No templates found for this project');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}/templates`);
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
        <div className="loading-message">Loading template...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Error: {error}</div>
        <Button onClick={handleBack}>Back to Templates</Button>
      </div>
    );
  }

  if (!project || !selectedTemplate) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Template not found</div>
        <Button onClick={handleBack}>Back to Templates</Button>
      </div>
    );
  }

  return (
    <div className="canvas-layout">
      <div className="app-header">
        <div className="header-left">
          <div className="menu-icon" onClick={() => navigate('/projects')}>
            <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
          </div>
          <div className="breadcrumb">
            <span className="breadcrumb-item clickable" onClick={handleProjectTitleClick}>
              {project.title}
            </span>
            <span className="breadcrumb-separator">
              <img src="/images/breadcrumb_icon.png" alt=">" className="breadcrumb-icon" />
            </span>
            <span className="breadcrumb-item active">
              Option {selectedTemplate.optionNumber || '1'}
            </span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="canvas-controls">
            <div className="control-group">
              <div className="control-item" onClick={() => handleCanvasControl('cloud')}>
                <img src="/images/cloud_icon.png" alt="Cloud" className="control-icon cloud" />
              </div>
              <div className="control-item" onClick={() => handleCanvasControl('undo')}>
                <img src="/images/undo_icon.png" alt="Undo" className="control-icon undo" />
              </div>
              <div className="control-item" onClick={() => handleCanvasControl('redo')}>
                <img src="/images/redo_icon.png" alt="Redo" className="control-icon redo" />
              </div>
            </div>
            
            <div className="control-group">
              <div className="control-separator">|</div>
              <div className="control-item active">
                <span className="control-text">Front</span>
              </div>
              <div className="control-separator">|</div>
            </div>
            
            <div className="control-group">
              <div className="control-item" onClick={() => handleCanvasControl('zoom-in')}>
                <img src="/images/zoom_icon.png" alt="Zoom In" className="control-icon" />
              </div>
              <div className="control-item" onClick={() => handleCanvasControl('zoom-out')}>
                <img src="/images/background_icon.png" alt="Zoom Out" className="control-icon" />
              </div>
            </div>
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

      <div className="canvas-area">
        <div className="canvas-container">
          <div className="memorial-preview">
            <img 
              src={`/images/templates/${selectedTemplate.baseImage}`}
              alt={selectedTemplate.templateName}
              className="memorial-image"
            />
            <div className="memorial-text-overlay">
              <div className="memorial-headline">{project.markerHeadline}</div>
              <div className="memorial-year">{project.year}</div>
              <div className="memorial-epitaph">{project.epitaph}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModeView;
