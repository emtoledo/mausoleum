import React, { useState } from 'react';
import Button from '../../ui/Button';

const MemorialStyleForm = ({ data, onNext, onBack, isFirstStep, isLastStep }) => {
  const [selectedStyle, setSelectedStyle] = useState(data.memorialStyle || '');

  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
  };

  const handleNext = () => {
    if (selectedStyle) {
      onNext({ memorialStyle: selectedStyle });
    }
  };

  return (
    <div className="step-form">
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
        <Button 
          variant="secondary"
          onClick={onBack}
        >
          ← Back
        </Button>
        
        <Button 
          variant="primary"
          onClick={handleNext}
          disabled={!selectedStyle}
        >
          Next →
        </Button>
      </div>
    </div>
  );
};

export default MemorialStyleForm;
