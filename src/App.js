import React from 'react';
import BackgroundVideo from './components/BackgroundVideo';
import LoginForm from './components/LoginForm';
import FooterBranding from './components/FooterBranding';
import { CanvasLayoutProvider, useCanvasLayout } from './contexts/CanvasLayoutContext';
import './utils/debugHelper'; // Import debug helper

function AppContent() {
  const { isCanvasLayout } = useCanvasLayout();

  console.log('AppContent - isCanvasLayout:', isCanvasLayout);
  console.log('AppContent - Should render BackgroundVideo:', !isCanvasLayout);

  // Completely prevent BackgroundVideo from rendering when canvas layout is active
  if (isCanvasLayout) {
    console.log('AppContent - Canvas layout active, NOT rendering BackgroundVideo');
    return (
      <div className="App">
        <LoginForm />
      </div>
    );
  }

  console.log('AppContent - Canvas layout inactive, rendering BackgroundVideo');
  return (
    <div className="App">
      <FooterBranding key="footer-branding" />
      <BackgroundVideo key="background-video" />
      <LoginForm />
    </div>
  );
}

function App() {
  return (
    <CanvasLayoutProvider>
      <AppContent />
    </CanvasLayoutProvider>
  );
}

export default App;
