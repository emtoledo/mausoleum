import React, { useEffect, useState, useRef } from 'react';
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
  onApproval,
  onMoreOptions, 
  showCanvasControls, 
  onCanvasControl, 
  onPageTitleClick, 
  showFullBreadcrumb, 
  showSaveButton, 
  showShareButton = true,
  isSaving = false,
  isExporting = false,
  isCanvasReady = false,
  availableViews = ['front'],
  currentView = 'front',
  onViewChange
}) => {
  // Debug: Log when currentView prop changes
  useEffect(() => {
    console.log('AppHeader: currentView prop changed to:', currentView, 'availableViews:', availableViews);
  }, [currentView, availableViews]);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef(null);
  const { logout, isAuthenticated, user } = useAuth();
  const { openWizard } = useProjectFlow();
  
  // Get first letter of user's first name for avatar
  const getAvatarInitial = () => {
    if (!user) return '';
    
    // Try to get name from user metadata (Supabase) or direct name property (localStorage)
    const fullName = user.user_metadata?.full_name || user.name || user.email || '';
    
    if (fullName) {
      // Get first letter of first name
      const firstName = fullName.split(' ')[0];
      return firstName.charAt(0).toUpperCase();
    }
    
    // Fallback to first letter of email if no name
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '';
  };
  
  const avatarInitial = getAvatarInitial();

  // Auto-detect if we're in EditModeView
  const isEditMode = location.pathname.includes('/edit');
  
  // Get current template info for EditMode
  const getCurrentTemplateInfo = () => {
    if (isEditMode && params.projectId) {
      try {
        // Use async/await properly - this function should be async or use a hook
        // For now, we'll make it safer by not calling it during render
        const project = null; // Will be loaded via proper data fetching
        if (project) {
          // New format: single template
          if (project.template) {
            return {
              template: project.template,
              optionNumber: 1
            };
          }
          // Legacy format: templates array
          if (project.templates && project.templates.length > 0) {
            const template = project.templates[0];
            return {
              template,
              optionNumber: 1
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
    const path = location.pathname;
    
    // Only use pageTitle prop when we're actually in Design Studio (edit mode)
    // This prevents stale project titles from showing on other pages
    if (pageTitle && isEditMode) {
      return pageTitle;
    }
    
    // Otherwise, use route-based logic
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
        // For project edit routes, show "Edit Memorial" as fallback
        // (actual project title will be passed via pageTitle prop from Design Studio)
        if (path.startsWith('/projects/') && path.includes('/edit')) {
          return 'Edit Memorial';
        }
        if (path.startsWith('/projects/') && path.includes('/templates')) {
          return 'Template Selection';
        }
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

  const handleViewDropdownToggle = () => {
    setIsViewDropdownOpen(!isViewDropdownOpen);
  };

  const handleCloseViewDropdown = () => {
    setIsViewDropdownOpen(false);
  };

  const handleViewSelect = (view) => {
    if (onViewChange && view !== currentView) {
      onViewChange(view);
    }
    setIsViewDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
        setIsViewDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewDropdownOpen]);

  // Capitalize first letter of view name for display
  const formatViewName = (view) => {
    return view.charAt(0).toUpperCase() + view.slice(1);
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

  // Handler for page title click
  const handlePageTitleClick = () => {
    if (onPageTitleClick) {
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
          {isEditMode ? (
            // In DesignStudio: show only non-clickable project title
            <span className="breadcrumb-item">
              {getPageTitle()}
            </span>
          ) : (
            // Other pages: show clickable title with optional breadcrumb
            <>
              <span className={`breadcrumb-item ${onPageTitleClick ? 'clickable' : ''}`} onClick={handlePageTitleClick}>
                {getPageTitle()}
              </span>
              {showFullBreadcrumb && onPageTitleClick && (
                <>
                  <span className="breadcrumb-separator">
                    <img src="/images/breadcrumb_icon.png" alt=">" className="breadcrumb-icon" />
                  </span>
                  <span className="breadcrumb-item active">
                    {currentPage}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      
      {shouldShowCanvasControls && (
        <div className="header-center">
          <div className="canvas-controls">
            <div className="control-group">
              {/* Implement undo and redo later */}
           
              {/* <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('undo')}>
                <img src="/images/undo_icon.png" alt="Undo" className="control-icon undo" />
              </div>
              <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('redo')}>
                <img src="/images/redo_icon.png" alt="Redo" className="control-icon redo" />
              </div>*/}
            </div> 
            
            {/* People buy views */}
            {availableViews && availableViews.length > 0 && (
              <div className="control-group">
                {/* <div className="control-separator">|</div> */}
                {availableViews.length === 1 ? (
                  // Single view: just show it without selection
                  <div className="control-item active">
                    <span className="control-text">{formatViewName(availableViews[0])}</span>
                  </div>
                ) : (
                  // Multiple views: show dropdown
                  <div className="view-dropdown-container" ref={viewDropdownRef} style={{ position: 'relative' }}>
                    <div 
                      className="control-item view active"
                      onClick={handleViewDropdownToggle}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="control-text">{formatViewName(currentView)}</span>
                    </div>
                    {isViewDropdownOpen && (
                      <>
                        <div className="dropdown-backdrop" onClick={handleCloseViewDropdown}></div>
                        <div className="view-dropdown">
                          {availableViews.map((view) => (
                            <div
                              key={view}
                              className={`dropdown-item ${currentView === view ? 'active' : ''}`}
                              onClick={() => handleViewSelect(view)}
                            >
                              <span className="dropdown-text">{formatViewName(view)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* <div className="control-separator">|</div> */}
              </div>
            )}
            
            <div className="control-group">
              {/* Implement zoom in function later */}
              {/* <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('zoom-in')}>
                <img src="/images/zoom_icon.png" alt="Zoom In" className="control-icon" />
              </div> */}

              {/* Implement background function later */}
              {/* <div className="control-item" onClick={() => (onCanvasControl || defaultCanvasControl)('zoom-out')}>
                <img src="/images/background_icon.png" alt="Zoom Out" className="control-icon" />
              </div> */}
            </div>
          </div>
        </div>
      )}
      
              <div className="header-right">

                {shouldShowSaveButton && (
                  <CanvasActions
                    onSave={onSave || defaultSave}
                    onExport={onExport || defaultExport}
                    onApproval={onApproval}
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
          <div className="profile-avatar">
            {avatarInitial && <span className="profile-avatar-initial">{avatarInitial}</span>}
          </div>
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
