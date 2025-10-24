import React, { useState } from 'react';
import Button from '../../ui/Button';

const MemorialTypeForm = ({ data, onNext, onBack, isFirstStep, isLastStep }) => {
  const [selectedType, setSelectedType] = useState(data.memorialType || '');

  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };

  const handleNext = () => {
    if (selectedType) {
      onNext({ memorialType: selectedType });
    }
  };

  return (
    <div className="step-form">
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
        <Button 
          variant="secondary"
          onClick={onBack}
        >
          ← Back
        </Button>
        
        <Button 
          variant="primary"
          onClick={handleNext}
          disabled={!selectedType}
        >
          Next →
        </Button>
      </div>
    </div>
  );
};

export default MemorialTypeForm;
