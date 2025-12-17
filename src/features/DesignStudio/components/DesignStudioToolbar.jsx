/**
 * DesignStudioToolbar Component
 * 
 * Global action bar for the memorial design studio.
 * Provides tools and actions with icon-driven UI.
 */

import React from 'react';
import { TextCursor, X } from 'lucide-react';

/**
 * @param {Function} onAddText - Callback when Add Text is clicked
 * @param {Function} onToggleArtworkLibrary - Callback when Add Artwork is clicked
 * @param {Function} onClose - Callback when Close is clicked
 * @param {Function} onSaveAsTemplate - Callback when Save as Template is clicked (master admin only)
 * @param {Function} onToggleTemplateLibrary - Callback when Add Template is clicked
 * @returns {JSX.Element}
 */
const DesignStudioToolbar = ({
  onAddText,
  onToggleArtworkLibrary,
  onClose,
  onSaveAsTemplate,
  onToggleTemplateLibrary
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
   * Handle Add Artwork button click
   */
  const handleToggleArtworkLibrary = () => {
    if (onToggleArtworkLibrary) {
      onToggleArtworkLibrary();
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

  /**
   * Handle Add Template button click
   */
  const handleToggleTemplateLibrary = () => {
    if (onToggleTemplateLibrary) {
      onToggleTemplateLibrary();
    }
  };

  return (
    <div className="design-studio-toolbar">
      
      <div className="toolbar-group">

        <button
          className="toolbar-button"
          onClick={handleAddText}
          title="Add Text"
          aria-label="Add Text"
        >
       
          <img src="/images/text_icon.png" alt="Text" className="toolbar-icon-image" />
          <span className="toolbar-label">Add Text</span>
        </button>


        <button
          className="toolbar-button"
          onClick={handleToggleArtworkLibrary}
          title="Add Artwork"
          aria-label="Add Artwork"
        >
          <img src="/images/artwork_icon.png" alt="Artwork" className="toolbar-icon-image" />
          <span className="toolbar-label">Add Artwork</span>
        </button>
  
        {/* Add Template - Available to all users */}
        <button
          className="toolbar-button"
          onClick={handleToggleTemplateLibrary}
          title="Add Template"
          aria-label="Add Template"
          disabled={!onToggleTemplateLibrary}
        >
          <img src="/images/template_icon.png" alt="Template" className="toolbar-icon-image" />
          <span className="toolbar-label">Add Template</span>
        </button>
     

      </div>

      {/* Master Admin Actions */}
      {onSaveAsTemplate && (
        <div className="toolbar-group toolbar-group-admin">
          <button
            className="toolbar-button toolbar-button-admin"
            onClick={onSaveAsTemplate}
            title="Save as Template (Admin Only)"
            aria-label="Save as Template"
          >
            <img src="/images/savetemplate_icon.png" alt="Template" className="toolbar-icon-image" style={{width: '20px', height: '22px'}}/>
            <span className="toolbar-label">Save as Template</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default DesignStudioToolbar;
