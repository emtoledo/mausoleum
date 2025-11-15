import React from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * ConfirmModal Component
 * 
 * A modal dialog for confirming destructive actions.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback when modal is closed (via Cancel or backdrop)
 * @param {Function} onConfirm - Callback when user confirms the action
 * @param {string} title - Title of the confirmation (optional)
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default: "Yes, Delete")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} confirmVariant - Variant for confirm button (default: "danger")
 * @returns {JSX.Element}
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger'
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      className="confirm-modal"
    >
      <div className="confirm-modal-content">
        {title && (
          <h3 className="confirm-modal-title">{title}</h3>
        )}
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="confirm-modal-cancel"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            className="confirm-modal-confirm alert"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;

