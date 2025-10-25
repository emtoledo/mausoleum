import React from 'react';
import BackgroundVideo from '../ui/BackgroundVideo';

const IntroFlowLayout = ({ children }) => {
  return (
    <div className="intro-flow-layout">
      <BackgroundVideo />
      <div className="intro-content modal-overlay">
        {children}
      </div>
      
      <div className="footer-branding">
      <div className="mausoleum-logo">
        <img src="/images/poweredby.png" alt="MAUSOLEUM" className="mausoleum-img" />
      </div>
    </div>

    </div>
  );
};

export default IntroFlowLayout;
