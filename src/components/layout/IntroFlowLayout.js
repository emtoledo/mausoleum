import React from 'react';
import BackgroundVideo from '../ui/BackgroundVideo';

const IntroFlowLayout = ({ children }) => {
  return (
    <div className="intro-flow-layout">
      <BackgroundVideo />
      <div className="intro-content modal-overlay">
        {children}
      </div>
    </div>
  );
};

export default IntroFlowLayout;
