import React, { useState } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const MemorialDetailsForm = ({ data, onNext, onBack, isFirstStep, isLastStep }) => {
  const [formData, setFormData] = useState({
    markerHeadline: data.markerHeadline || '',
    year: data.year || '',
    epitaph: data.epitaph || ''
  });
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check if all required fields are filled
    const updatedData = { ...formData, [name]: value };
    const allFieldsFilled = updatedData.markerHeadline.trim() && 
                           updatedData.year.trim() && 
                           updatedData.epitaph.trim();
    setIsValid(allFieldsFilled);
  };

  const handleNext = () => {
    if (isValid) {
      onNext(formData);
    }
  };

  return (
    <div className="step-form">
      <div className="form-title">Memorial Details</div>
      
      <div className="form-group">
        <Input
          type="text"
          name="markerHeadline"
          value={formData.markerHeadline}
          onChange={handleInputChange}
          placeholder="Marker Headline"
          label="Marker Headline"
          required
          autoFocus
        />
      </div>
      
      <div className="form-group">
        <Input
          type="text"
          name="year"
          value={formData.year}
          onChange={handleInputChange}
          placeholder="Year"
          label="Year"
          required
        />
      </div>
      
      <div className="form-group">
        <textarea
          name="epitaph"
          value={formData.epitaph}
          onChange={handleInputChange}
          placeholder="Epitaph"
          className="memorial-textarea"
          rows="4"
        />
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
          disabled={!isValid}
        >
          Next →
        </Button>
      </div>
    </div>
  );
};

export default MemorialDetailsForm;
