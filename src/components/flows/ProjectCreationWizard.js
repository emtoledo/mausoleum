import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useProjectFlow } from '../../context/ProjectFlowContext';
import { useProjectMutations } from '../../hooks/useProjectMutations';

// Import step components
import NewMemorialForm from './steps/NewMemorialForm';
import TemplateSelectionForm from './steps/TemplateSelectionForm';

const ProjectCreationWizard = () => {
  const navigate = useNavigate();
  const { isWizardOpen, closeWizard } = useProjectFlow();
  const { createProject } = useProjectMutations();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  const steps = [
    { component: NewMemorialForm, title: 'New Project' },
    { component: TemplateSelectionForm, title: 'Template Selection' }
  ];

  const handleNext = (stepData) => {
    console.log('ProjectCreationWizard - handleNext called with stepData:', stepData);
    console.log('ProjectCreationWizard - Current wizardData before merge:', wizardData);
    
    const newWizardData = { ...wizardData, ...stepData };
    console.log('ProjectCreationWizard - New wizardData after merge:', newWizardData);
    
    setWizardData(newWizardData);
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Wizard complete - pass the merged data directly
      handleComplete(newWizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    setCurrentStep(1);
    setWizardData({});
    closeWizard();
  };

  const handleComplete = async (finalWizardData = wizardData) => {
    console.log('ProjectCreationWizard - Wizard completed with data:', finalWizardData);
    
    setIsCreating(true);
    
    try {
      // Prepare project data for creation
      const selectedTemplate = finalWizardData.selectedTemplate;
      
      if (!selectedTemplate) {
        alert('No template selected. Please select a template.');
        setIsCreating(false);
        return;
      }

      const projectData = {
        title: finalWizardData.projectName,
        selectedTemplate: selectedTemplate, // Pass the full template object
        selectedTemplateId: finalWizardData.selectedTemplateId
      };

      console.log('ProjectCreationWizard - Creating project with data:', projectData);
      
      // Create the project
      const result = await createProject(projectData);
      
      if (result.success) {
        console.log('ProjectCreationWizard - Project created successfully:', result.data);
        
        // Reset wizard state
        setCurrentStep(1);
        setWizardData({});
        closeWizard();
        
        // Navigate directly to DesignStudio (no templateId needed since each project has one template)
        navigate(`/projects/${result.data.id}/edit`);
      } else {
        console.error('Failed to create project:', result.error);
        // Show the actual error message from the service
        const errorMessage = result.error || 'Failed to create project. Please try again.';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('An error occurred while creating the project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1]?.component;
  
  // Determine modal size class based on step
  const getModalClassName = () => {
    const baseClass = 'project-creation-wizard';
    if (currentStep === 1) {
      return `${baseClass} wizard-step-new-memorial`;
    } else if (currentStep === 2) {
      return `${baseClass} wizard-step-template-selection`;
    }
    return baseClass;
  };

  return (
    <Modal 
      isOpen={isWizardOpen} 
      onClose={handleCancel}
      title={`Step ${currentStep}: ${steps[currentStep - 1]?.title}`}
      className={getModalClassName()}
    >
      {CurrentStepComponent && (
        <CurrentStepComponent
          data={wizardData}
          onNext={handleNext}
          onBack={handleBack}
          onCancel={handleCancel}
          isFirstStep={currentStep === 1}
          isLastStep={currentStep === steps.length}
          isCreating={isCreating}
        />
      )}
    </Modal>
  );
};

export default ProjectCreationWizard;
