import React from 'react';
import AppHeader from './AppHeader';
import AllProjectsView from './AllProjectsView';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const AccountSettingsView = ({ onBack, onProjectClick, onAllProjectsNavigation, onAccountSettingsNavigation }) => {
  const { setCanvasLayout } = useCanvasLayout();
  const [showAllProjects, setShowAllProjects] = React.useState(false);

  React.useEffect(() => {
    setCanvasLayout(true);
    
    // Listen for global All Projects navigation
    const handleNavigateToAllProjects = () => {
      console.log('AccountSettingsView - Received navigateToAllProjects event');
      setShowAllProjects(true);
    };
    
    window.addEventListener('navigateToAllProjects', handleNavigateToAllProjects);
    
    return () => {
      setCanvasLayout(false);
      window.removeEventListener('navigateToAllProjects', handleNavigateToAllProjects);
    };
  }, [setCanvasLayout]);

  const handleSave = () => {
    console.log('Account settings saved');
  };

  const handleShare = () => {
    console.log('Account settings shared');
  };



  const handleBackFromAllProjects = () => {
    setShowAllProjects(false);
  };


  const handleCreateNewProject = () => {
    console.log('Create New Project clicked from AccountSettingsView');
    onBack(); // Navigate back to login form to start new project
  };

  const handleProjectClickFromAccountSettings = (project) => {
    console.log('AccountSettingsView - Project clicked, navigating to TemplateGridView:', project);
    setShowAllProjects(false);
    // Navigate to TemplateGridView by calling the parent's onProjectClick
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  const handleMoreOptions = () => {
    console.log('More options clicked');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };

  const handleCanvasControl = (action) => {
    console.log('Canvas control:', action);
  };

  const handleProjectTitleClick = () => {
    onBack();
  };

  // Show All Projects view if requested
  if (showAllProjects) {
    return (
      <AllProjectsView
        onBack={handleBackFromAllProjects}
        onCreateNewProject={handleCreateNewProject}
        onProjectClick={handleProjectClickFromAccountSettings}
      />
    );
  }

  return (
    <div className="account-settings-container">
      <AppHeader
        projectTitle="Account Settings"
        currentPage="Settings"
        onSave={handleSave}
        onShare={handleShare}
        onMoreOptions={handleMoreOptions}
        onProfileClick={handleProfileClick}
        onAllProjectsNavigation={onAllProjectsNavigation}
        onAccountSettingsNavigation={onAccountSettingsNavigation}
        showCanvasControls={false}
        onCanvasControl={handleCanvasControl}
        onProjectTitleClick={null}
        showFullBreadcrumb={true}
        showSaveButton={false}
        showShareButton={false}
      />
      
      <div className="account-settings-content">
        <div className="settings-placeholder">
          <h2>Account Settings</h2>
          <p>This is a blank canvas layout page for account settings.</p>
          <p>Future account settings functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsView;
