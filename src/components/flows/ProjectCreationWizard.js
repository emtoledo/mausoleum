import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useProjectFlow } from '../../context/ProjectFlowContext';
import { useProjectMutations } from '../../hooks/useProjectMutations';

// Import step components
import NewMemorialForm from './steps/NewMemorialForm';
import MemorialDetailsForm from './steps/MemorialDetailsForm';
import MemorialTypeForm from './steps/MemorialTypeForm';
import MemorialStyleForm from './steps/MemorialStyleForm';
import TemplateSelectionForm from './steps/TemplateSelectionForm';

const ProjectCreationWizard = () => {
  const navigate = useNavigate();
  const { isWizardOpen, closeWizard } = useProjectFlow();
  const { createProject } = useProjectMutations();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  const steps = [
    { component: NewMemorialForm, title: 'New Memorial' },
    { component: MemorialDetailsForm, title: 'Memorial Details' },
    { component: MemorialTypeForm, title: 'Memorial Type' },
    { component: MemorialStyleForm, title: 'Memorial Style' },
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
      const projectData = {
        title: finalWizardData.customerName,
        markerHeadline: finalWizardData.markerHeadline,
        year: finalWizardData.year,
        epitaph: finalWizardData.epitaph,
        memorialType: finalWizardData.memorialType,
        memorialStyle: finalWizardData.memorialStyle,
        selectedTemplates: finalWizardData.selectedTemplates || [] // Pass selected templates
      };

      console.log('ProjectCreationWizard - Creating project with data:', projectData);
      console.log('ProjectCreationWizard - selectedTemplates:', projectData.selectedTemplates);
      
      // Create the project
      const result = await createProject(projectData);
      
      if (result.success) {
        console.log('ProjectCreationWizard - Project created successfully:', result.data);
        
        // Reset wizard state
        setCurrentStep(1);
        setWizardData({});
        closeWizard();
        
        // Navigate to the template grid for the new project
        navigate(`/projects/${result.data.id}/templates`);
      } else {
        console.error('Failed to create project:', result.error);
        alert('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('An error occurred while creating the project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1]?.component;

  return (
    <Modal 
      isOpen={isWizardOpen} 
      onClose={handleCancel}
      title={`Step ${currentStep}: ${steps[currentStep - 1]?.title}`}
      className="project-creation-wizard"
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
