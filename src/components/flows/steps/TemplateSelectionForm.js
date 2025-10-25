import React, { useState, useEffect } from 'react';
import templateService from '../../../services/templateService';
import Button from '../../ui/Button';

const TemplateSelectionForm = ({ data, onNext, onBack, isFirstStep, isLastStep, isCreating }) => {
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState(data.selectedTemplates || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('TemplateSelectionForm - useEffect triggered with data:', data);
    loadTemplates();
  }, [data.memorialType, data.memorialStyle]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      console.log('TemplateSelectionForm - Loading templates with data:', data);
      
      // Validate that we have the required data
      if (!data.memorialType || !data.memorialStyle) {
        console.error('Missing memorial type or style:', {
          memorialType: data.memorialType,
          memorialStyle: data.memorialStyle
        });
        setAvailableTemplates([]);
        return;
      }

      console.log('Calling getTemplatesForMemorial with:', data.memorialType, data.memorialStyle);
      const templates = await templateService.getTemplatesForMemorial(
        data.memorialType, 
        data.memorialStyle
      );
      
      console.log('Available templates returned:', templates);
      
      if (templates && templates.length > 0) {
        setAvailableTemplates(templates);
      } else {
        console.log('No templates found for the specified type and style, loading all templates as fallback');
        // Fallback: load all available templates
        const allTemplates = await templateService.getAllTemplates();
        setAvailableTemplates(allTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  const handleNext = () => {
    if (selectedTemplates.length === 0) {
      alert('Please select at least one template.');
      return;
    }

    // Get the selected template objects
    const selectedTemplateObjects = availableTemplates.filter(template => 
      selectedTemplates.includes(template.id)
    );

    console.log('TemplateSelectionForm - Selected template IDs:', selectedTemplates);
    console.log('TemplateSelectionForm - Selected template objects:', selectedTemplateObjects);
    console.log('TemplateSelectionForm - Available templates:', availableTemplates);

    onNext({ selectedTemplates: selectedTemplateObjects });
  };

  if (loading) {
    return (
      <div className="step-form">
        <div className="form-title">Select Memorial</div>
        <div className="loading-message">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="step-form">
      <div className="form-title">Select Memorial</div>
      
      <div className="template-grid-container">
        <div className="template-grid">
          {availableTemplates.map((template) => (
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
          ))}
        </div>
      </div>
      
      <div className="form-actions">
        <Button 
          variant="secondary"
          onClick={onBack}
        >
          ← Back
        </Button>
        
        <Button 
          variant="primary"
          onClick={handleNext}
          disabled={selectedTemplates.length === 0 || isCreating}
        >
          {isCreating ? 'Creating Project...' : 'Complete'}
        </Button>
      </div>
    </div>
  );
};

export default TemplateSelectionForm;
