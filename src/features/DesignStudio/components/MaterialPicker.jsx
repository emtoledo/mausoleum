/**
 * MaterialPicker Component
 * 
 * Displays a grid of material swatches for selection.
 * Provides visual feedback for the currently active material.
 * When a swatch is clicked, calls onSelectMaterial with the selected material.
 */

import React from 'react';

/**
 * @param {Array} materials - Array of material objects from MaterialsData
 * @param {string} activeMaterialId - Currently selected material ID
 * @param {Function} onSelectMaterial - Callback fired when a material is selected
 * @returns {JSX.Element}
 */
const MaterialPicker = ({ materials = [], activeMaterialId = null, onSelectMaterial }) => {
  
  /**
   * Handle material swatch click
   * 
   * @param {Object} material - The selected material object
   * @param {boolean} isSelected - Whether this material is currently selected
   */
  const handleClick = (material, isSelected) => {
    // Only call if changing to a different material
    if (!isSelected && onSelectMaterial) {
      console.log('MaterialPicker: Material clicked:', material);
      onSelectMaterial(material);
    } else if (isSelected) {
      console.log('MaterialPicker: Material already selected:', material);
    }
  };

  if (!materials || materials.length === 0) {
    return (
      <div className="material-picker">
        <div className="material-picker-empty">No materials available</div>
      </div>
    );
  }

  return (
    <div className="material-picker">

      <div className="material-picker-grid">
        {materials.map((material) => {
          const isSelected = material.id === activeMaterialId;

          return (
            <button
              key={material.id}
              className={`material-swatch ${isSelected ? 'selected' : ''}`}
              onClick={() => handleClick(material, isSelected)}
              aria-pressed={isSelected}
              aria-label={`Select ${material.name}`}
            >
              <div className="material-swatch-image">
                <img 
                  src={material.swatch || material.textureUrl} 
                  alt={material.name}
                  loading="lazy"
                />
              </div>
              <span className="material-swatch-label">
                {material.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MaterialPicker;
