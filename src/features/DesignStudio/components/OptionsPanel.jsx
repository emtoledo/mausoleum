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
  const [charSpacing, setCharSpacing] = useState(0); // Letter spacing in percent

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
      setCharSpacing(0);
      setWidth(0);
      setHeight(0);
      setOpacity(1);
      setImageColor('#000000');
      return;
    }

    // Update based on element type
    if (selectedElement.type === 'text') {
      setContent(selectedElement.get('text') || '');
      const currentFontSize = selectedElement.get('fontSize') || 12;
      setFontSize(currentFontSize);
      setColor(selectedElement.get('fill') || '#000000');
      setFontFamily(selectedElement.get('fontFamily') || 'Arial');
      
      // Convert charSpacing from pixels to percent (relative to fontSize)
      // Fabric.js charSpacing is in pixels, we store as percent
      const charSpacingPx = selectedElement.get('charSpacing') || 0;
      const charSpacingPercent = currentFontSize > 0 ? (charSpacingPx / currentFontSize) * 100 : 0;
      setCharSpacing(charSpacingPercent);
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

  const handleCharSpacingChange = (e) => {
    const newSpacingPercent = Number(e.target.value);
    setCharSpacing(newSpacingPercent);
    
    // Convert percent to pixels (relative to current fontSize)
    const currentFontSize = selectedElement?.get('fontSize') || fontSize;
    const charSpacingPx = (newSpacingPercent / 100) * currentFontSize;
    updateFabricObject('charSpacing', charSpacingPx);
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
    
    // Store canvas reference early - we'll need it for error handling
    const canvas = selectedElement.canvas;
    if (!canvas) {
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
          
          canvas.renderAll();
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
          
          canvas.renderAll();
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
        
        // Convert SVG to data URL (more stable than blob URL)
        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSvg);
        
        // Reload the image with the modified SVG
        let newImg;
        try {
          newImg = await FabricImage.fromURL(svgDataUrl);
          
          if (!newImg) {
            throw new Error('FabricImage.fromURL returned null or undefined');
          }
          
          // Wait for image element to be fully loaded
          if (newImg._element) {
            if (newImg._element.complete === false || !newImg._element.naturalWidth) {
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error('Image load timeout'));
                }, 10000); // Increased timeout for SVG data URLs
                
                const onLoad = () => {
                  clearTimeout(timeout);
                  newImg._element.removeEventListener('load', onLoad);
                  newImg._element.removeEventListener('error', onError);
                  resolve();
                };
                
                const onError = (err) => {
                  clearTimeout(timeout);
                  newImg._element.removeEventListener('load', onLoad);
                  newImg._element.removeEventListener('error', onError);
                  reject(err || new Error('Image load error'));
                };
                
                newImg._element.addEventListener('load', onLoad);
                newImg._element.addEventListener('error', onError);
                
                // If already loaded, resolve immediately
                if (newImg._element.complete && newImg._element.naturalWidth > 0) {
                  onLoad();
                }
              });
            }
          }
          
          // Ensure image has dimensions
          if (newImg.width === 0 || newImg.height === 0) {
            // Wait a bit more for dimensions to be set
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (loadErr) {
          console.error('Failed to load modified SVG image:', loadErr);
          // Fallback to filter approach
          const isOnCanvas = canvas.getObjects().includes(selectedElement);
          if (isOnCanvas) {
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
            
            canvas.renderAll();
          }
          return;
        }
        
        if (!newImg) {
          console.warn('Failed to load new image');
          return;
        }
        
        // Validate that the new image is a proper Fabric.js object
        // Check for required methods and properties
        if (!newImg || 
            typeof newImg.render !== 'function' || 
            typeof newImg.set !== 'function' ||
            typeof newImg.setCoords !== 'function') {
          console.error('New image object is not a valid Fabric.js object', {
            hasRender: typeof newImg?.render === 'function',
            hasSet: typeof newImg?.set === 'function',
            hasSetCoords: typeof newImg?.setCoords === 'function',
            newImgType: typeof newImg,
            newImgConstructor: newImg?.constructor?.name
          });
          // Fallback to filter approach
          const isOnCanvas = canvas.getObjects().includes(selectedElement);
          if (isOnCanvas) {
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
            
            canvas.renderAll();
          }
          return;
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
          elementId: selectedElement.elementId
        };
        
        // Set properties on the new image
        newImg.set(oldProps);
        
        // Ensure the image is properly initialized
        newImg.setCoords();
        
        // Double-check that flip state (negative scaleX/scaleY) is preserved
        // Sometimes set() might normalize values, so we explicitly set them again
        if (selectedElement.scaleX !== undefined) {
          newImg.set('scaleX', selectedElement.scaleX);
        }
        if (selectedElement.scaleY !== undefined) {
          newImg.set('scaleY', selectedElement.scaleY);
        }
        
        // Re-apply coordinates after setting scale to ensure proper bounds
        newImg.setCoords();
        
        // Verify the selected element is still on the canvas before replacing
        // (it might have been removed during resize or other operations)
        const objects = canvas.getObjects();
        const index = objects.indexOf(selectedElement);
        
        if (index === -1) {
          console.warn('Selected element not found in canvas objects, cannot replace');
          // Element was removed, so we can't replace it - just add the new one
          newImg.canvas = canvas;
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.renderAll();
          
          if (onUpdateElement) {
            onUpdateElement(newImg);
          }
          return;
        }
        
        // Double-check the new image is still valid before removing the old one
        if (typeof newImg.render !== 'function' || 
            typeof newImg.set !== 'function' ||
            typeof newImg.setCoords !== 'function') {
          console.error('New image is not a valid Fabric.js object, aborting replacement');
          // Don't remove the old element, just abort
          return;
        }
        
        // Store reference to old element's properties in case we need them
        // But don't try to restore it once removed (removed objects lose their methods)
        const oldElementIndex = index;
        
        // Remove the old image
        try {
          canvas.remove(selectedElement);
        } catch (removeErr) {
          console.error('Error removing old image:', removeErr);
          // If removal fails, abort - don't try to add new one
          return;
        }
        
        // Don't manually set canvas reference - let Fabric.js handle it
        // First, clean up any invalid objects that might be on the canvas
        const allObjectsBeforeAdd = canvas.getObjects();
        const validObjectsBeforeAdd = allObjectsBeforeAdd.filter(obj => 
          obj && 
          typeof obj.render === 'function' &&
          typeof obj.set === 'function' &&
          typeof obj.setCoords === 'function'
        );
        
        // Clean up invalid objects before adding new one
        if (validObjectsBeforeAdd.length !== allObjectsBeforeAdd.length) {
          console.warn('Found invalid objects before adding new image, cleaning up');
          canvas._objects = validObjectsBeforeAdd;
        }
        
        // Add the new image to canvas (Fabric.js will set canvas reference automatically)
        try {
          // Use add() first to properly initialize the object
          canvas.add(newImg);
          
          // Ensure coordinates are set immediately after adding
          newImg.setCoords();
          
          // Skip z-order adjustment to avoid issues with invalid objects
          // The object is already added and functional - z-order is not critical
          // Attempting insertAt can cause errors if any objects on canvas are invalid
          // So we'll just leave it at the end (which is fine for functionality)
          
          // Final validation before rendering
          const allObjectsBeforeRender = canvas.getObjects();
          const validObjectsBeforeRender = allObjectsBeforeRender.filter(obj => 
            obj && 
            typeof obj.render === 'function' &&
            typeof obj.set === 'function' &&
            typeof obj.setCoords === 'function'
          );
          
          // If there are invalid objects, clean them up before rendering
          if (validObjectsBeforeRender.length !== allObjectsBeforeRender.length) {
            console.warn('Found invalid objects before render, cleaning up');
            canvas._objects = validObjectsBeforeRender;
          }
          
          // Set as active object (only if it's valid)
          if (validObjectsBeforeRender.includes(newImg)) {
            canvas.setActiveObject(newImg);
          }
          
          // Render the canvas
          canvas.renderAll();
        } catch (addErr) {
          console.error('Error adding new image to canvas:', addErr);
          
          // Clean up invalid objects before attempting to render
          const cleanupAndRender = () => {
            try {
              // Get all objects and filter out invalid ones
              const allObjects = canvas.getObjects();
              const validObjects = [];
              const invalidObjects = [];
              
              allObjects.forEach((obj, idx) => {
                // Check if object is valid
                if (obj && 
                    obj !== newImg && // Exclude the failed new image
                    typeof obj.render === 'function' &&
                    typeof obj.set === 'function' &&
                    typeof obj.setCoords === 'function') {
                  validObjects.push(obj);
                } else {
                  invalidObjects.push({ obj, idx });
                }
              });
              
              // Remove invalid objects using direct array manipulation
              // (can't use canvas.remove() because invalid objects don't have required methods)
              if (invalidObjects.length > 0) {
                console.warn(`Cleaning up ${invalidObjects.length} invalid objects using direct array manipulation`);
                // Use direct array manipulation to avoid calling methods on invalid objects
                canvas._objects = validObjects;
              }
              
              // Now try to render
              canvas.renderAll();
            } catch (cleanupErr) {
              console.error('Could not clean up and render canvas:', cleanupErr);
              // Absolute last resort: clear and rebuild
              try {
                const finalObjects = canvas.getObjects().filter(obj => 
                  obj && 
                  typeof obj === 'object' &&
                  'render' in obj &&
                  typeof obj.render === 'function'
                );
                canvas._objects = finalObjects;
                canvas.renderAll();
              } catch (finalErr) {
                console.error('Complete canvas recovery failed:', finalErr);
              }
            }
          };
          
          // Clean up and render (this will handle removing the failed newImg)
          cleanupAndRender();
        }
        
        if (onUpdateElement) {
          onUpdateElement(newImg);
        }
      } catch (err) {
        console.error('Error changing SVG color:', err);
        // Fallback: try BlendColor filter
        // Check if element is still on canvas (might have been removed)
        const isOnCanvas = canvas.getObjects().includes(selectedElement);
        if (isOnCanvas) {
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
            
            // Store color in customData
            const customData = selectedElement.customData || {};
            const updatedCustomData = {
              ...customData,
              currentColor: newColor
            };
            selectedElement.set('customData', updatedCustomData);
            
            canvas.renderAll();
          } catch (filterErr) {
            console.warn('Could not apply color filter:', filterErr);
          }
        } else {
          console.warn('Selected element no longer on canvas, cannot apply fallback filter');
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
            <label htmlFor="text-font-family" className="form-label">
              Font
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

          <div className="form-group">
            <label htmlFor="text-font-size" className="form-label">
              Size
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
            <label htmlFor="text-char-spacing" className="form-label">
              Letter Spacing
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                id="text-char-spacing"
                type="number"
                className="form-input"
                value={charSpacing}
                onChange={handleCharSpacingChange}
                min="-50"
                max="200"
                step="1"
                style={{ width: '70px' }}
              />
              <span style={{ fontSize: '14px', color: '#666', minWidth: '30px' }}>%</span>
            </div>
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
