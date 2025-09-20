import React from 'react';
import templateService from '../services/templateService';
import dataService from '../services/dataService';
import AppHeader from './AppHeader';
import EditModeView from './EditModeView';
import MemorialTypeForm from './MemorialTypeForm';
import MemorialStyleForm from './MemorialStyleForm';
import TemplateSelectionForm from './TemplateSelectionForm';
import AccountSettingsView from './AccountSettingsView';
import AllProjectsView from './AllProjectsView';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const TemplateGridView = ({ project, selectedTemplateIds, onBack }) => {
  console.log('TemplateGridView - Component rendering');
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editMode, setEditMode] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [showAddOptionOverlay, setShowAddOptionOverlay] = React.useState(false);
  const [overlayStep, setOverlayStep] = React.useState('type'); // 'type', 'style', 'selection'
  const [overlayData, setOverlayData] = React.useState({});
  const [currentProject, setCurrentProject] = React.useState(project);
  const [showAccountSettings, setShowAccountSettings] = React.useState(false);
  const [showAllProjects, setShowAllProjects] = React.useState(false);
  const { setCanvasLayout } = useCanvasLayout();

  React.useEffect(() => {
    console.log('TemplateGridView - Component mounted');
    loadSelectedTemplates();
  }, []);

  React.useEffect(() => {
    // Set canvas layout to true when this component mounts
    console.log('TemplateGridView - Setting canvas layout to true');
    setCanvasLayout(true);
    
    // Don't set canvas layout to false on unmount - let parent handle it
    // This prevents the component from being unmounted due to canvas layout changes
  }, [setCanvasLayout]);

  const loadSelectedTemplates = async () => {
    try {
      setLoading(true);
      console.log('TemplateGridView - Loading templates from project:', project);
      
      // Always use project.selectedTemplates if it exists, otherwise fall back to selectedTemplateIds prop
      if (project.selectedTemplates && project.selectedTemplates.length > 0) {
        console.log('TemplateGridView - Project has selectedTemplates:', project.selectedTemplates);
        setTemplates(project.selectedTemplates);
      } else {
        console.log('TemplateGridView - No selectedTemplates in project, using selectedTemplateIds prop');
        const allTemplates = await templateService.getAvailableTemplates();
        const selectedTemplates = allTemplates.filter(template => 
          selectedTemplateIds.includes(template.id)
        );
        setTemplates(selectedTemplates);
      }
    } catch (error) {
      console.error('Error loading selected templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack();
  };

  const handleSave = () => {
    console.log('Save clicked');
    // Implement save functionality
  };

  const handleShare = () => {
    console.log('Share clicked');
    // Implement share functionality
  };

  const handleMenuClick = () => {
    console.log('Menu clicked - navigating to All Projects');
    setShowAllProjects(true);
  };

  const handleBackFromAllProjects = () => {
    setShowAllProjects(false);
  };

  const handleCreateNewProject = () => {
    console.log('Create New Project clicked');
    // Navigate back to login form to start new project
    onBack();
  };

  const handleProjectClick = (project) => {
    console.log('Project clicked:', project);
    // Navigate to the selected project's template grid
    setShowAllProjects(false);
    // Update current project and reload templates
    setCurrentProject(project);
    loadSelectedTemplates();
  };

  const handleMoreOptions = () => {
    console.log('More options clicked');
    // Implement more options functionality
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
    // Profile dropdown is handled by AppHeader component
  };

  const handleAccountSettings = () => {
    console.log('Account Settings clicked');
    setShowAccountSettings(true);
  };

  const handleLogOut = () => {
    console.log('Log Out clicked');
    // Clear any stored data and return to login
    localStorage.removeItem('currentProject');
    localStorage.removeItem('isLoggedIn');
    onBack(); // This should take us back to the login form
  };

  const handleBackFromAccountSettings = () => {
    setShowAccountSettings(false);
  };

  const handleMemorialOptionClick = (template, index) => {
    console.log('Memorial option clicked:', template, 'Option:', index + 1);
    setSelectedTemplate({
      ...template,
      optionNumber: index + 1
    });
    setEditMode(true);
  };

  const handleBackFromEdit = () => {
    console.log('Back from edit mode');
    setEditMode(false);
    setSelectedTemplate(null);
  };

  const handleAddOptionClick = () => {
    console.log('Add option clicked');
    setShowAddOptionOverlay(true);
    setOverlayStep('type');
    setOverlayData({});
  };

  const handleOverlayCancel = () => {
    console.log('Overlay cancelled');
    setShowAddOptionOverlay(false);
    setOverlayStep('type');
    setOverlayData({});
  };

  const handleTypeFormNext = (memorialType) => {
    console.log('Type form next:', memorialType);
    setOverlayData(prev => ({ ...prev, memorialType }));
    setOverlayStep('style');
  };

  const handleStyleFormNext = (memorialStyle) => {
    console.log('Style form next:', memorialStyle);
    setOverlayData(prev => ({ ...prev, memorialStyle }));
    setOverlayStep('selection');
  };

  const handleTemplateSelectionDone = async (selectedTemplates) => {
    console.log('Template selection done:', selectedTemplates);
    
    // Close the overlay IMMEDIATELY to prevent any rendering issues
    console.log('TemplateGridView - Closing overlay immediately');
    setShowAddOptionOverlay(false);
    setOverlayStep('type');
    setOverlayData({});
    
    try {
      // Ensure project.selectedTemplates is an array
      const existingTemplates = project.selectedTemplates || [];
      console.log('TemplateGridView - Project ID:', project.id);
      console.log('TemplateGridView - Project:', project);
      console.log('TemplateGridView - Existing templates:', existingTemplates);
      console.log('TemplateGridView - New templates to add:', selectedTemplates);
      
      // Ensure project ID exists
      if (!project.id) {
        throw new Error('Project ID is missing:', project);
      }
      
      // Ensure selectedTemplates is an array
      if (!Array.isArray(selectedTemplates)) {
        throw new Error('selectedTemplates is not an array:', selectedTemplates);
      }
      
      // Format the new templates
      const formattedTemplates = selectedTemplates.map(template => ({
        templateId: template.id,
        templateName: template.name,
        baseImage: template.baseImage,
        previewImage: template.previewImage,
        text: template.text,
        type: template.type,
        style: template.style,
        selected: true,
        configured: false,
        customizations: {
          text: template.text,
          colors: {},
          fonts: {},
          layout: {}
        }
      }));
      
      console.log('TemplateGridView - Formatted templates:', formattedTemplates);
      
      // Add the new templates to the existing project
      console.log('TemplateGridView - Calling dataService.updateProject with:', {
        projectId: project.id,
        selectedTemplates: [...existingTemplates, ...formattedTemplates]
      });
      
      const updatedProject = await dataService.updateProject(project.id, {
        selectedTemplates: [...existingTemplates, ...formattedTemplates]
      });
      
      console.log('Templates added to project:', updatedProject);
      
      // Update the local project state to trigger re-render
      project.selectedTemplates = updatedProject.selectedTemplates;
      
      // Update the local templates state directly instead of reloading
      setTemplates(updatedProject.selectedTemplates);
      
      console.log('TemplateGridView - Templates updated successfully');
    } catch (error) {
      console.error('Error adding templates to project:', error);
      console.error('Error details:', error.message);
      alert('Error adding templates. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="canvas-layout">
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  // Show edit mode if a template is selected
  if (editMode && selectedTemplate) {
    return (
      <EditModeView
        project={project}
        selectedTemplate={selectedTemplate}
        onBack={handleBackFromEdit}
      />
    );
  }

  // Show All Projects view if requested
  if (showAllProjects) {
    return (
      <AllProjectsView
        onBack={handleBackFromAllProjects}
        onCreateNewProject={handleCreateNewProject}
        onProjectClick={handleProjectClick}
      />
    );
  }

  // Show Account Settings view if requested
  if (showAccountSettings) {
    return (
      <AccountSettingsView
        onBack={handleBackFromAccountSettings}
        onLogOut={handleLogOut}
      />
    );
  }

  return (
    <div className="canvas-layout">
      <AppHeader
        projectTitle={project.title}
        currentPage="All Options"
        onSave={handleSave}
        onShare={handleShare}
        onMenuClick={handleMenuClick}
        onMoreOptions={handleMoreOptions}
        onProfileClick={handleProfileClick}
        onAccountSettings={handleAccountSettings}
        onLogOut={handleLogOut}
        showFullBreadcrumb={false}
        showSaveButton={false}
      />

      {/* Template Grid */}
      <div className="memorial-grid-container">
        <div className="memorial-grid">
          {templates.map((template, index) => (
            <div key={template.id} className="memorial-option" onClick={() => handleMemorialOptionClick(template, index)}>
              <div className="memorial-card">
                <div className="memorial-image-container">
                  <img 
                    src={templateService.getTemplateImagePath(template.baseImage)} 
                    alt={template.name}
                    className="memorial-base-image"
                  />
                  <div className="memorial-text-overlay">
                    <div className="marker-headline">{project.markerHeadline}</div>
                    <div className="marker-year">{project.year}</div>
                    {project.epitaph && (
                      <div className="marker-epitaph">{project.epitaph}</div>
                    )}
                  </div>
                </div>
                <div className="option-label">OPTION {index + 1}</div>
              </div>
            </div>
          ))}
          
          {/* Add Option Card */}
          <div className="memorial-option" onClick={handleAddOptionClick}>
            <div className="add-option-card">
              <div className="add-icon">+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Option Overlay */}
      {showAddOptionOverlay && (
        <div className="add-option-overlay">
          {overlayStep === 'type' && (
            <MemorialTypeForm
              project={project}
              onBack={handleOverlayCancel}
              onNext={handleTypeFormNext}
              isOverlay={true}
            />
          )}
          {overlayStep === 'style' && (
            <MemorialStyleForm
              project={{ ...project, ...overlayData }}
              onBack={() => setOverlayStep('type')}
              onNext={handleStyleFormNext}
              isOverlay={true}
            />
          )}
          {overlayStep === 'selection' && (
            <TemplateSelectionForm
              project={{ ...project, ...overlayData }}
              onBack={() => setOverlayStep('style')}
              onNext={handleTemplateSelectionDone}
              isOverlay={true}
            />
          )}
        </div>
      )}

    </div>
  );
};

export default TemplateGridView;
