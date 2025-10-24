import React, { useState } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const NewMemorialForm = ({ data, onNext, onCancel, isFirstStep, isLastStep }) => {
  const [customerName, setCustomerName] = useState(data.customerName || '');
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCustomerName(value);
    setIsValid(value.trim().length > 0);
  };

  const handleNext = () => {
    if (isValid) {
      onNext({ customerName: customerName.trim() });
    }
  };

  return (
    <div className="step-form">
      <div className="form-title">New Memorial</div>
      
      <div className="form-group">
        <Input
          type="text"
          value={customerName}
          onChange={handleInputChange}
          placeholder="Customer Name"
          label="Customer Name"
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
