import React from 'react';
import ProfileDropdown from './ProfileDropdown';

const AppHeader = ({ projectTitle, currentPage, onSave, onShare, onMoreOptions, onProfileClick, showCanvasControls, onCanvasControl, onProjectTitleClick, showFullBreadcrumb, showSaveButton, showShareButton = true, onAllProjectsNavigation, onAccountSettingsNavigation }) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleCloseDropdown = () => {
    setIsProfileDropdownOpen(false);
  };


  const handleAllProjects = () => {
    console.log('AppHeader - All Projects clicked');
    console.log('AppHeader - onAllProjectsNavigation prop:', onAllProjectsNavigation);
    if (onAllProjectsNavigation) {
      console.log('AppHeader - Calling onAllProjectsNavigation');
      onAllProjectsNavigation();
    } else {
      console.log('AppHeader - No onAllProjectsNavigation prop provided');
    }
  };

  const handleAccountSettings = () => {
    console.log('AppHeader - Account Settings clicked');
    console.log('AppHeader - onAccountSettingsNavigation prop:', onAccountSettingsNavigation);
    setIsProfileDropdownOpen(false);
    if (onAccountSettingsNavigation) {
      console.log('AppHeader - Calling onAccountSettingsNavigation');
      onAccountSettingsNavigation();
    } else {
      console.log('AppHeader - No onAccountSettingsNavigation prop provided');
    }
  };

  const handleLogOut = () => {
    console.log('AppHeader - Global Log Out clicked');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('isLoggedIn');
    // Force navigation back to login form by reloading the page
    // This ensures we always go back to LoginForm regardless of navigation context
    window.location.reload();
  };
  return (
    <div className="app-header">
      <div className="header-left">
        <div className="menu-icon" onClick={handleAllProjects}>
          <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
        </div>
        <div className="breadcrumb">

              <span className={`breadcrumb-item ${onProjectTitleClick ? 'clickable' : ''}`} onClick={onProjectTitleClick}>{projectTitle}</span>
          {showFullBreadcrumb && onProjectTitleClick && (
            <>
              <span className="breadcrumb-separator">
                <img src="/images/breadcrumb_icon.png" alt=">" className="breadcrumb-icon" />
              </span>
              <span className="breadcrumb-item active">{currentPage}</span>
            </>
          )}
        </div>
      </div>
      
      {showCanvasControls && (
        <div className="header-center">
          <div className="canvas-controls">
            <div className="control-group">
              <div className="control-item" onClick={() => onCanvasControl('cloud')}>
                <img src="/images/cloud_icon.png" alt="Cloud" className="control-icon cloud" />
              </div>
              <div className="control-item" onClick={() => onCanvasControl('undo')}>
                <img src="/images/undo_icon.png" alt="Undo" className="control-icon undo" />
              </div>
              <div className="control-item" onClick={() => onCanvasControl('redo')}>
                <img src="/images/redo_icon.png" alt="Redo" className="control-icon redo" />
              </div>
            </div>
            
            <div className="control-group">
              <div className="control-separator">|</div>
              <div className="control-item active">
                <span className="control-text">Front</span>
              </div>
              <div className="control-separator">|</div>
            </div>
            
            <div className="control-group">
              <div className="control-item" onClick={() => onCanvasControl('zoom-in')}>
                <img src="/images/zoom_icon.png" alt="Zoom In" className="control-icon" />
              </div>
              <div className="control-item" onClick={() => onCanvasControl('zoom-out')}>
                <img src="/images/background_icon.png" alt="Zoom Out" className="control-icon" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="header-right">
        {showSaveButton && (
          <button className="save-button" onClick={onSave}>Save</button>
        )}
        {showShareButton && (
          <button className="share-button" onClick={onShare}>Share</button>
        )}
        <div className="more-options" onClick={onMoreOptions}>
          <div className="more-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="user-profile" onClick={handleProfileClick}>
          <div className="profile-avatar"></div>
          <ProfileDropdown
            isOpen={isProfileDropdownOpen}
            onClose={handleCloseDropdown}
            onAccountSettings={handleAccountSettings}
            onLogOut={handleLogOut}
          />
        </div>
      </div>
    </div>
  );
};

export default AppHeader;
