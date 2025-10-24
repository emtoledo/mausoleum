import React from 'react';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';

const BaseScreenLayout = ({ children }) => {
  return (
    <div className="base-screen-layout">
      <AppHeader />
      <main className="main-content">
        {children}
      </main>
      <FooterBranding />
    </div>
  );
};

export default BaseScreenLayout;
