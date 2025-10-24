import React, { useEffect } from 'react';

const BackgroundVideo = () => {
  console.log('BackgroundVideo component is rendering!');
  
  useEffect(() => {
    console.log('BackgroundVideo component MOUNTED');
    return () => {
      console.log('BackgroundVideo component UNMOUNTED');
    };
  }, []);
  
  return (
    <div className="background-container">
      <video className="background-video" autoPlay muted loop playsInline>
        <source src="/videos/vallhalla_bg.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default BackgroundVideo;
