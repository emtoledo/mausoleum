import React from 'react';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';
import GlobalNavigation from './GlobalNavigation';

const BaseScreenLayout = ({ children }) => {
  return (
    <div className="base-screen-layout">
      <AppHeader />
      <GlobalNavigation />
      <main className="main-content">
        {children}
      </main>
      <FooterBranding />
    </div>
  );
};

export default BaseScreenLayout;
