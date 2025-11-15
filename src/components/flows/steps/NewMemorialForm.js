import React, { useState } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const NewMemorialForm = ({ data, onNext, onCancel, isFirstStep, isLastStep }) => {
  const [projectName, setProjectName] = useState(data.projectName || '');
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setProjectName(value);
    setIsValid(value.trim().length > 0);
  };

  const handleNext = () => {
    if (isValid) {
      onNext({ projectName: projectName.trim() });
    }
  };

  return (
    <div className="step-form">
      <div className="form-title">New Project</div>
      
      <div className="form-group">
        <Input
          type="text"
          value={projectName}
          onChange={handleInputChange}
          placeholder="Project Name"
          label="Project Name"
          required
          autoFocus
        />
      </div>
      
      <div className="form-actions">
        <Button 
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
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

export default NewMemorialForm;
