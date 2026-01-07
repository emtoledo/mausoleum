/**
 * CanvasActions Component
 * 
 * Provides actions for canvas operations: Export to DXF and Save Project.
 */

import React from 'react';

/**
 * @param {Function} onSave - Callback when Save Project is clicked
 * @param {Function} onExport - Callback when Export to DXF is clicked
 * @param {Function} onApproval - Callback when Approval button is clicked
 * @param {boolean} isSaving - Whether save operation is in progress
 * @param {boolean} isExporting - Whether export operation is in progress
 * @param {boolean} isSubmittingForApproval - Whether approval submission is in progress
 * @param {boolean} isCanvasReady - Whether the canvas is initialized and ready
 * @returns {JSX.Element}
 */
const CanvasActions = ({
  onSave,
  onExport,
  onApproval,
  isSaving = false,
  isExporting = false,
  isSubmittingForApproval = false,
  isCanvasReady = false
}) => {
  
  /**
   * Handle Save button click
   */
  const handleSave = () => {
    if (!isSaving && onSave) {
      onSave();
    }
  };

  /**
   * Handle Export button click
   */
  const handleExport = () => {
    if (!isCanvasReady) {
      console.warn('CanvasActions: Canvas not ready yet');
      return;
    }
    if (!isExporting && onExport) {
      console.log('CanvasActions: Export button clicked, calling onExport');
      onExport();
    } else if (!onExport) {
      console.warn('CanvasActions: onExport handler not provided');
    }
  };

  /**
   * Handle Approval button click
   */
  const handleApproval = () => {
    if (!isCanvasReady) {
      console.warn('CanvasActions: Canvas not ready yet');
      return;
    }
    if (onApproval) {
      console.log('CanvasActions: Approval button clicked, calling onApproval');
      onApproval();
    } else {
      console.warn('CanvasActions: onApproval handler not provided');
    }
  };

  return (
    <div className="canvas-actions">
      
      {/* Approval Button */}
      <button
        className="button-secondary"
        onClick={handleApproval}
        disabled={!isCanvasReady || isSubmittingForApproval || isSaving}
        title={!isCanvasReady ? 'Canvas is loading...' : isSubmittingForApproval ? 'Saving and preparing approval...' : 'Create Approval Proof'}
        aria-label="Submit for Approval"
      >
        <span>{isSubmittingForApproval ? 'Preparing Approval...' : 'Submit for Approval'}</span>
      </button>


      {/* Export to DXF */}
      {/* <button
        className="button-secondary"
        onClick={handleExport}
        disabled={isExporting || !isCanvasReady}
        title={!isCanvasReady ? 'Canvas is loading...' : 'Export to DXF'}
        aria-label="Export to DXF"
      >
        <span>
          {isExporting ? 'Exporting...' : !isCanvasReady ? 'Loading Canvas...' : 'Export DXF'}
        </span>
      </button> */}

      {/* Save Project */}
      <button
        className="button-primary"
        onClick={handleSave}
        disabled={isSaving}
        title="Save Project"
        aria-label="Save Project"
      >
        {isSaving ? (
          <span>Saving...</span>
        ) : (
          <span>Save</span>
        )}
      </button>

    </div>
  );
};

export default CanvasActions;

