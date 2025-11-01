/**
 * CanvasActions Component
 * 
 * Provides actions for canvas operations: Export to DXF and Save Project.
 */

import React from 'react';
import { FileDown, Save, Loader2 } from 'lucide-react';

/**
 * @param {Function} onSave - Callback when Save Project is clicked
 * @param {Function} onExport - Callback when Export to DXF is clicked
 * @param {boolean} isSaving - Whether save operation is in progress
 * @param {boolean} isExporting - Whether export operation is in progress
 * @returns {JSX.Element}
 */
const CanvasActions = ({
  onSave,
  onExport,
  isSaving = false,
  isExporting = false
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
    if (!isExporting && onExport) {
      onExport();
    }
  };

  return (
    <div className="canvas-actions">
      
      {/* Export to DXF */}
      <button
        className="button-secondary"
        onClick={handleExport}
        disabled={isExporting}
        title="Export to DXF"
        aria-label="Export to DXF"
      >
        <span>
          {isExporting ? 'Exporting...' : 'Export DXF'}
        </span>
      </button>

      {/* Save Project */}
      <button
        className="button-primary"
        onClick={handleSave}
        disabled={isSaving}
        title="Save Project"
        aria-label="Save Project"
      >
        {isSaving ? (
          <>
            <Loader2 className="toolbar-icon animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <span>Save</span>
          </>
        )}
      </button>

    </div>
  );
};

export default CanvasActions;

