import React from 'react';
import BackgroundVideo from '../ui/BackgroundVideo';
import FooterBranding from './FooterBranding';

const IntroFlowLayout = ({ children }) => {
  return (
    <div className="intro-flow-layout">
      <BackgroundVideo />
      <div className="intro-content modal-overlay">
        {children}
      </div>
      <FooterBranding />
    </div>
  );
};

export default IntroFlowLayout;
