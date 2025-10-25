/**
 * ArtworkLibrary Component
 * 
 * Displays a grid of artwork items for selection and insertion into the design.
 * When an artwork is clicked, calls onSelectArtwork with the selected artwork.
 */

import React from 'react';

/**
 * @param {Array} artwork - Array of artwork objects from ArtworkData
 * @param {Function} onSelectArtwork - Callback fired when an artwork is selected
 * @param {string} selectedArtworkId - Currently selected artwork ID (optional)
 * @returns {JSX.Element}
 */
const ArtworkLibrary = ({ artwork = [], onSelectArtwork, selectedArtworkId = null }) => {
  
  /**
   * Handle artwork item click
   * 
   * @param {Object} art - The selected artwork object
   */
  const handleArtworkClick = (art) => {
    if (onSelectArtwork) {
      onSelectArtwork(art);
    }
  };

  if (!artwork || artwork.length === 0) {
    return (
      <div className="artwork-library">
        <p className="artwork-library-empty">No artwork available</p>
      </div>
    );
  }

  return (
    <div className="artwork-library">
      <h3 className="artwork-library-title">Artwork Library</h3>
      
      <div className="artwork-library-grid">
        {artwork.map((item) => (
          <div
            key={item.id}
            className={`artwork-item ${selectedArtworkId === item.id ? 'selected' : ''}`}
            onClick={() => handleArtworkClick(item)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${item.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleArtworkClick(item);
              }
            }}
          >
            <div className="artwork-item-image">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                loading="lazy"
              />
            </div>
            <div className="artwork-item-info">
              <div className="artwork-item-name">{item.name}</div>
              {item.category && (
                <div className="artwork-item-category">{item.category}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtworkLibrary;
