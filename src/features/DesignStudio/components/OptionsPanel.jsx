/**
 * OptionsPanel Component
 * 
 * Contextual properties panel for editing selected design elements.
 * Provides two-way data binding between React state and Fabric.js objects.
 */

import React, { useState, useEffect } from 'react';

/**
 * @param {fabric.Object} selectedElement - Currently selected Fabric.js object
 * @param {Function} onUpdateElement - Optional callback when element is modified
 * @returns {JSX.Element}
 */
const OptionsPanel = ({ selectedElement, onUpdateElement }) => {
  // Text properties state
  const [content, setContent] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');

  // Image properties state
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [opacity, setOpacity] = useState(1);

  /**
   * Sync Fabric object properties to local React state
   */
  useEffect(() => {
    if (!selectedElement) {
      // Reset to defaults when nothing selected
      setContent('');
      setFontSize(12);
      setColor('#000000');
      setFontFamily('Arial');
      setWidth(0);
      setHeight(0);
      setOpacity(1);
      return;
    }

    // Update based on element type
    if (selectedElement.type === 'text') {
      setContent(selectedElement.get('text') || '');
      setFontSize(selectedElement.get('fontSize') || 12);
      setColor(selectedElement.get('fill') || '#000000');
      setFontFamily(selectedElement.get('fontFamily') || 'Arial');
    } else if (selectedElement.type === 'image') {
      setWidth(selectedElement.get('width') || 0);
      setHeight(selectedElement.get('height') || 0);
      setOpacity(selectedElement.get('opacity') || 1);
    }
  }, [selectedElement]);

  /**
   * Update Fabric object and re-render canvas
   * 
   * @param {string} property - Property name
   * @param {any} value - New value
   */
  const updateFabricObject = (property, value) => {
    if (selectedElement && selectedElement.canvas) {
      selectedElement.set(property, value);
      selectedElement.canvas.renderAll();
      
      if (onUpdateElement) {
        onUpdateElement(selectedElement);
      }
    }
  };

  // Text property handlers
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateFabricObject('text', newContent);
  };

  const handleFontSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setFontSize(newSize);
    updateFabricObject('fontSize', newSize);
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    updateFabricObject('fill', newColor);
  };

  const handleFontFamilyChange = (e) => {
    const newFont = e.target.value;
    setFontFamily(newFont);
    updateFabricObject('fontFamily', newFont);
  };

  // Image property handlers
  const handleWidthChange = (e) => {
    const newWidth = Number(e.target.value);
    setWidth(newWidth);
    updateFabricObject('width', newWidth);
  };

  const handleHeightChange = (e) => {
    const newHeight = Number(e.target.value);
    setHeight(newHeight);
    updateFabricObject('height', newHeight);
  };

  const handleOpacityChange = (e) => {
    const newOpacity = Number(e.target.value);
    setOpacity(newOpacity);
    updateFabricObject('opacity', newOpacity);
  };

  // Render empty state
  if (!selectedElement) {
    return (
      <div className="options-panel">
        <div className="options-panel-empty">
          Select an element to edit its properties
        </div>
      </div>
    );
  }

  // Render text properties panel
  if (selectedElement.type === 'text') {
    return (
      <div className="options-panel">
        <h3 className="options-panel-title">Text Properties</h3>
        
        <div className="options-panel-form">
          <div className="form-group">
            <label htmlFor="text-content" className="form-label">
              Content
            </label>
            <textarea
              id="text-content"
              className="form-input"
              value={content}
              onChange={handleContentChange}
              rows="4"
              placeholder="Enter text content"
            />
          </div>

          <div className="form-group">
            <label htmlFor="text-font-size" className="form-label">
              Font Size
            </label>
            <input
              id="text-font-size"
              type="number"
              className="form-input"
              value={fontSize}
              onChange={handleFontSizeChange}
              min="1"
              step="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="text-color" className="form-label">
              Color
            </label>
            <input
              id="text-color"
              type="color"
              className="form-input form-input-color"
              value={color}
              onChange={handleColorChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="text-font-family" className="form-label">
              Font Family
            </label>
            <select
              id="text-font-family"
              className="form-input form-select"
              value={fontFamily}
              onChange={handleFontFamilyChange}
            >
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Render image properties panel
  if (selectedElement.type === 'image') {
    return (
      <div className="options-panel">
        <h3 className="options-panel-title">Image Properties</h3>
        
        <div className="options-panel-form">
          <div className="form-group">
            <label htmlFor="image-width" className="form-label">
              Width
            </label>
            <input
              id="image-width"
              type="number"
              className="form-input"
              value={width}
              onChange={handleWidthChange}
              min="1"
              step="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image-height" className="form-label">
              Height
            </label>
            <input
              id="image-height"
              type="number"
              className="form-input"
              value={height}
              onChange={handleHeightChange}
              min="1"
              step="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image-opacity" className="form-label">
              Opacity
            </label>
            <input
              id="image-opacity"
              type="range"
              className="form-input form-range"
              value={opacity}
              onChange={handleOpacityChange}
              min="0"
              max="1"
              step="0.01"
            />
            <span className="form-range-value">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Render unknown type
  return (
    <div className="options-panel">
      <div className="options-panel-empty">
        Unknown element type: {selectedElement.type}
      </div>
    </div>
  );
};

export default OptionsPanel;
