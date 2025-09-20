import React, { useState } from 'react';
import dataService from '../services/dataService';
import MemorialStyleForm from './MemorialStyleForm';

const MemorialTypeForm = ({ project, onBack, onNext, isOverlay = false }) => {
  const [selectedType, setSelectedType] = useState('');
  const [showStyleForm, setShowStyleForm] = useState(false);
  const [updatedProject, setUpdatedProject] = useState(null);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };

  const handleNext = async () => {
    if (selectedType) {
      try {
        // Update the project with memorial type
        const updatedProject = await dataService.updateProject(project.id, {
          memorialType: selectedType
        });
        
        console.log('Memorial type saved:', updatedProject);
        
        if (isOverlay) {
          // When in overlay mode, call onNext directly instead of showing style form
          console.log('MemorialTypeForm - Overlay mode, calling onNext directly');
          onNext(selectedType);
        } else {
          // When in normal mode, show style form
          setUpdatedProject(updatedProject);
          setShowStyleForm(true);
        }
      } catch (error) {
        console.error('Error saving memorial type:', error);
        alert('Error saving memorial type. Please try again.');
      }
    }
  };

  const handleBack = () => {
    onBack();
  };

  const handleBackToType = () => {
    setShowStyleForm(false);
  };

  const handleStyleFormNext = (updatedProject) => {
    console.log('Memorial style completed:', updatedProject);
    onNext(updatedProject);
  };

  if (showStyleForm && updatedProject && !isOverlay) {
    return (
      <MemorialStyleForm
        project={updatedProject}
        onBack={handleBackToType}
        onNext={handleStyleFormNext}
        isOverlay={isOverlay}
      />
    );
  }

  return (
    <div className="modal-overlay">
    <div className="memorial-type-form">
      <div className="form-title">Choose Type</div>
      
      <div className="type-selection-container">
        <button 
          className={`type-selection-button ${selectedType === 'upright' ? 'selected' : ''}`}
          onClick={() => handleTypeSelect('upright')}
        >
          <div className="type-icon">
            <img src="/images/upright_icon.png" alt="Upright Memorial" className="type-icon-image" />
          </div>
          <div className="type-text">Upright Memorial</div>
        </button>
        
        <button 
          className={`type-selection-button ${selectedType === 'flat' ? 'selected' : ''}`}
          onClick={() => handleTypeSelect('flat')}
        >
          <div className="type-icon">
            <img src="/images/flat_icon.png" alt="Flat Memorial" className="type-icon-image" />
          </div>
          <div className="type-text">Flat Memorial</div>
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
          disabled={!selectedType}
        >
          Next <img src="/images/rightarrow_icon.png" alt="Next" className="arrow-icon" />
        </button>
      </div>
    </div>
    </div>
  );
};

export default MemorialTypeForm;
