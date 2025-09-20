import React from 'react';
import AppHeader from './AppHeader';
import AllProjectsView from './AllProjectsView';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const AccountSettingsView = ({ onBack, onLogOut, onProjectClick }) => {
  const { setCanvasLayout } = useCanvasLayout();
  const [showAllProjects, setShowAllProjects] = React.useState(false);

  React.useEffect(() => {
    setCanvasLayout(true);
    return () => setCanvasLayout(false);
  }, [setCanvasLayout]);

  const handleSave = () => {
    console.log('Account settings saved');
  };

  const handleShare = () => {
    console.log('Account settings shared');
  };

  const handleMenuClick = () => {
    console.log('AccountSettingsView - Menu clicked, navigating to All Projects');
    setShowAllProjects(true);
  };

  const handleBackFromAllProjects = () => {
    setShowAllProjects(false);
  };

  const handleCreateNewProject = () => {
    console.log('Create New Project clicked from AccountSettingsView');
    onBack(); // Navigate back to login form to start new project
  };

  const handleProjectClick = (project) => {
    console.log('AccountSettingsView - Project clicked, delegating to parent:', project);
    setShowAllProjects(false);
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
        onProjectClick={handleProjectClick}
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
        onMenuClick={handleMenuClick}
        onMoreOptions={handleMoreOptions}
        onProfileClick={handleProfileClick}
        showCanvasControls={false}
        onCanvasControl={handleCanvasControl}
        onProjectTitleClick={handleProjectTitleClick}
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
