import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useProjectFlow } from '../../context/ProjectFlowContext';

// Import step components
import NewMemorialForm from './steps/NewMemorialForm';
import MemorialDetailsForm from './steps/MemorialDetailsForm';
import MemorialTypeForm from './steps/MemorialTypeForm';
import MemorialStyleForm from './steps/MemorialStyleForm';
import TemplateSelectionForm from './steps/TemplateSelectionForm';

const ProjectCreationWizard = () => {
  const { isWizardOpen, closeWizard } = useProjectFlow();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});

  const steps = [
    { component: NewMemorialForm, title: 'New Memorial' },
    { component: MemorialDetailsForm, title: 'Memorial Details' },
    { component: MemorialTypeForm, title: 'Memorial Type' },
    { component: MemorialStyleForm, title: 'Memorial Style' },
    { component: TemplateSelectionForm, title: 'Template Selection' }
  ];

  const handleNext = (stepData) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Wizard complete
      handleComplete();
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

  const handleComplete = () => {
    console.log('Wizard completed with data:', wizardData);
    // Here you would save the project and navigate to the template grid
    setCurrentStep(1);
    setWizardData({});
    closeWizard();
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
        />
      )}
    </Modal>
  );
};

export default ProjectCreationWizard;
