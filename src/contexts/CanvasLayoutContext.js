import React, { createContext, useContext, useState } from 'react';

const CanvasLayoutContext = createContext();

export const useCanvasLayout = () => {
  const context = useContext(CanvasLayoutContext);
  if (!context) {
    throw new Error('useCanvasLayout must be used within a CanvasLayoutProvider');
  }
  return context;
};

export const CanvasLayoutProvider = ({ children }) => {
  const [isCanvasLayout, setIsCanvasLayout] = useState(false);

  const setCanvasLayout = (isCanvas) => {
    console.log('CanvasLayoutContext - setCanvasLayout called with:', isCanvas);
    console.trace('CanvasLayoutContext - Call stack:'); // This will show which component called it
    setIsCanvasLayout(isCanvas);
  };

  console.log('CanvasLayoutProvider - isCanvasLayout:', isCanvasLayout);

  return (
    <CanvasLayoutContext.Provider value={{ isCanvasLayout, setCanvasLayout }}>
      {children}
    </CanvasLayoutContext.Provider>
  );
};
