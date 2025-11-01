import React, { useState, useCallback, useMemo } from 'react';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';

const BaseScreenLayout = ({ children }) => {
  const [headerHandlers, setHeaderHandlers] = useState(null);

  // Stabilize the callback to prevent infinite loops
  const handleHandlersReady = useCallback((handlers) => {
    setHeaderHandlers(prevHandlers => {
      // Only update if state values actually changed (not function references)
      if (prevHandlers?.isSaving !== handlers?.isSaving ||
          prevHandlers?.isExporting !== handlers?.isExporting) {
        return handlers;
      }
      // If only function references changed but state is same, keep previous to avoid re-render
      if (prevHandlers && handlers) {
        return {
          ...prevHandlers,
          isSaving: handlers.isSaving,
          isExporting: handlers.isExporting,
          // Update function references only if they're actually different (they usually aren't)
          onSave: handlers.onSave,
          onExport: handlers.onExport
        };
      }
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
        onExport={headerHandlers?.onExport}
        isSaving={headerHandlers?.isSaving || false}
        isExporting={headerHandlers?.isExporting || false}
      />
      <main className="main-content">
        {childrenWithHandlers}
      </main>
      <FooterBranding />
    </div>
  );
};

export default BaseScreenLayout;
