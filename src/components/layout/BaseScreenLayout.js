import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';

const BaseScreenLayout = ({ children }) => {
  const location = useLocation();
  const isAccountSettings = location.pathname === '/account-settings';
  const isAllProjects = location.pathname === '/projects';
  const isApprovedView = location.pathname.includes('/approved');
  const shouldHideFooter = isAccountSettings || isAllProjects || isApprovedView;
  const [headerHandlers, setHeaderHandlers] = useState(null);

  // Stabilize the callback to prevent infinite loops
  const handleHandlersReady = useCallback((handlers) => {
    console.log('BaseScreenLayout: handleHandlersReady called', {
      hasHandlers: !!handlers,
      hasOnSave: !!handlers?.onSave,
      hasOnExport: !!handlers?.onExport,
      onExportName: handlers?.onExport?.name || 'anonymous',
      onExportType: typeof handlers?.onExport,
      isSaving: handlers?.isSaving,
      isExporting: handlers?.isExporting,
      isCanvasReady: handlers?.isCanvasReady
    });
    
    setHeaderHandlers(prevHandlers => {
      // Check if canvas readiness changed
      const canvasReadinessChanged = prevHandlers?.isCanvasReady !== handlers?.isCanvasReady;
      // Check if projectTitle changed
      const projectTitleChanged = prevHandlers?.projectTitle !== handlers?.projectTitle;
      
      // Only update if state values actually changed (not function references)
      if (prevHandlers?.isSaving !== handlers?.isSaving ||
          prevHandlers?.isExporting !== handlers?.isExporting ||
          canvasReadinessChanged ||
          projectTitleChanged) {
        console.log('BaseScreenLayout: Updating handlers due to state/readiness change', {
          canvasReadinessChanged,
          projectTitleChanged,
          prevCanvasReady: prevHandlers?.isCanvasReady,
          newCanvasReady: handlers?.isCanvasReady,
          prevProjectTitle: prevHandlers?.projectTitle,
          newProjectTitle: handlers?.projectTitle
        });
        return handlers;
      }
      // If only function references changed but state is same, keep previous to avoid re-render
      if (prevHandlers && handlers) {
        console.log('BaseScreenLayout: Updating handlers (state unchanged, updating functions)');
        return {
          ...prevHandlers,
          isSaving: handlers.isSaving,
          isExporting: handlers.isExporting,
          isCanvasReady: handlers.isCanvasReady,
          projectTitle: handlers.projectTitle,
          // Update function references only if they're actually different (they usually aren't)
          onSave: handlers.onSave,
          onExport: handlers.onExport,
          onApproval: handlers.onApproval
        };
      }
      console.log('BaseScreenLayout: Setting initial handlers');
      return handlers;
    });
  }, []);

  // Store children in ref to avoid recreating on every render
  // We'll clone children directly in render, but memoize the callback
  const childrenWithHandlers = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          onHandlersReady: handleHandlersReady
        });
      }
      return child;
    });
  }, [children, handleHandlersReady]); // Recreate if children or callback changes

  return (
    <div className="base-screen-layout">
      <AppHeader
        onSave={headerHandlers?.onSave}
        onExport={headerHandlers?.onExport || undefined}
        onApproval={headerHandlers?.onApproval}
        isSaving={headerHandlers?.isSaving || false}
        isExporting={headerHandlers?.isExporting || false}
        isCanvasReady={headerHandlers?.isCanvasReady || false}
        pageTitle={headerHandlers?.projectTitle}
        availableViews={headerHandlers?.availableViews}
        currentView={headerHandlers?.currentView}
        onViewChange={headerHandlers?.onViewChange}
      />
      <main className="main-content">
        {childrenWithHandlers}
      </main>
      {!shouldHideFooter && <FooterBranding />}
    </div>
  );
};

export default BaseScreenLayout;
