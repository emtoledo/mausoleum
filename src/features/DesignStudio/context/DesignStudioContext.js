/**
 * DesignStudioContext
 * 
 * Context for sharing DesignStudio handlers and state with parent components
 * like AppHeader.
 */

import React, { createContext, useContext, useState } from 'react';

const DesignStudioContext = createContext(null);

/**
 * DesignStudioProvider
 * 
 * Provides DesignStudio handlers and state to child components
 */
export const DesignStudioProvider = ({ children, handlers }) => {
  return (
    <DesignStudioContext.Provider value={handlers}>
      {children}
    </DesignStudioContext.Provider>
  );
};

/**
 * useDesignStudio
 * 
 * Hook to access DesignStudio handlers and state
 */
export const useDesignStudio = () => {
  const context = useContext(DesignStudioContext);
  return context;
};

