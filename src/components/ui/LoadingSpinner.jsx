import React from 'react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner Component
 * 
 * Displays a loading spinner with optional message and progress indicator
 * 
 * @param {String} message - Optional message to display below spinner
 * @param {Number} progress - Optional progress percentage (0-100)
 * @param {String} size - Size of spinner: 'small', 'medium', 'large' (default: 'medium')
 */
const LoadingSpinner = ({ message = 'Loading...', progress = null, size = 'medium' }) => {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <div className="loading-message">{message}</div>}
      {progress !== null && (
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
          <div className="progress-text">{Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;

