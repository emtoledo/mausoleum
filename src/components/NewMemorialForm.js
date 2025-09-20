import React, { useState } from 'react';
import dataService from '../services/dataService';
import MemorialDetailsForm from './MemorialDetailsForm';

const NewMemorialForm = ({ onCancel, onNext }) => {
  const [customerName, setCustomerName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [savedProject, setSavedProject] = useState(null);
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCustomerName(value);
    setIsValid(value.trim().length > 0);
  };

  const handleNext = async () => {
    if (isValid) {
      try {
        // Save the project to local database
        const project = await dataService.saveProject({
          title: customerName.trim()
        });
        
        console.log('Project created successfully:', project);
        setSavedProject(project);
        setShowDetailsForm(true);
      } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving project. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleBackToCustomer = () => {
    setShowDetailsForm(false);
  };

  const handleMemorialDetailsNext = (updatedProject) => {
    console.log('Memorial details completed:', updatedProject);
    onNext(updatedProject);
  };

  if (showDetailsForm && savedProject) {
    return (
      <MemorialDetailsForm
        project={savedProject}
        onBack={handleBackToCustomer}
        onNext={handleMemorialDetailsNext}
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="new-memorial-form">
        <div className="form-title">New Memorial</div>
        
        <div className="form-group">
          <input
            type="text"
            value={customerName}
            onChange={handleInputChange}
            placeholder="Customer Name"
            className="customer-name-input"
            autoFocus
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={handleCancel}
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            className="next-button"
            onClick={handleNext}
            disabled={!isValid}
          >
            Next <img src="/images/rightarrow_icon.png" alt="Next" className="arrow-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewMemorialForm;
