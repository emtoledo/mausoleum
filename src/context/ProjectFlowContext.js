import React, { createContext, useContext, useState } from 'react';

const ProjectFlowContext = createContext();

export const ProjectFlowProvider = ({ children }) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});

  const openWizard = () => {
    console.log('ProjectFlowContext - Opening wizard');
    setIsWizardOpen(true);
    setCurrentStep(1);
    setWizardData({});
  };

  const closeWizard = () => {
    console.log('ProjectFlowContext - Closing wizard');
    setIsWizardOpen(false);
    setCurrentStep(1);
    setWizardData({});
  };

  const nextStep = (stepData) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData({});
  };

  const value = {
    isWizardOpen,
    currentStep,
    wizardData,
    openWizard,
    closeWizard,
    nextStep,
    prevStep,
    resetWizard
  };

  return (
    <ProjectFlowContext.Provider value={value}>
      {children}
    </ProjectFlowContext.Provider>
  );
};

export const useProjectFlow = () => {
  const context = useContext(ProjectFlowContext);
  if (!context) {
    throw new Error('useProjectFlow must be used within a ProjectFlowProvider');
  }
  return context;
};

export default ProjectFlowContext;
