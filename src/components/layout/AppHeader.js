import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import ProfileDropdown from '../ui/ProfileDropdown';
import { useAuth } from '../../hooks/useAuth';
import { useProjectFlow } from '../../context/ProjectFlowContext';
import dataService from '../../services/dataService';
import CanvasActions from '../../features/DesignStudio/components/CanvasActions';

const AppHeader = ({ 
  pageTitle, 
  currentPage, 
  onSave, 
  onShare, 
  onExport,
  onMoreOptions, 
  showCanvasControls, 
  onCanvasControl, 
  onPageTitleClick, 
  showFullBreadcrumb, 
  showSaveButton, 
  showShareButton = true,
  isSaving = false,
  isExporting = false,
  isCanvasReady = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const { logout, isAuthenticated } = useAuth();
  const { openWizard } = useProjectFlow();

  // Auto-detect if we're in EditModeView
  const isEditMode = location.pathname.includes('/edit/');
  
  // Get current template info for EditMode
  const getCurrentTemplateInfo = () => {
    if (isEditMode && params.projectId && params.templateId) {
      try {
        const project = dataService.getProjectById(params.projectId);
        if (project && project.templates) {
          const template = project.templates.find(t => t.templateId === params.templateId);
          if (template) {
            const templateIndex = project.templates.findIndex(t => t.templateId === params.templateId);
            return {
              template,
              optionNumber: templateIndex + 1
            };
          }
        }
      } catch (error) {
        console.error('Error loading template info:', error);
      }
    }
    return null;
  };

  const templateInfo = getCurrentTemplateInfo();
  
  // Use provided props or auto-detect for EditMode
  const shouldShowCanvasControls = showCanvasControls !== undefined ? showCanvasControls : isEditMode;
  const shouldShowSaveButton = showSaveButton !== undefined ? showSaveButton : isEditMode;
  const shouldShowShareButton = showShareButton !== undefined ? showShareButton : isEditMode;

  // Function to get page title based on current route
  const getPageTitle = () => {
    if (pageTitle) return pageTitle; // Use provided pageTitle if available
    
    const path = location.pathname;
    
    // Special handling for project-specific routes - show project title
    if (path.startsWith('/projects/') && (path.includes('/templates') || path.includes('/edit'))) {
      if (params.projectId) {
        try {
          const project = dataService.getProjectById(params.projectId);
          if (project && project.title) {
            return project.title;
          }
        } catch (error) {
          console.error('Error loading project for title:', error);
        }
      }
      return path.includes('/templates') ? 'Template Selection' : 'Edit Memorial';
    }
    
    switch (path) {
      case '/projects':
        return 'All Projects';
      case '/account-settings':
        return 'Account Settings';
      case '/selection':
        return 'Valhalla Memorial';
      case '/login':
        return 'Login';
      default:
        if (path.startsWith('/projects/')) {
          return 'Project Details';
        }
        return 'Valhalla Memorial';
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleCloseDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const handleAllProjects = () => {
    console.log('AppHeader - All Projects clicked');
    navigate('/projects');
  };

  const handleCreateNewProject = () => {
    console.log('AppHeader - Create New Project clicked');
    openWizard();
  };

  const handleAccountSettings = () => {
    console.log('AppHeader - Account Settings clicked');
    setIsProfileDropdownOpen(false);
    navigate('/account-settings');
  };

  const handleLogOut = () => {
    console.log('AppHeader - Global Log Out clicked');
    logout();
  };

  // Default handlers for EditMode
  const defaultCanvasControl = (action) => {
    console.log('Canvas control:', action);
  };

  const defaultSave = () => {
    console.log('Save clicked');
  };

  const defaultShare = () => {
    console.log('Share clicked');
  };

  const defaultExport = () => {
    console.log('Export clicked');
  };

  const defaultMoreOptions = () => {
    console.log('More options clicked');
  };

  // Handler for page title click in EditMode
  const handlePageTitleClick = () => {
    if (isEditMode && params.projectId) {
      navigate(`/projects/${params.projectId}/templates`);
    } else if (onPageTitleClick) {
      onPageTitleClick();
    }
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <div className="menu-icon" onClick={handleAllProjects}>
          <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
        </div>
        <div className="breadcrumb">
          <span className={`breadcrumb-item ${(onPageTitleClick || isEditMode) ? 'clickable' : ''}`} onClick={handlePageTitleClick}>
            {getPageTitle()}
          </span>
          {(showFullBreadcrumb || isEditMode) && (onPageTitleClick || isEditMode) && (
            <>
              <span className="breadcrumb-separator">
                <img src="/images/breadcrumb_icon.png" alt=">" className="breadcrumb-icon" />
              </span>
              <span className="breadcrumb-item active">
                {isEditMode && templateInfo ? `Option ${templateInfo.optionNumber}` : currentPage}
              </span>
            </>
          )}
        </div>
      </div>
      
      
      {shouldShowCanvasControls && (
        <div className="header-center">
          <div className="canvas-controls">
            <div className="control-group">
              {/* Cloud icon hidden for later use */}
              {/* <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('cloud')}>
                <img src="/images/cloud_icon.png" alt="Cloud" className="control-icon cloud" />
              </div> */}
              <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('undo')}>
                <img src="/images/undo_icon.png" alt="Undo" className="control-icon undo" />
              </div>
              <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('redo')}>
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
              <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('zoom-in')}>
                <img src="/images/zoom_icon.png" alt="Zoom In" className="control-icon" />
              </div>
              <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('zoom-out')}>
                <img src="/images/background_icon.png" alt="Zoom Out" className="control-icon" />
              </div>
            </div>
          </div>
        </div>
      )}
      
              <div className="header-right">

                {shouldShowSaveButton && (
                  <CanvasActions
                    onSave={onSave || defaultSave}
                    onExport={onExport || defaultExport}
                    isSaving={isSaving}
                    isExporting={isExporting}
                    isCanvasReady={isCanvasReady}
                  />
                )}

                
        <div className="more-options" onClick={onMoreOptions || defaultMoreOptions}>
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
