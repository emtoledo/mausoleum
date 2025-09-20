import React, { useState } from 'react';
import dataService from '../services/dataService';
import TemplateSelectionForm from './TemplateSelectionForm';

const MemorialStyleForm = ({ project, onBack, onNext, isOverlay = false }) => {
  const [selectedStyle, setSelectedStyle] = useState('');
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [updatedProject, setUpdatedProject] = useState(null);

  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
  };

  const handleNext = async () => {
    if (selectedStyle) {
      try {
        // Update the project with memorial style
        const updatedProject = await dataService.updateProject(project.id, {
          memorialStyle: selectedStyle
        });

        console.log('Memorial style saved:', updatedProject);
        
        if (isOverlay) {
          // When in overlay mode, call onNext directly instead of showing template selection
          console.log('MemorialStyleForm - Overlay mode, calling onNext directly');
          onNext(selectedStyle);
        } else {
          // When in normal mode, show template selection
          setUpdatedProject(updatedProject);
          setShowTemplateSelection(true);
        }
      } catch (error) {
        console.error('Error saving memorial style:', error);
        alert('Error saving memorial style. Please try again.');
      }
    }
  };

  const handleBack = () => {
    onBack();
  };

  const handleBackToStyle = () => {
    setShowTemplateSelection(false);
  };

  const handleTemplateSelectionNext = (updatedProject) => {
    console.log('Template selection completed:', updatedProject);
    onNext(updatedProject);
  };

  if (showTemplateSelection && updatedProject && !isOverlay) {
    return (
      <TemplateSelectionForm
        project={updatedProject}
        onBack={handleBackToStyle}
        onNext={handleTemplateSelectionNext}
        isOverlay={isOverlay}
      />
    );
  }

  return (
    <div className="modal-overlay">
    <div className="memorial-style-form">
      <div className="form-title">Choose Style</div>
      
      <div className="style-selection-container">
        <button 
          className={`selection-button ${selectedStyle === 'traditional' ? 'selected' : ''}`}
          onClick={() => handleStyleSelect('traditional')}
        >
          <div className="selection-icon">
            <img src="/images/traditional_icon.png" alt="Traditional Style" className="selection-icon-image" />
          </div>
          <div className="selection-text">Traditional</div>
        </button>
        
        <button 
          className={`selection-button ${selectedStyle === 'custom' ? 'selected' : ''}`}
          onClick={() => handleStyleSelect('custom')}
        >
          <div className="selection-icon">
            <img src="/images/custom_icon.png" alt="Custom Style" className="selection-icon-image" />
          </div>
          <div className="selection-text">Custom</div>
        </button>
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
          className="next-button"
          onClick={handleNext}
          disabled={!selectedStyle}
        >
          Next <img src="/images/rightarrow_icon.png" alt="Next" className="arrow-icon" />
        </button>
      </div>
    </div>
    </div>
  );
};

export default MemorialStyleForm;
