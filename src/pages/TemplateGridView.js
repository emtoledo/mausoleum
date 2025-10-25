import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import dataService from '../services/dataService';
import templateService from '../services/templateService';

const TemplateGridView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const project = dataService.getProjectById(projectId);
      
      if (project) {
        setProject(project);
      } else {
        setError('Project not found');
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadSelectedTemplates = useCallback(async () => {
    if (!project) return;

    try {
      if (project.selectedTemplates && project.selectedTemplates.length > 0) {
        setTemplates(project.selectedTemplates);
      } else if (project.templates && project.templates.length > 0) {
        // Filter templates that are selected
        const selectedTemplates = project.templates.filter(template => template.selected);
        
        if (selectedTemplates.length > 0) {
          setTemplates(selectedTemplates);
        } else {
          // Show all templates if none are selected
          setTemplates(project.templates);
        }
      } else {
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

  console.log('TemplateGridView - Render state:', { loading, error, project, templates, projectId });

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

      <div className="memorial-grid-container">        
        <div className="memorial-grid">
          {templates.map((template, index) => (
            <Card 
              key={template.id || `template-${index}`}
              className="memorial-option" 
              onClick={() => handleTemplateClick(template)}
              hoverable
            >
              <div className="memorial-card">

                <div className="memorial-image-container">
                  <img 
                    src={templateService.getTemplateImagePath(template.baseImage)} 
                    alt={template.templateName || `Template ${index + 1}`}
                    className="memorial-base-image"
                  />
                  <div className="memorial-text-overlay">
                    <div className="marker-headline">{project.markerHeadline}</div>
                    <div className="marker-year">{project.year}</div>
                    <div className="marker-epitaph">{project.epitaph}</div>
                  </div>
                </div>

                <div className="option-label">OPTION {index + 1}</div>

              </div>

            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateGridView;
