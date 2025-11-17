import React, { useState } from 'react';
import { templates } from '../../../data/TemplateData';
import Button from '../../ui/Button';

const TemplateSelectionForm = ({ data, onNext, onBack, isFirstStep, isLastStep, isCreating }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(data.selectedTemplateId || null);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
  };

  const handleNext = () => {
    if (!selectedTemplateId) {
      alert('Please select a template.');
      return;
    }

    // Get the selected template object
    const selectedTemplate = templates[selectedTemplateId];
    
    if (!selectedTemplate) {
      alert('Selected template not found.');
      return;
    }

    console.log('TemplateSelectionForm - Selected template:', selectedTemplate);

    onNext({ selectedTemplate, selectedTemplateId });
  };

  // Convert templates object to array
  const templatesArray = Object.values(templates);

  return (
    <div className="step-form">
      <div className="form-title">Select Template</div>
      
      <div className="template-grid-container">
        <div className="template-grid">
          {templatesArray.map((template) => (
            <div 
              key={template.id} 
              className={`template-item ${selectedTemplateId === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <div className="template-preview">
                <img 
                  src={template.previewImage} 
                  alt={template.name}
                  className="template-preview-image"
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
          disabled={!selectedTemplateId || isCreating}
        >
          {isCreating ? 'Creating Project...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default TemplateSelectionForm;
