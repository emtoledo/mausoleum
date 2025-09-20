import React from 'react';
import AppHeader from './AppHeader';
import { useCanvasLayout } from '../contexts/CanvasLayoutContext';

const AccountSettingsView = ({ onBack, onLogOut }) => {
  const { setCanvasLayout } = useCanvasLayout();

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
    console.log('Menu clicked');
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
