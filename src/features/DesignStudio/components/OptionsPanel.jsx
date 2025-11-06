/**
 * OptionsPanel Component
 * 
 * Contextual properties panel for editing selected design elements.
 * Provides two-way data binding between React state and Fabric.js objects.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { FabricImage } from 'fabric';

/**
 * @param {fabric.Object} selectedElement - Currently selected Fabric.js object
 * @param {Function} onUpdateElement - Optional callback when element is modified
 * @param {Function} onDeleteElement - Callback when element should be deleted
 * @param {Function} onCenterHorizontal - Callback to center object horizontally
 * @param {Function} onCenterVertical - Callback to center object vertically
 * @param {Function} onFlipHorizontal - Callback to flip object horizontally
 * @param {Function} onFlipVertical - Callback to flip object vertically
 * @returns {JSX.Element}
 */
const OptionsPanel = ({ selectedElement, onUpdateElement, onDeleteElement, onCenterHorizontal, onCenterVertical, onFlipHorizontal, onFlipVertical }) => {
  // Text properties state
  const [content, setContent] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');

  // Image properties state
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [imageColor, setImageColor] = useState('#000000'); // Default to black

  // Refs for color inputs (to trigger programmatically)
  const colorInputRef = useRef(null);
  const imageColorInputRef = useRef(null);

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
      setImageColor('#000000');
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
      
      // Get color from customData (stored when color was changed)
      const customData = selectedElement.customData || {};
      if (customData.currentColor) {
        setImageColor(customData.currentColor);
      } else {
        // Default to black if no color stored
        setImageColor('#000000');
      }
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

  const handleImageColorChange = async (e) => {
    const newColor = e.target.value;
    setImageColor(newColor);
    
    if (!selectedElement) {
      console.warn('No element selected');
      return;
    }
    
    if (!selectedElement.canvas) {
      console.warn('Selected element has no canvas reference');
      return;
    }
    
    try {
        // Get the image source URL
        // Use original source from customData if available (to avoid blob URL issues)
        const customData = selectedElement.customData || {};
        let imageSrc = customData.originalSource || null;
        
        // If no original source stored, try to get current source
        if (!imageSrc) {
          if (selectedElement.getSrc) {
            imageSrc = selectedElement.getSrc();
          } else if (selectedElement._element && selectedElement._element.src) {
            imageSrc = selectedElement._element.src;
          } else if (selectedElement.getElement && selectedElement.getElement()) {
            const element = selectedElement.getElement();
            imageSrc = element.src || element.getAttribute('src');
          }
        }
        
        // If source is a blob URL, we can't fetch it - use filter approach instead
        if (!imageSrc || imageSrc.startsWith('blob:')) {
          console.warn('Cannot modify blob URL or no source available, using filter approach');
          // Fallback to filter approach
          if (selectedElement.canvas) {
            const filters = selectedElement.get('filters') || [];
            const filteredFilters = filters.filter(f => f.type !== 'BlendColor');
            
            const blendColorFilter = new fabric.filters.BlendColor({
              color: newColor,
              mode: 'multiply'
            });
            filteredFilters.push(blendColorFilter);
            
            selectedElement.set('filters', filteredFilters);
            selectedElement.applyFilters();
            
            // Store color in customData
            const updatedCustomData = {
              ...customData,
              currentColor: newColor
            };
            selectedElement.set('customData', updatedCustomData);
            
            selectedElement.canvas.renderAll();
          }
          return;
        }

        // For SVG images, we need to modify the SVG source to change fill colors
        // Fetch the SVG content
        let svgText;
        try {
          const response = await fetch(imageSrc);
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
          }
          svgText = await response.text();
        } catch (fetchErr) {
          console.warn('Could not fetch SVG, falling back to filter:', fetchErr);
          // Fallback to filter approach
          if (selectedElement.canvas) {
            const filters = selectedElement.get('filters') || [];
            const filteredFilters = filters.filter(f => f.type !== 'BlendColor');
            
            const blendColorFilter = new fabric.filters.BlendColor({
              color: newColor,
              mode: 'multiply'
            });
            filteredFilters.push(blendColorFilter);
            
            selectedElement.set('filters', filteredFilters);
            selectedElement.applyFilters();
            
            // Store color in customData
            const updatedCustomData = {
              ...customData,
              currentColor: newColor
            };
            selectedElement.set('customData', updatedCustomData);
            
            selectedElement.canvas.renderAll();
          }
          return;
        }
        
        // Parse SVG and modify fill attributes
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Function to recursively set fill on all elements
        const setFillRecursive = (element, color) => {
          // Skip text, style, script, and other non-visual elements
          const tagName = element.tagName?.toLowerCase();
          if (tagName === 'style' || tagName === 'script' || tagName === 'defs') {
            return;
          }
          
          // Get current fill value
          const currentFill = element.getAttribute('fill');
          
          // If element has a fill attribute
          if (currentFill !== null) {
            // Skip gradients, patterns, and 'none'
            if (!currentFill.startsWith('url(') && currentFill !== 'none') {
              element.setAttribute('fill', color);
            }
          } else {
            // If no fill attribute, check if it's a shape element that should have fill
            const shapeElements = ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line'];
            if (shapeElements.includes(tagName)) {
              // Only set fill if stroke is present (to avoid filling stroke-only shapes)
              // Or if it's a path/circle/ellipse/rect/polygon (typically filled shapes)
              const hasStroke = element.hasAttribute('stroke') && element.getAttribute('stroke') !== 'none';
              if (!hasStroke || tagName === 'path' || tagName === 'circle' || tagName === 'ellipse' || tagName === 'rect' || tagName === 'polygon') {
                element.setAttribute('fill', color);
              }
            }
          }
          
          // Process all children
          Array.from(element.children).forEach(child => {
            setFillRecursive(child, color);
          });
        };
        
        // Set fill color on all elements
        setFillRecursive(svgElement, newColor);
        
        // Serialize back to string
        const serializer = new XMLSerializer();
        const modifiedSvg = serializer.serializeToString(svgElement);
        
        // Create a blob URL from the modified SVG
        const blob = new Blob([modifiedSvg], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Reload the image with the modified SVG
        const newImg = await FabricImage.fromURL(blobUrl);
        
        if (!newImg) {
          console.warn('Failed to load new image');
          URL.revokeObjectURL(blobUrl);
          return;
        }
        
        // Wait for image to be fully loaded
        if (newImg._element && newImg._element.complete === false) {
          await new Promise((resolve) => {
            newImg._element.onload = resolve;
            newImg._element.onerror = resolve;
          });
        }
        
        // Copy properties from old image to new image
        const oldCustomData = selectedElement.customData || {};
        const oldProps = {
          left: selectedElement.left,
          top: selectedElement.top,
          scaleX: selectedElement.scaleX,
          scaleY: selectedElement.scaleY,
          angle: selectedElement.angle,
          originX: selectedElement.originX,
          originY: selectedElement.originY,
          selectable: selectedElement.selectable,
          hasControls: selectedElement.hasControls,
          hasBorders: selectedElement.hasBorders,
          lockMovementX: selectedElement.lockMovementX,
          lockMovementY: selectedElement.lockMovementY,
          lockRotation: selectedElement.lockRotation,
          lockScalingX: selectedElement.lockScalingX,
          lockScalingY: selectedElement.lockScalingY,
          customData: {
            ...oldCustomData,
            originalSource: oldCustomData.originalSource || imageSrc, // Store original source
            currentColor: newColor // Store current color
          },
          elementId: selectedElement.elementId,
          zoneId: selectedElement.zoneId
        };
        
        // Set properties on the new image
        newImg.set(oldProps);
        
        // Ensure the image is properly initialized
        newImg.setCoords();
        
        // Replace the old image with the new one
        const canvas = selectedElement.canvas;
        if (!canvas) {
          console.warn('Canvas not available, cannot replace image');
          URL.revokeObjectURL(blobUrl);
          return;
        }
        
        // Store the index before removing to maintain z-order
        const objects = canvas.getObjects();
        const index = objects.indexOf(selectedElement);
        
        // Remove the old image first
        canvas.remove(selectedElement);
        
        // Add the new image at the same index to maintain z-order
        if (index >= 0 && index < canvas.getObjects().length) {
          canvas.insertAt(newImg, index);
        } else {
          canvas.add(newImg);
        }
        
        // Set as active object
        canvas.setActiveObject(newImg);
        
        // Render the canvas
        canvas.renderAll();
        
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
        
        if (onUpdateElement) {
          onUpdateElement(newImg);
        }
      } catch (err) {
        console.error('Error changing SVG color:', err);
        // Fallback: try BlendColor filter
        if (selectedElement.canvas) {
          try {
            const filters = selectedElement.get('filters') || [];
            const filteredFilters = filters.filter(f => f.type !== 'BlendColor');
            
            const blendColorFilter = new fabric.filters.BlendColor({
              color: newColor,
              mode: 'tint'
            });
            filteredFilters.push(blendColorFilter);
            
            selectedElement.set('filters', filteredFilters);
            selectedElement.applyFilters();
            selectedElement.canvas.renderAll();
          } catch (filterErr) {
            console.warn('Could not apply color filter:', filterErr);
          }
        } else {
          console.warn('Canvas not available for fallback filter');
        }
      }
  };

  const handleDelete = () => {
    if (onDeleteElement) {
      onDeleteElement();
    }
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
        <div className="options-panel-header">
          <h3 className="options-panel-title">Text Properties</h3>
          <button
            type="button"
            className="options-panel-delete-button"
            onClick={handleDelete}
            title="Delete element"
          >
            <img src="/images/delete_icon.png" alt="Text" className="options-panel-icon" style={{ width: '12px', height: '14px' }} />
          </button>
        </div>

        {/* Center buttons */}
        <div className="options-panel-actions">
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onCenterHorizontal}
            title="Center horizontally"
          >
            <img src="/images/hcenter_icon.png" alt="Text" className="options-panel-icon" />
          </button>
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onCenterVertical}
            title="Center vertically"
          >
            <img src="/images/vcenter_icon.png" alt="Text" className="options-panel-icon" />
          </button>
        </div>
        
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                ref={colorInputRef}
                id="text-color"
                type="color"
                className="form-input form-input-color"
                value={color}
                onChange={handleColorChange}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  onClick={() => colorInputRef.current?.click()}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: color,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={`Click to change color: ${color}`}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#666' }}>
                  {color.toUpperCase()}
                </span>
              </div>
            </div>
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
              <option value="Helvetica Neue">Helvetica Neue</option>
              <option value="Georgia">Georgia</option>
              <option value="Geneva">Geneva</option>
              <option value="Avenir">Avenir</option>
              <option value="Palatino">Palatino</option>
              <option value="New York">New York</option>
              <option value="Academy Engraved LET">Academy Engraved LET</option>
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
        <div className="options-panel-header">
          <h3 className="options-panel-title">Image Properties</h3>
          <button
            type="button"
            className="options-panel-delete-button"
            onClick={handleDelete}
            title="Delete element"
          >
            <img src="/images/delete_icon.png" alt="Text" className="options-panel-icon" style={{ width: '12px', height: '14px' }} />
          </button>
        </div>

        {/* Center buttons */}
        <div className="options-panel-actions">
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onCenterHorizontal}
            title="Center horizontally"
          >
            <img src="/images/hcenter_icon.png" alt="Text" className="options-panel-icon" />
          </button>
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onCenterVertical}
            title="Center vertically"
          >
            <img src="/images/vcenter_icon.png" alt="Text" className="options-panel-icon" />
          </button>
        </div>

        {/* Flip buttons */}
        <div className="options-panel-actions">
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onFlipHorizontal}
            title="Flip horizontally"
          >
            <img src="/images/hflip_icon.png" alt="Text" className="options-panel-icon" />
          </button>
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onFlipVertical}
            title="Flip vertically"
          >
            <img src="/images/vflip_icon.png" alt="Text" className="options-panel-icon" />
          </button>
        </div>
        
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

          <div className="form-group">
            <label htmlFor="image-color" className="form-label">
              Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                ref={imageColorInputRef}
                id="image-color"
                type="color"
                className="form-input form-input-color"
                value={imageColor}
                onChange={handleImageColorChange}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  onClick={() => imageColorInputRef.current?.click()}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: imageColor,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={`Click to change color tint: ${imageColor}`}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#666' }}>
                  {imageColor.toUpperCase()}
                </span>
              </div>
            </div>
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
