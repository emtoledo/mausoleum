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
        if (result.data.templates) {
          const template = result.data.templates.find(t => t.templateId === templateId);
          if (template) {
            setSelectedTemplate(template);
          } else {
            console.log('Template not found. Available templates:', result.data.templates);
            console.log('Looking for templateId:', templateId);
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
