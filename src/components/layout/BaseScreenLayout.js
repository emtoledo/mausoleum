import React, { useState, useCallback, useMemo } from 'react';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';

const BaseScreenLayout = ({ children }) => {
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
      
      // Only update if state values actually changed (not function references)
      if (prevHandlers?.isSaving !== handlers?.isSaving ||
          prevHandlers?.isExporting !== handlers?.isExporting ||
          canvasReadinessChanged) {
        console.log('BaseScreenLayout: Updating handlers due to state/readiness change', {
          canvasReadinessChanged,
          prevCanvasReady: prevHandlers?.isCanvasReady,
          newCanvasReady: handlers?.isCanvasReady
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
          // Update function references only if they're actually different (they usually aren't)
          onSave: handlers.onSave,
          onExport: handlers.onExport
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
        isSaving={headerHandlers?.isSaving || false}
        isExporting={headerHandlers?.isExporting || false}
        isCanvasReady={headerHandlers?.isCanvasReady || false}
      />
      <main className="main-content">
        {childrenWithHandlers}
      </main>
      <FooterBranding />
    </div>
  );
};

export default BaseScreenLayout;
