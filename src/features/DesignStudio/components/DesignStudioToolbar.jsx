/**
 * DesignStudioToolbar Component
 * 
 * Global action bar for the memorial design studio.
 * Provides tools and actions with icon-driven UI.
 */

import React from 'react';
import { TextCursor, FileDown, Save, X, Loader2 } from 'lucide-react';

/**
 * @param {Function} onAddText - Callback when Add Text is clicked
 * @param {Function} onSave - Callback when Save Project is clicked
 * @param {Function} onExport - Callback when Export to DXF is clicked
 * @param {Function} onClose - Callback when Close is clicked
 * @param {boolean} isSaving - Whether save operation is in progress
 * @param {boolean} isExporting - Whether export operation is in progress
 * @returns {JSX.Element}
 */
const DesignStudioToolbar = ({
  onAddText,
  onSave,
  onExport,
  onClose,
  isSaving = false,
  isExporting = false
}) => {
  
  /**
   * Handle Add Text button click
   */
  const handleAddText = () => {
    if (onAddText) {
      onAddText();
    }
  };

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

  /**
   * Handle Close button click
   */
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="design-studio-toolbar">
      
      {/* Left Group: Tools */}
      <div className="toolbar-group toolbar-group-left">
        <button
          className="toolbar-button"
          onClick={handleAddText}
          title="Add Text"
          aria-label="Add Text"
        >
          <TextCursor className="toolbar-icon" />
          <span className="toolbar-label">Add Text</span>
        </button>
      </div>

      {/* Right Group: Actions & Navigation */}
      <div className="toolbar-group toolbar-group-right">
        
        {/* Export to DXF */}
        <button
          className="toolbar-button"
          onClick={handleExport}
          disabled={isExporting}
          title="Export to DXF"
          aria-label="Export to DXF"
        >
          {isExporting ? (
            <Loader2 className="toolbar-icon animate-spin" />
          ) : (
            <FileDown className="toolbar-icon" />
          )}
          <span className="toolbar-label">
            {isExporting ? 'Exporting...' : 'Export to DXF'}
          </span>
        </button>

        {/* Save Project */}
        <button
          className="toolbar-button"
          onClick={handleSave}
          disabled={isSaving}
          title="Save Project"
          aria-label="Save Project"
        >
          {isSaving ? (
            <>
              <Loader2 className="toolbar-icon animate-spin" />
              <span className="toolbar-label">Saving...</span>
            </>
          ) : (
            <>
              <Save className="toolbar-icon" />
              <span className="toolbar-label">Save</span>
            </>
          )}
        </button>

        {/* Close */}
        <button
          className="toolbar-button toolbar-button-close"
          onClick={handleClose}
          title="Close Studio"
          aria-label="Close Studio"
        >
          <X className="toolbar-icon" />
        </button>
      </div>
    </div>
  );
};

export default DesignStudioToolbar;
