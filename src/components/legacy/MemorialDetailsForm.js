import React, { useState } from 'react';
import dataService from '../services/dataService';
import MemorialTypeForm from './MemorialTypeForm';

const MemorialDetailsForm = ({ project, onBack, onNext }) => {
  const [formData, setFormData] = useState({
    markerHeadline: '',
    year: '',
    epitaph: ''
  });
  const [isValid, setIsValid] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [updatedProject, setUpdatedProject] = useState(null);

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

  const handleNext = async () => {
    if (isValid) {
      try {
        // Update the project with memorial details
        const updatedProject = await dataService.updateProject(project.id, {
          markerHeadline: formData.markerHeadline.trim(),
          year: formData.year.trim(),
          epitaph: formData.epitaph.trim()
        });
        
        console.log('Memorial details saved:', updatedProject);
        setUpdatedProject(updatedProject);
        setShowTypeForm(true);
      } catch (error) {
        console.error('Error saving memorial details:', error);
        alert('Error saving memorial details. Please try again.');
      }
    }
  };

  const handleBack = () => {
    onBack();
  };

  const handleBackToDetails = () => {
    setShowTypeForm(false);
  };

  const handleTypeFormNext = (updatedProject) => {
    console.log('Memorial type completed:', updatedProject);
    onNext(updatedProject);
  };

  if (showTypeForm && updatedProject) {
    return (
      <MemorialTypeForm
        project={updatedProject}
        onBack={handleBackToDetails}
        onNext={handleTypeFormNext}
      />
    );
  }

  return (
    <div className="modal-overlay">
        <div className="memorial-details-form">
        <div className="form-title">New Memorial</div>
        
        <div className="form-group">
            <input
            type="text"
            name="markerHeadline"
            value={formData.markerHeadline}
            onChange={handleInputChange}
            placeholder="Marker Headline"
            className="memorial-input"
            autoFocus
            />
        </div>
        
        <div className="form-group">
            <input
            type="text"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            placeholder="Year"
            className="memorial-input"
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
            disabled={!isValid}
            >
            Next <img src="/images/rightarrow_icon.png" alt="Next" className="arrow-icon" />
            </button>
        </div>
        </div>
    </div>
  );
};

export default MemorialDetailsForm;
