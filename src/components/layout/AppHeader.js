import React from 'react';
import ProfileDropdown from '../ui/ProfileDropdown';
import { useAuth } from '../../hooks/useAuth';
import { useProjectFlow } from '../../context/ProjectFlowContext';

const AppHeader = ({ 
  projectTitle, 
  currentPage, 
  onSave, 
  onShare, 
  onMoreOptions, 
  showCanvasControls, 
  onCanvasControl, 
  onProjectTitleClick, 
  showFullBreadcrumb, 
  showSaveButton, 
  showShareButton = true 
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const { logout } = useAuth();
  const { openWizard } = useProjectFlow();

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleCloseDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const handleAllProjects = () => {
    console.log('AppHeader - All Projects clicked');
    // This will be handled by routing in the new architecture
    window.location.href = '/projects';
  };

  const handleAccountSettings = () => {
    console.log('AppHeader - Account Settings clicked');
    setIsProfileDropdownOpen(false);
    window.location.href = '/account-settings';
  };

  const handleLogOut = () => {
    console.log('AppHeader - Global Log Out clicked');
    logout();
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <div className="menu-icon" onClick={handleAllProjects}>
          <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
        </div>
        <div className="breadcrumb">
          <span className={`breadcrumb-item ${onProjectTitleClick ? 'clickable' : ''}`} onClick={onProjectTitleClick}>
            {projectTitle}
          </span>
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
