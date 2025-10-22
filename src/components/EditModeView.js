import React from 'react';
import templateService from '../services/templateService';
import AppHeader from './AppHeader';
import AccountSettingsView from './AccountSettingsView';
import AllProjectsView from './AllProjectsView';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const EditModeView = ({ project, selectedTemplate, onBack }) => {
  const { setCanvasLayout } = useCanvasLayout();
  const [showAccountSettings, setShowAccountSettings] = React.useState(false);
  const [showAllProjects, setShowAllProjects] = React.useState(false);

  React.useEffect(() => {
    console.log('EditModeView - Component rendering');
    console.log('EditModeView - Setting canvas layout to true');
    setCanvasLayout(true);
  }, [setCanvasLayout]);

  const handleSave = () => {
    console.log('Save clicked');
    // Implement save functionality
  };

  const handleShare = () => {
    console.log('Share clicked');
    // Implement share functionality
  };

  const handleAllProjectsNavigation = () => {
    console.log('EditModeView - All Projects navigation requested');
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
    // This would need to be handled by parent component
    // For now, just go back to template grid
    onBack();
  };

  const handleMoreOptions = () => {
    console.log('More options clicked');
    // Implement more options functionality
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
    // Profile dropdown is handled by AppHeader component
  };

  const handleAccountSettingsNavigation = () => {
    console.log('EditModeView - Account Settings navigation requested');
    setShowAccountSettings(true);
  };


  const handleBackFromAccountSettings = () => {
    setShowAccountSettings(false);
  };

  const handleProjectTitleClick = () => {
    console.log('Project title clicked - going back to grid view');
    onBack();
  };

  const handleCanvasControl = (control) => {
    console.log('Canvas control clicked:', control);
    // Implement canvas control functionality
  };

  const handleToolbarClick = (tool) => {
    console.log('Toolbar tool clicked:', tool);
    // Implement toolbar functionality
  };

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
        onProjectClick={handleProjectClick}
      />
    );
  }

  return (
    <div className="canvas-layout">
      <AppHeader
        projectTitle={project.title}
        currentPage={`Option ${selectedTemplate.optionNumber}`}
        onSave={handleSave}
        onShare={handleShare}
        onMenuClick={handleAllProjectsNavigation}
        onMoreOptions={handleMoreOptions}
        onProfileClick={handleProfileClick}
        onAccountSettings={handleAccountSettingsNavigation}
        showCanvasControls={true}
        onCanvasControl={handleCanvasControl}
        onProjectTitleClick={handleProjectTitleClick}
        showFullBreadcrumb={true}
        showSaveButton={true}
      />

      <div className="edit-mode-container">
        {/* Sidebar Toolbar */}
        <div className="sidebar-toolbar">
          <div className="toolbar-item" onClick={() => handleToolbarClick('artwork')}>
            <div className="toolbar-icon">
              <img src="/images/artwork_icon.png" alt="Artwork" className="toolbar-icon-image" />
            </div>
            <div className="toolbar-label">Artwork</div>
          </div>
          
          <div className="toolbar-item" onClick={() => handleToolbarClick('text')}>
            <div className="toolbar-icon">
              <img src="/images/text_icon.png" alt="Text" className="toolbar-icon-image" />
            </div>
            <div className="toolbar-label">Text</div>
          </div>
          
          <div className="toolbar-item" onClick={() => handleToolbarClick('vase')}>
            <div className="toolbar-icon">
              <img src="/images/vase_icon.png" alt="Vase" className="toolbar-icon-image vase" />
            </div>
            <div className="toolbar-label">Vase</div>
          </div>
          
          <div className="toolbar-item" onClick={() => handleToolbarClick('swap-template')}>
            <div className="toolbar-icon">
              <img src="/images/swap_icon.png" alt="Swap Template" className="toolbar-icon-image swap" />
            </div>
            <div className="toolbar-label">Swap Template</div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="canvas-area">
          <div className="memorial-canvas">
            <div className="memorial-card">
              <div className="memorial-image-container">
                <img 
                  src={templateService.getTemplateImagePath(selectedTemplate.baseImage)} 
                  alt={selectedTemplate.name}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModeView;
