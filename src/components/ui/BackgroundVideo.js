import React, { useEffect } from 'react';
import { useLocation } from '../../context/LocationContext';

const BackgroundVideo = () => {
  const { locationConfig } = useLocation();
  
  // Use location-specific video or fallback to default
  const videoUrl = locationConfig?.backgroundVideoUrl || '/videos/arlington_bg.mp4';
  
  console.log('BackgroundVideo component is rendering!');
  console.log('BackgroundVideo using video URL:', videoUrl);
  
  useEffect(() => {
    console.log('BackgroundVideo component MOUNTED');
    return () => {
      console.log('BackgroundVideo component UNMOUNTED');
    };
  }, []);
  
  return (
    <div className="background-container">
      <video className="background-video" autoPlay muted loop playsInline key={videoUrl}>
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
};

export default BackgroundVideo;
