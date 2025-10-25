import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import dataService from '../services/dataService';
import templateService from '../services/templateService';

// Import step components
import MemorialTypeForm from '../components/flows/steps/MemorialTypeForm';
import MemorialStyleForm from '../components/flows/steps/MemorialStyleForm';
import TemplateSelectionForm from '../components/flows/steps/TemplateSelectionForm';

const TemplateGridView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddOptionOverlay, setShowAddOptionOverlay] = useState(false);
  const [overlayStep, setOverlayStep] = useState('type'); // 'type', 'style', 'selection'
  const [overlayData, setOverlayData] = useState({});

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
    navigate(`/projects/${projectId}/edit/${template.templateId}`);
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

  const handleAddOptionClick = () => {
    console.log('Add option clicked');
    setShowAddOptionOverlay(true);
    setOverlayStep('type');
    setOverlayData({});
  };

  const handleOverlayCancel = () => {
    console.log('Overlay cancelled');
    setShowAddOptionOverlay(false);
    setOverlayStep('type');
    setOverlayData({});
  };

  const handleTypeFormNext = (memorialType) => {
    console.log('Type form next:', memorialType);
    setOverlayData(prev => ({ ...prev, memorialType }));
    setOverlayStep('style');
  };

  const handleStyleFormNext = (memorialStyle) => {
    console.log('Style form next:', memorialStyle);
    console.log('Current overlay data:', overlayData);
    setOverlayData(prev => ({ ...prev, memorialStyle }));
    setOverlayStep('selection');
  };

  const handleTemplateSelectionDone = async (templateData) => {
    console.log('Template selection done:', templateData);
    
    try {
      if (templateData.selectedTemplates && templateData.selectedTemplates.length > 0) {
        // Convert selected templates to the format expected by the project
        const newTemplates = templateData.selectedTemplates.map(template => ({
          templateId: template.id,
          templateName: template.name,
          baseImage: template.baseImage,
          previewImage: template.previewImage,
          text: template.text,
          type: template.type,
          style: template.style,
          category: template.category || template.type,
          selected: false,
          configured: false,
          customizations: {
            text: template.text,
            colors: {},
            fonts: {},
            layout: {}
          }
        }));

        // Add new templates to the existing project templates
        const updatedTemplates = [...project.templates, ...newTemplates];
        
        // Update the project with new templates
        await dataService.updateProjectTemplates(projectId, updatedTemplates);
        
        // Refresh the templates display
        setTemplates(updatedTemplates);
        
        console.log('Templates added successfully:', newTemplates);
      }
    } catch (error) {
      console.error('Error adding templates to project:', error);
    } finally {
      // Close the overlay
      setShowAddOptionOverlay(false);
      setOverlayStep('type');
      setOverlayData({});
    }
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
              key={template.templateId || `template-${index}`}
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

          {/* Add Option Card */}
          <div className="memorial-option" onClick={handleAddOptionClick}>
            <div className="add-option-card">
              <div className="add-icon">+</div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Option Overlay */}
      {showAddOptionOverlay && (
        <div className="add-option-overlay">
          <div className="overlay-content">
            <div className="overlay-header">
              <h2>Add New Memorial Option</h2>
              <button className="close-button" onClick={handleOverlayCancel}>×</button>
            </div>
            <div className="overlay-body">
              {overlayStep === 'type' && (
                <MemorialTypeForm
                  data={overlayData}
                  onNext={handleTypeFormNext}
                  onBack={handleOverlayCancel}
                  isFirstStep={true}
                  isLastStep={false}
                />
              )}
              {overlayStep === 'style' && (
                <MemorialStyleForm
                  data={overlayData}
                  onNext={handleStyleFormNext}
                  onBack={() => setOverlayStep('type')}
                  isFirstStep={false}
                  isLastStep={false}
                />
              )}
              {overlayStep === 'selection' && (
                <TemplateSelectionForm
                  data={overlayData}
                  onNext={handleTemplateSelectionDone}
                  onBack={() => setOverlayStep('style')}
                  isFirstStep={false}
                  isLastStep={true}
                  isCreating={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGridView;
