import React, { useState, useEffect } from 'react';
import templateService from '../services/templateService';
import TemplateGridView from './TemplateGridView';
import dataService from '../services/dataService';

const TemplateSelectionForm = ({ project, onBack, onNext, isOverlay = false }) => {
  console.log('TemplateSelectionForm - Component initialized with isOverlay:', isOverlay);
  
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGridView, setShowGridView] = useState(false);

  useEffect(() => {
    console.log('TemplateSelectionForm mounted with project:', project);
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      console.log('Loading templates for project:', project);
      console.log('Project keys:', Object.keys(project));
      console.log('Memorial type:', project.memorialType, 'Type:', typeof project.memorialType);
      console.log('Memorial style:', project.memorialStyle, 'Type:', typeof project.memorialStyle);
      
      // Validate that we have the required project data
      if (!project.memorialType || !project.memorialStyle) {
        console.error('Missing project data:', {
          memorialType: project.memorialType,
          memorialStyle: project.memorialStyle
        });
        setAvailableTemplates([]);
        return;
      }

      const templates = await templateService.getTemplatesForMemorial(
        project.memorialType, 
        project.memorialStyle
      );
      
      console.log('Available templates:', templates);
      
      // Only set templates if we have valid filtering results
      if (templates && templates.length > 0) {
        setAvailableTemplates(templates);
      } else {
        console.log('No templates found for the specified type and style');
        setAvailableTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debug effect to log when availableTemplates changes
  useEffect(() => {
    console.log('Available templates updated:', availableTemplates);
    console.log('Number of templates to render:', availableTemplates.length);
  }, [availableTemplates]);

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  const handleDone = async () => {
    console.log('TemplateSelectionForm - Done button clicked');
    console.log('TemplateSelectionForm - selectedTemplates:', selectedTemplates);
    console.log('TemplateSelectionForm - showGridView before:', showGridView);
    console.log('TemplateSelectionForm - isOverlay:', isOverlay);
    
    if (selectedTemplates.length === 0) {
      alert('Please select at least one template.');
      return;
    }

    try {
      // Get the selected template objects
      const selectedTemplateObjects = availableTemplates.filter(template => 
        selectedTemplates.includes(template.id)
      );

      console.log('TemplateSelectionForm - selectedTemplateObjects:', selectedTemplateObjects);

      if (isOverlay) {
        // When used in overlay, call onNext with the selected templates (no database update here)
        console.log('TemplateSelectionForm - Overlay mode, calling onNext with templates:', selectedTemplateObjects);
        console.log('TemplateSelectionForm - NOT setting showGridView in overlay mode');
        onNext(selectedTemplateObjects);
        return; // Exit early to prevent any further execution
      } else {
        // When used in normal flow, update database and show grid view
        console.log('TemplateSelectionForm - Normal mode, updating database');
        
        // Update the project with selected templates
        const updatedProject = await dataService.updateProject(project.id, {
          selectedTemplates: selectedTemplateObjects.map(template => ({
            templateId: template.id,
            templateName: template.name,
            baseImage: template.baseImage,
            previewImage: template.previewImage,
            text: template.text,
            type: template.type,
            style: template.style,
            selected: true,
            configured: false,
            customizations: {
              text: template.text,
              colors: {},
              fonts: {},
              layout: {}
            }
          }))
        });

        console.log('Templates selected:', updatedProject);
        console.log('TemplateSelectionForm - Normal mode, setting showGridView to true');
        setShowGridView(true);
      }
    } catch (error) {
      console.error('Error saving selected templates:', error);
      alert('Error saving template selection. Please try again.');
    }
  };

  const handleBack = () => {
    onBack();
  };

  const handleBackToSelection = () => {
    console.log('TemplateSelectionForm - Going back to selection');
    setShowGridView(false);
  };

  // Show grid view if templates are selected (only in normal mode, not overlay)
  console.log('TemplateSelectionForm - showGridView state:', showGridView);
  console.log('TemplateSelectionForm - isOverlay:', isOverlay);
  console.log('TemplateSelectionForm - Condition check: showGridView && !isOverlay =', showGridView && !isOverlay);
  
  if (showGridView && !isOverlay) {
    console.log('TemplateSelectionForm - Rendering TemplateGridView');
    return (
      <TemplateGridView
        key="template-grid-view"
        project={project}
        selectedTemplateIds={selectedTemplates}
        onBack={handleBackToSelection}
      />
    );
  }
  
  if (showGridView && isOverlay) {
    console.error('TemplateSelectionForm - ERROR: showGridView is true but isOverlay is also true! This should not happen.');
  }

  if (loading) {
    const loadingContent = (
      <div className="template-selection-form">
        <div className="form-title">Select Memorial</div>
        <div className="loading-message">Loading templates...</div>
      </div>
    );
    
    return isOverlay ? loadingContent : (
      <div className="modal-overlay">
        {loadingContent}
      </div>
    );
  }

  const formContent = (
    <div className="template-selection-form">
      <div className="form-title">Select Memorial</div>
      
      
      <div className="template-grid-container">
        <div className="template-grid">
          {availableTemplates.map((template) => {
            console.log('Rendering template:', template);
            return (
              <div 
                key={template.id} 
                className={`template-item ${selectedTemplates.includes(template.id) ? 'selected' : ''}`}
                onClick={() => handleTemplateToggle(template.id)}
              >

                <div className="template-preview">
                  <img 
                    src={templateService.getPreviewImagePath(template.previewImage)} 
                    alt={template.name}
                    className="template-preview-image"
                    onError={(e) => console.error('Image load error for', template.previewImage, e)}
                    onLoad={() => console.log('Image loaded successfully:', template.previewImage)}
                  />
                </div>
                <div className="template-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(template.id)}
                    onChange={() => handleTemplateToggle(template.id)}
                    className="template-checkbox-input"
                  />
                </div>

              </div>
            );
          })}
        </div>
      </div>
      
      <div className="form-actions">
        <button 
          type="button" 
          className="back-button"
          onClick={handleBack}
        >
          <img src="/images/leftarrow_icon.png" alt="Back" className="back-icon" />
        </button>

        <button 
          type="button" 
          className="done-button"
          onClick={handleDone}
          disabled={selectedTemplates.length === 0}
        >
          Done
        </button>
      </div>
    </div>
  );

  return isOverlay ? formContent : (
    <div className="modal-overlay">
      {formContent}
    </div>
  );
};

export default TemplateSelectionForm;
