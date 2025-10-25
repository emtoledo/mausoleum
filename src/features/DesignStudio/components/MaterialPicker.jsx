/**
 * MaterialPicker Component
 * 
 * Displays a grid of material swatches for selection.
 * When a swatch is clicked, calls onSelectMaterial with the selected material.
 */

import React from 'react';

/**
 * @param {Array} materials - Array of material objects from MaterialsData
 * @param {Function} onSelectMaterial - Callback fired when a material is selected
 * @param {string} selectedMaterialId - Currently selected material ID (optional)
 * @returns {JSX.Element}
 */
const MaterialPicker = ({ materials = [], onSelectMaterial, selectedMaterialId = null }) => {
  
  /**
   * Handle material swatch click
   * 
   * @param {Object} material - The selected material object
   */
  const handleMaterialClick = (material) => {
    if (onSelectMaterial) {
      onSelectMaterial(material);
    }
  };

  if (!materials || materials.length === 0) {
    return (
      <div className="material-picker">
        <p className="material-picker-empty">No materials available</p>
      </div>
    );
  }

  return (
    <div className="material-picker">
      <h3 className="material-picker-title">Select Material</h3>
      
      <div className="material-picker-grid">
        {materials.map((material) => (
          <div
            key={material.id}
            className={`material-swatch ${selectedMaterialId === material.id ? 'selected' : ''}`}
            onClick={() => handleMaterialClick(material)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${material.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMaterialClick(material);
              }
            }}
          >
            <div className="material-swatch-image">
              <img 
                src={material.textureUrl || material.swatch} 
                alt={material.name}
                loading="lazy"
              />
            </div>
            <div className="material-swatch-label">
              {material.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MaterialPicker;
