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
 * @returns {JSX.Element}
 */
const DesignStudioToolbar = ({
  onAddText,
  onToggleArtworkLibrary,
  onClose
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

  return (
    <div className="design-studio-toolbar">
      
      {/* Left Group: Tools */}
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


        <button
          className="toolbar-button"
          onClick={handleAddText}
          title="Swap Product"
          aria-label="Swap Product"
        >
          <img src="/images/swap_icon.png" alt="Text" className="toolbar-icon-image" />
          <span className="toolbar-label">Swap Product</span>
        </button>


      </div>

    </div>
  );
};

export default DesignStudioToolbar;
