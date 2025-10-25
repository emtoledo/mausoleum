import React from 'react';

const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  title,
  showCloseButton = true,
  ...props 
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className={`modal ${className}`} {...props}>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
