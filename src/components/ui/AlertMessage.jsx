import React, { useEffect, useState } from 'react';

/**
 * AlertMessage Component
 * 
 * Displays an elegant alert message with an icon that fades away after a specified duration.
 * 
 * @param {string} type - Alert type: 'success', 'warning', or 'danger'
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds before fading (default: 5000)
 * @param {Function} onClose - Callback when alert is closed
 * @returns {JSX.Element}
 */
const AlertMessage = ({ type = 'success', message = '', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out animation slightly before hiding
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 300); // Start fade 300ms before duration ends

    // Hide and call onClose after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onClose]);

  if (!isVisible) return null;

  // Get icon and colors based on type
  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
            </svg>
          ),
          bgColor: '#10B981',
          borderColor: '#059669',
          textColor: '#FFFFFF'
        };
      case 'warning':
        return {
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0L20 18H0L10 0ZM10 14C9.45 14 9 14.45 9 15C9 15.55 9.45 16 10 16C10.55 16 11 15.55 11 15C11 14.45 10.55 14 10 14ZM9 12H11V8H9V12Z" fill="currentColor"/>
            </svg>
          ),
          bgColor: '#F59E0B',
          borderColor: '#D97706',
          textColor: '#FFFFFF'
        };
      case 'danger':
        return {
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/>
            </svg>
          ),
          bgColor: '#EF4444',
          borderColor: '#DC2626',
          textColor: '#FFFFFF'
        };
      default:
        return {
          icon: null,
          bgColor: '#6B7280',
          borderColor: '#4B5563',
          textColor: '#FFFFFF'
        };
    }
  };

  const { icon, bgColor, borderColor, textColor } = getIconAndColors();

  return (
    <div
      className={`alert-message alert-message-${type} ${isFading ? 'alert-message-fading' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor
      }}
    >
      <div className="alert-message-icon">
        {icon}
      </div>
      <div className="alert-message-text">
        {message}
      </div>
    </div>
  );
};

export default AlertMessage;

