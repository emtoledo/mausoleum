import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import FooterBranding from './FooterBranding';
import GlobalNavigation from './GlobalNavigation';

const BaseScreenLayout = () => {
  return (
    <div className="base-screen-layout">
      <AppHeader />
      <GlobalNavigation />
      <main className="main-content">
        <Outlet />
      </main>
      <FooterBranding />
    </div>
  );
};

export default BaseScreenLayout;
