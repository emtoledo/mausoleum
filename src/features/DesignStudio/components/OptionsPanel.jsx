/**
 * OptionsPanel Component
 * 
 * Contextual properties panel for editing selected design elements.
 * Provides two-way data binding between React state and Fabric.js objects.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { FabricImage } from 'fabric';
import { pixelsToInches, inchesToPixels, calculateScale } from '../utils/unitConverter';
import { colorData } from '../../../data/ColorData';
import { artwork } from '../../../data/ArtworkData';

/**
 * @param {fabric.Object} selectedElement - Currently selected Fabric.js object
 * @param {Function} onUpdateElement - Optional callback when element is modified
 * @param {Function} onDeleteElement - Callback when element should be deleted
 * @param {Function} onCenterHorizontal - Callback to center object horizontally
 * @param {Function} onCenterVertical - Callback to center object vertically
 * @param {Function} onFlipHorizontal - Callback to flip object horizontally
 * @param {Function} onFlipVertical - Callback to flip object vertically
 * @param {Function} onBringToFront - Callback to bring object to front of z-index stack
 * @param {Function} onSendToBack - Callback to send object to back of z-index stack
 * @param {number} realWorldWidth - Real world width in inches for scale calculations
 * @param {Object} canvasSize - Canvas size in pixels {width, height}
 * @returns {JSX.Element}
 */
const OptionsPanel = ({ selectedElement, onUpdateElement, onDeleteElement, onCenterHorizontal, onCenterVertical, onFlipHorizontal, onFlipVertical, onBringToFront, onSendToBack, realWorldWidth = 24, canvasSize = { width: 800 }, initialData = null }) => {
  // Text properties state
  const [content, setContent] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [selectedColorId, setSelectedColorId] = useState(null); // Selected color from ColorData
  const [fontFamily, setFontFamily] = useState('Arial');
  const [charSpacing, setCharSpacing] = useState(0); // Letter spacing in percent
  const [lineHeight, setLineHeight] = useState(100); // Line height in percent
  const [textAlign, setTextAlign] = useState('left'); // Text alignment

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
      setLineHeight(100);
      setTextAlign('left');
      setSelectedColorId(null);
      setWidth(0);
      setHeight(0);
      setOpacity(1);
      setImageColor('#000000');
      return;
    }

    // Update based on element type
    if (selectedElement.type === 'text' || selectedElement.type === 'i-text' || selectedElement.type === 'itext') {
      setContent(selectedElement.get('text') || '');
      // Calculate effective font size accounting for scale (when text is resized via handles)
      const baseFontSizePx = selectedElement.get('fontSize') || 12;
      const scaleY = selectedElement.get('scaleY') || 1;
      const currentFontSizePx = baseFontSizePx * scaleY;
      
      // Convert font size from pixels to inches for display
      // Use fixed canvas width (1000px) for consistent scale calculation
      let fontSizeInches = 12; // default fallback
      try {
        const FIXED_CANVAS_WIDTH = 1000; // Fixed canvas width for consistent scaling
        const scale = calculateScale(realWorldWidth, FIXED_CANVAS_WIDTH);
        fontSizeInches = pixelsToInches(currentFontSizePx, scale);
      } catch (error) {
        console.warn('Could not convert font size to inches:', error);
        // Fallback to pixel value if conversion fails
        fontSizeInches = currentFontSizePx;
      }
      
      setFontSize(fontSizeInches);
      const currentFill = selectedElement.get('fill') || '#000000';
      const currentOpacity = selectedElement.get('opacity') ?? 1;
      const currentStroke = selectedElement.get('stroke') || null;
      setColor(currentFill);
      
      // Try to match current color/opacity/stroke to a ColorData entry
      const matchedColor = colorData.find(c => {
        const fillMatch = c.fillColor.toLowerCase() === currentFill.toLowerCase();
        const opacityMatch = Math.abs(c.opacity - currentOpacity) < 0.01;
        const strokeMatch = !c.strokeWidth || c.strokeWidth === 0 
          ? (!currentStroke || currentStroke === 'transparent')
          : (c.strokeColor.toLowerCase() === (currentStroke || '').toLowerCase());
        return fillMatch && opacityMatch && strokeMatch;
      });
      setSelectedColorId(matchedColor ? matchedColor.id : null);
      
      setFontFamily(selectedElement.get('fontFamily') || 'Arial');
      setTextAlign(selectedElement.get('textAlign') || 'left');
      
      // Convert charSpacing from pixels to percent (relative to base fontSize, not scaled)
      // Fabric.js charSpacing is in pixels, we store as percent
      const charSpacingPx = selectedElement.get('charSpacing') || 0;
      const charSpacingPercent = baseFontSizePx > 0 ? (charSpacingPx / baseFontSizePx) * 100 : 0;
      setCharSpacing(charSpacingPercent);
      
      // Convert lineHeight from multiplier to percent
      // Fabric.js lineHeight is a multiplier (e.g., 1.2 = 120%), we store as percent
      // Fabric.js default is 1.15 (115%), but we'll normalize it to 100% as the default
      const lineHeightMultiplier = selectedElement.get('lineHeight');
      // If lineHeight is close to Fabric's default (1.15) or undefined, normalize to 1.0 (100%)
      if (lineHeightMultiplier === undefined || Math.abs(lineHeightMultiplier - 1.15) < 0.01) {
        // Set it to 1.0 in Fabric.js to match our UI default of 100%
        selectedElement.set('lineHeight', 1.0);
        setLineHeight(100);
      } else {
        const lineHeightPercent = lineHeightMultiplier * 100;
        setLineHeight(lineHeightPercent);
      }
    } else if (selectedElement.type === 'image' || selectedElement.type === 'group' || selectedElement.type === 'path') {
      // Calculate effective dimensions accounting for scale (when artwork is resized via handles)
      const baseWidthPx = selectedElement.get('width') || 0;
      const baseHeightPx = selectedElement.get('height') || 0;
      const scaleX = selectedElement.get('scaleX') || 1;
      const scaleY = selectedElement.get('scaleY') || 1;
      const effectiveWidthPx = baseWidthPx * scaleX;
      const effectiveHeightPx = baseHeightPx * scaleY;
      
      // Convert dimensions from pixels to inches for display
      let widthInches = 0;
      let heightInches = 0;
      try {
        const canvasWidth = canvasSize.width || (selectedElement.canvas?.width || 800);
        const scale = calculateScale(realWorldWidth, canvasWidth);
        widthInches = pixelsToInches(effectiveWidthPx, scale);
        heightInches = pixelsToInches(effectiveHeightPx, scale);
      } catch (error) {
        console.warn('Could not convert dimensions to inches:', error);
        // Fallback to pixel values if conversion fails
        widthInches = effectiveWidthPx;
        heightInches = effectiveHeightPx;
      }
      
      setWidth(widthInches);
      setHeight(heightInches);
      setOpacity(selectedElement.get('opacity') || 1);
      
      // Get color from customData (stored when color was changed)
      const customData = selectedElement.customData || {};
      const currentFill = customData.currentColor || '#000000';
      const currentOpacity = selectedElement.get('opacity') ?? 1;
      const currentStroke = selectedElement.get('stroke') || null;
      const currentStrokeWidth = selectedElement.get('strokeWidth') || 0;
      setImageColor(currentFill);
      
      // Try to match current color/opacity/stroke to a ColorData entry
      const matchedColor = colorData.find(c => {
        const fillMatch = c.fillColor.toLowerCase() === currentFill.toLowerCase();
        const opacityMatch = Math.abs(c.opacity - currentOpacity) < 0.01;
        const strokeMatch = !c.strokeWidth || c.strokeWidth === 0 
          ? (!currentStroke || currentStroke === 'transparent' || currentStrokeWidth === 0)
          : (c.strokeColor.toLowerCase() === (currentStroke || '').toLowerCase() && 
             Math.abs(c.strokeWidth - currentStrokeWidth) < 0.01);
        return fillMatch && opacityMatch && strokeMatch;
      });
      setSelectedColorId(matchedColor ? matchedColor.id : null);
    }
  }, [selectedElement, realWorldWidth, canvasSize]);

  /**
   * Listen for object modifications (resizing) to update font size display
   */
  useEffect(() => {
    if (!selectedElement || (selectedElement.type !== 'text' && selectedElement.type !== 'i-text' && selectedElement.type !== 'itext') || !selectedElement.canvas) {
      return;
    }

    const canvas = selectedElement.canvas;
    
    const handleObjectModified = (e) => {
      const modifiedObject = e.target;
      
      // Only update if the modified object is the currently selected text object
      if (modifiedObject === selectedElement && (modifiedObject.type === 'text' || modifiedObject.type === 'i-text' || modifiedObject.type === 'itext')) {
        // When text is resized, Fabric.js uses scaleX/scaleY, not fontSize directly
        // Calculate effective font size: fontSize * scaleY (height is typically what matters for text)
        const baseFontSizePx = modifiedObject.get('fontSize') || 12;
        const scaleY = modifiedObject.get('scaleY') || 1;
        const effectiveFontSizePx = baseFontSizePx * scaleY;
        
        // Convert effective font size from pixels to inches for display
        // Use fixed canvas width (1000px) for consistent scale calculation
        try {
          const FIXED_CANVAS_WIDTH = 1000; // Fixed canvas width for consistent scaling
          const scale = calculateScale(realWorldWidth, FIXED_CANVAS_WIDTH);
          const fontSizeInches = pixelsToInches(effectiveFontSizePx, scale);
          setFontSize(fontSizeInches);
        } catch (error) {
          console.warn('Could not convert font size to inches after modification:', error);
        }
      }
    };

    // Listen for object modification events
    canvas.on('object:modified', handleObjectModified);

    // Cleanup: remove event listener
    return () => {
      canvas.off('object:modified', handleObjectModified);
    };
  }, [selectedElement, realWorldWidth, canvasSize]);

  /**
   * Listen for object modifications (resizing) to update width/height display for artwork
   */
  useEffect(() => {
    if (!selectedElement || 
        (selectedElement.type !== 'image' && selectedElement.type !== 'group' && selectedElement.type !== 'path') ||
        !selectedElement.canvas) {
      return;
    }

    const canvas = selectedElement.canvas;
    
    const handleObjectModified = (e) => {
      const modifiedObject = e.target;
      
      // Only update if the modified object is the currently selected artwork object
      if (modifiedObject === selectedElement && 
          (modifiedObject.type === 'image' || modifiedObject.type === 'group' || modifiedObject.type === 'path')) {
        // When artwork is resized, Fabric.js uses scaleX/scaleY
        // Calculate effective dimensions: base * scale
        const baseWidthPx = modifiedObject.get('width') || 0;
        const baseHeightPx = modifiedObject.get('height') || 0;
        const scaleX = modifiedObject.get('scaleX') || 1;
        const scaleY = modifiedObject.get('scaleY') || 1;
        const effectiveWidthPx = baseWidthPx * scaleX;
        const effectiveHeightPx = baseHeightPx * scaleY;
        
        // Convert effective dimensions from pixels to inches for display
        try {
          const canvasWidth = canvasSize.width || (canvas.width || 800);
          const scale = calculateScale(realWorldWidth, canvasWidth);
          const widthInches = pixelsToInches(effectiveWidthPx, scale);
          const heightInches = pixelsToInches(effectiveHeightPx, scale);
          setWidth(widthInches);
          setHeight(heightInches);
        } catch (error) {
          console.warn('Could not convert dimensions to inches after modification:', error);
        }
      }
    };

    // Listen for object modification events
    canvas.on('object:modified', handleObjectModified);

    // Cleanup: remove event listener
    return () => {
      canvas.off('object:modified', handleObjectModified);
    };
  }, [selectedElement, realWorldWidth, canvasSize]);

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
    const newSizeInches = Number(e.target.value);
    setFontSize(newSizeInches);
    
    // Convert from inches to pixels
    try {
      const canvasWidth = canvasSize.width || (selectedElement?.canvas?.width || 800);
      const scale = calculateScale(realWorldWidth, canvasWidth);
      const newSizePx = inchesToPixels(newSizeInches, scale);
      updateFabricObject('fontSize', newSizePx);
    } catch (error) {
      console.warn('Could not convert font size from inches to pixels:', error);
      // Fallback to using the value as pixels if conversion fails
      updateFabricObject('fontSize', newSizeInches);
    }
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    updateFabricObject('fill', newColor);
  };

  const handleColorSwatchSelect = async (colorItem) => {
    setSelectedColorId(colorItem.id);
    setColor(colorItem.fillColor);
    
    if (!selectedElement) {
      console.warn('No selectedElement, returning early');
      return;
    }
    
    // For images/artwork/groups/paths, use the same color change logic
    if (selectedElement.type === 'image' || selectedElement.type === 'group' || selectedElement.type === 'path') {
      const canvas = selectedElement.canvas;
      if (!canvas) {
        console.warn('No canvas available for image color change');
        return;
      }
      
      // Store the current active object before color change
      const currentActiveObject = canvas.getActiveObject();
      
      // Check if this is panel artwork BEFORE determining handler
      // Try multiple sources: customData.category, artwork lookup, direct property, or ID pattern
      const artworkId = selectedElement.customData?.artworkId || selectedElement.artworkId;
      
      // Look up artwork item with more robust matching (handle whitespace/trimming)
      let artworkItem = null;
      if (artworkId) {
        const trimmedId = typeof artworkId === 'string' ? artworkId.trim() : artworkId;
        artworkItem = artwork.find(a => {
          const aId = a.id ? String(a.id).trim() : '';
          return aId === trimmedId || aId.toLowerCase() === String(trimmedId).toLowerCase();
        });
      }
      
      const category = selectedElement.customData?.category || 
                       selectedElement.category || 
                       artworkItem?.category || 
                       '';
      
      // Check if it's panel artwork: by category OR by ID pattern (panel artwork IDs often start with 'panel')
      const isPanelArtwork = Boolean(
        (category && category.toLowerCase() === 'panels') ||
        (artworkId && typeof artworkId === 'string' && artworkId.toLowerCase().startsWith('panel'))
      );
      
      // For groups and paths (SVG artwork), apply color/stroke directly
      // Panel artwork with texture layer is a group, so it should go through this path
      if (selectedElement.type === 'group' || selectedElement.type === 'path') {
        // PRESERVE POSITION: Store exact position AND center point before any modifications
        // When bounds change (e.g., removing stroke), the center point is more stable than left/top
        selectedElement.setCoords(); // Ensure coords are up to date before capturing
        
        // Calculate center point in canvas coordinates (this is stable even when bounds change)
        const centerPoint = selectedElement.getCenterPoint();
        const preservedCenter = {
          x: centerPoint.x,
          y: centerPoint.y
        };
        
        // Also preserve all position properties
        const preservedPosition = {
          left: selectedElement.left,
          top: selectedElement.top,
          scaleX: selectedElement.scaleX || 1,
          scaleY: selectedElement.scaleY || 1,
          angle: selectedElement.angle || 0,
          originX: selectedElement.originX || 'center',
          originY: selectedElement.originY || 'center',
          flipX: selectedElement.flipX || false,
          flipY: selectedElement.flipY || false,
          centerX: preservedCenter.x,
          centerY: preservedCenter.y
        };
        
        
        // For panel artwork, use panelStrokeWidth (always 0) instead of strokeWidth
        // For non-panel artwork, use strokeWidth from ColorData
        const effectiveStrokeWidth = isPanelArtwork 
          ? (colorItem.panelStrokeWidth !== undefined ? colorItem.panelStrokeWidth : 0)
          : colorItem.strokeWidth;
        
        // Check if this is a group with a texture layer
        // Texture layer groups have 2 children: [textureLayer, originalGroup]
        // For panel artwork, texture layer is an Image, not a pattern fill
        let targetGroup = selectedElement;
        
        if (selectedElement.type === 'group' && selectedElement._objects && selectedElement._objects.length === 2) {
          const firstChild = selectedElement._objects[0];
          // Check for pattern fill OR image type (panel artwork uses Image for texture)
          const hasPatternFill = firstChild.fill && typeof firstChild.fill === 'object' && firstChild.fill.type === 'pattern';
          const isTextureImage = firstChild.type === 'image';
          
          if (hasPatternFill || isTextureImage) {
            // This is a texture layer group - apply color only to the original group (second child)
            targetGroup = selectedElement._objects[1];
          }
        }
        
        // Temporarily disable object caching to prevent bounds recalculation issues
        const originalObjectCaching = selectedElement.objectCaching;
        selectedElement.set('objectCaching', false);
        
        // Also disable caching on target group if it's different
        let targetOriginalCaching = null;
        if (targetGroup !== selectedElement && targetGroup.set) {
          targetOriginalCaching = targetGroup.objectCaching;
          targetGroup.set('objectCaching', false);
        }
        
        // Apply color - for panel artwork, ALWAYS treat strokeWidth as 0 regardless of ColorData
        // For panel artwork, ONLY modify fill and opacity - NEVER touch stroke properties
        const applyColorToGroup = (obj) => {
          if (obj.type === 'group' && obj._objects) {
            obj._objects.forEach(child => applyColorToGroup(child));
          } else if (obj.type === 'path') {
            if (isPanelArtwork) {
              // PANEL ARTWORK: Only modify fill and opacity - NEVER touch stroke
              // Even if ColorData has strokeWidth > 0, we ignore it completely for panel artwork
              // This prevents ANY bounds recalculation that could cause position shifts
              
              // CRITICAL: For panel artwork, ALWAYS use panelStrokeWidth (always 0) instead of strokeWidth
              const panelStroke = colorItem.panelStrokeWidth !== undefined ? colorItem.panelStrokeWidth : 0;
              
              // Force stroke to null/0 directly (without set()) to avoid triggering bounds recalculation
              // Use panelStrokeWidth from ColorData, which is always 0 for panel artwork
              obj.stroke = null;
              obj.strokeWidth = panelStroke; // Always 0 for panel artwork
              
              // Verify strokeWidth was set correctly (safety check)
              if (obj.strokeWidth !== 0) {
                obj.strokeWidth = 0;
              }
              
              // Now modify fill and opacity - stroke is already guaranteed to be null/0
              obj.fill = colorItem.fillColor;
              obj.opacity = colorItem.opacity;
              
              // Mark as dirty for re-render
              obj.dirty = true;
            } else {
              // NON-PANEL ARTWORK: Use set() with all properties including stroke
              // Honor the strokeWidth from ColorData for non-panel artwork
              const pathProps = {
                fill: colorItem.fillColor,
                opacity: colorItem.opacity
              };
              
              // Use effectiveStrokeWidth which respects ColorData for non-panel artwork
              if (effectiveStrokeWidth > 0) {
                pathProps.stroke = colorItem.strokeColor;
                pathProps.strokeWidth = effectiveStrokeWidth;
              } else {
                pathProps.stroke = null;
                pathProps.strokeWidth = 0;
              }
              
              obj.set(pathProps);
            }
          }
        };
        
        // Apply color to the target group (color group within texture layer group)
        applyColorToGroup(targetGroup);
        
        // CRITICAL: For panel artwork, restore exact position IMMEDIATELY after modifications
        // Use direct property assignment instead of set() to avoid triggering bounds recalculation
        if (isPanelArtwork) {
          // Restore exact position using direct property assignment (not set())
          // This prevents Fabric.js from triggering bounds recalculation
          selectedElement.left = preservedPosition.left;
          selectedElement.top = preservedPosition.top;
          selectedElement.scaleX = preservedPosition.scaleX;
          selectedElement.scaleY = preservedPosition.scaleY;
          selectedElement.angle = preservedPosition.angle;
          selectedElement.originX = preservedPosition.originX;
          selectedElement.originY = preservedPosition.originY;
          
          // Verify position was restored correctly and restore if needed
          const positionDrift = Math.abs(selectedElement.left - preservedPosition.left) > 0.01 ||
                               Math.abs(selectedElement.top - preservedPosition.top) > 0.01;
          
          if (positionDrift) {
            // Force restore again if there was drift
            selectedElement.left = preservedPosition.left;
            selectedElement.top = preservedPosition.top;
          }
          
          // Don't call setCoords() - it might trigger bounds recalculation
          // Just mark as dirty and let render handle it
        }
        
        // Mark groups as dirty to trigger re-render
        targetGroup.dirty = true;
        selectedElement.dirty = true;
        
        // Restore object caching
        selectedElement.set('objectCaching', originalObjectCaching);
        if (targetGroup !== selectedElement && targetGroup.set && targetOriginalCaching !== null) {
          targetGroup.set('objectCaching', targetOriginalCaching);
        }
        
        // For panel artwork, verify position was preserved and restore if needed
        if (isPanelArtwork) {
          const finalLeft = selectedElement.left;
          const finalTop = selectedElement.top;
          const leftDrift = Math.abs(finalLeft - preservedPosition.left);
          const topDrift = Math.abs(finalTop - preservedPosition.top);
          
          if (leftDrift > 0.01 || topDrift > 0.01) {
            // Force restore position if there was drift
            selectedElement.left = preservedPosition.left;
            selectedElement.top = preservedPosition.top;
          }
        }
        
        // Update customData on the parent group (for texture layer groups) or the element itself
        // CRITICAL: For panel artwork, ALWAYS store strokeWidth as 0 in customData, regardless of ColorData
        const customData = selectedElement.customData || {};
        customData.currentColor = colorItem.fillColor;
        customData.currentColorId = colorItem.id;
        customData.currentOpacity = colorItem.opacity;
        
        // For panel artwork, NEVER store strokeWidth > 0 in customData - always store 0
        // This ensures that even if ColorData has strokeWidth > 0, panel artwork always uses 0
        if (isPanelArtwork) {
          customData.currentStrokeColor = null;
          customData.currentStrokeWidth = 0; // ALWAYS 0 for panel artwork
        } else {
          customData.currentStrokeColor = colorItem.strokeColor;
          customData.currentStrokeWidth = effectiveStrokeWidth;
        }
        
        selectedElement.set('customData', customData);
        setImageColor(colorItem.fillColor);
        setOpacity(colorItem.opacity);
        
        canvas.renderAll();
        
        if (onUpdateElement) {
          onUpdateElement(selectedElement);
        }
        return;
      }
      
      // For images (non-group, non-path), use the existing image color change handler logic
      // IMPORTANT: Panel artwork with texture layer is a GROUP, not an image, so it should
      // have been handled in the group/path branch above. This branch is only for standalone images.
      if (selectedElement.type === 'image') {
        // PRESERVE POSITION: Store exact position before any modifications
        const preservedPosition = {
          left: selectedElement.left,
          top: selectedElement.top,
          scaleX: selectedElement.scaleX || 1,
          scaleY: selectedElement.scaleY || 1,
          angle: selectedElement.angle || 0,
          originX: selectedElement.originX || 'center',
          originY: selectedElement.originY || 'center',
          flipX: selectedElement.flipX || false,
          flipY: selectedElement.flipY || false
        };
        
        
        // Check if this is panel artwork - panel artwork should have no stroke
        const artworkId = selectedElement.customData?.artworkId || selectedElement.artworkId;
        
        // Look up artwork item with more robust matching (handle whitespace/trimming)
        let artworkItem = null;
        if (artworkId) {
          const trimmedId = typeof artworkId === 'string' ? artworkId.trim() : artworkId;
          artworkItem = artwork.find(a => {
            const aId = a.id ? String(a.id).trim() : '';
            return aId === trimmedId || aId.toLowerCase() === String(trimmedId).toLowerCase();
          });
        }
        
        // Use case-insensitive check for consistency
        const category = artworkItem?.category || selectedElement.customData?.category || selectedElement.category || '';
        const isPanelArtwork = Boolean(
          (category && category.toLowerCase() === 'panels') ||
          (artworkId && typeof artworkId === 'string' && artworkId.toLowerCase().startsWith('panel'))
        );
        
        // For panel artwork, use panelStrokeWidth (always 0) instead of strokeWidth
        // For non-panel artwork, use strokeWidth from ColorData
        const effectiveStrokeWidth = isPanelArtwork 
          ? (colorItem.panelStrokeWidth !== undefined ? colorItem.panelStrokeWidth : 0)
          : colorItem.strokeWidth;
        
        // For images, use the existing image color change handler logic
        await handleImageColorChange({ target: { value: colorItem.fillColor } });
        
        // After handleImageColorChange, the image may have been replaced
        // Get the currently active object (which should be the new/replaced image)
        let targetElement = canvas.getActiveObject();
        
        // If no active object, try to find the image we just modified
        if (!targetElement) {
          // Find the most recently added image object
          const objects = canvas.getObjects();
          const imageObjects = objects.filter(obj => obj.type === 'image');
          if (imageObjects.length > 0) {
            targetElement = imageObjects[imageObjects.length - 1];
            canvas.setActiveObject(targetElement);
          } else {
            // Fallback to original selectedElement if still on canvas
            if (canvas.getObjects().includes(selectedElement)) {
              targetElement = selectedElement;
            } else {
              console.warn('Could not find target element after color change');
              return;
            }
          }
        }
        
        // RESTORE POSITION: After handleImageColorChange may have replaced the image
        // Restore exact position to prevent any drift
        if (targetElement && targetElement !== selectedElement) {
          targetElement.set({
            left: preservedPosition.left,
            top: preservedPosition.top,
            scaleX: preservedPosition.scaleX,
            scaleY: preservedPosition.scaleY,
            angle: preservedPosition.angle,
            originX: preservedPosition.originX,
            originY: preservedPosition.originY,
            flipX: preservedPosition.flipX,
            flipY: preservedPosition.flipY
          });
          targetElement.setCoords();
          
          // Verify position was preserved
          const currentLeft = targetElement.left;
          const currentTop = targetElement.top;
          if (Math.abs(currentLeft - preservedPosition.left) > 0.01 || 
              Math.abs(currentTop - preservedPosition.top) > 0.01) {
            console.warn('Position drift detected for image, restoring:', {
              expected: { left: preservedPosition.left, top: preservedPosition.top },
              actual: { left: currentLeft, top: currentTop }
            });
            targetElement.set({
              left: preservedPosition.left,
              top: preservedPosition.top
            });
            targetElement.setCoords();
          }
        }
        
        // Apply opacity from ColorData to the target element
        targetElement.set('opacity', colorItem.opacity);
        setOpacity(colorItem.opacity); // Update local state for UI
        
        // Apply stroke if specified (but not for panel artwork)
        if (effectiveStrokeWidth > 0) {
          targetElement.set('stroke', colorItem.strokeColor);
          targetElement.set('strokeWidth', effectiveStrokeWidth);
        } else {
          targetElement.set('stroke', null);
          targetElement.set('strokeWidth', 0);
        }
        
        // Update customData with color info
        const customData = targetElement.customData || {};
        customData.currentColor = colorItem.fillColor;
        customData.currentColorId = colorItem.id;
        customData.currentOpacity = colorItem.opacity; // Store opacity in customData
        customData.currentStrokeColor = colorItem.strokeColor;
        customData.currentStrokeWidth = effectiveStrokeWidth; // Use effective stroke width
        targetElement.set('customData', customData);
        setImageColor(colorItem.fillColor);
        
        // Ensure the element is selected and rendered
        canvas.setActiveObject(targetElement);
        canvas.renderAll();
        
        if (onUpdateElement) {
          onUpdateElement(targetElement);
        }
        return;
      }
    }
    
    // For text objects, apply fill, opacity, and stroke
    selectedElement.set('fill', colorItem.fillColor);
    selectedElement.set('opacity', colorItem.opacity);
    
    // Apply stroke if specified
    if (colorItem.strokeWidth > 0) {
      selectedElement.set('stroke', colorItem.strokeColor);
      selectedElement.set('strokeWidth', colorItem.strokeWidth);
    } else {
      selectedElement.set('stroke', null);
      selectedElement.set('strokeWidth', 0);
    }
    
    // Update customData with color info for text objects (so it's saved correctly)
    const customData = selectedElement.customData || {};
    customData.currentColor = colorItem.fillColor;
    customData.currentColorId = colorItem.id;
    customData.currentOpacity = colorItem.opacity;
    customData.currentStrokeColor = colorItem.strokeColor;
    customData.currentStrokeWidth = colorItem.strokeWidth || 0;
    selectedElement.set('customData', customData);
    
    console.log('Text color updated:', {
      fill: colorItem.fillColor,
      customData: customData,
      elementFill: selectedElement.get('fill')
    });
    
    if (selectedElement.canvas) {
      selectedElement.canvas.renderAll();
    }
    
    if (onUpdateElement) {
      onUpdateElement(selectedElement);
    }
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

  const handleLineHeightChange = (e) => {
    const newLineHeightPercent = Number(e.target.value);
    setLineHeight(newLineHeightPercent);
    
    // Convert percent to multiplier (Fabric.js expects multiplier, e.g., 1.2 for 120%)
    const lineHeightMultiplier = newLineHeightPercent / 100;
    updateFabricObject('lineHeight', lineHeightMultiplier);
  };

  const handleTextAlignChange = (e) => {
    const newAlign = e.target.value;
    setTextAlign(newAlign);
    updateFabricObject('textAlign', newAlign);
  };

  // Image property handlers
  const handleWidthChange = (e) => {
    const newWidthInches = Number(e.target.value);
    setWidth(newWidthInches);
    
    if (!selectedElement || !selectedElement.canvas) return;
    
    // Convert inches to pixels
    try {
      const canvasWidth = canvasSize.width || (selectedElement.canvas.width || 800);
      const scale = calculateScale(realWorldWidth, canvasWidth);
      const newWidthPx = inchesToPixels(newWidthInches, scale);
      
      // Calculate scale factor based on base width
      const baseWidthPx = selectedElement.get('width') || 1;
      const newScaleX = baseWidthPx > 0 ? newWidthPx / baseWidthPx : 1;
      
      // Update scaleX to achieve the desired width
      selectedElement.set('scaleX', newScaleX);
      selectedElement.setCoords();
      selectedElement.canvas.renderAll();
      
      if (onUpdateElement) {
        onUpdateElement(selectedElement);
      }
    } catch (error) {
      console.warn('Could not convert width from inches to pixels:', error);
      // Fallback to direct pixel value
      updateFabricObject('width', newWidthInches);
    }
  };

  const handleHeightChange = (e) => {
    const newHeightInches = Number(e.target.value);
    setHeight(newHeightInches);
    
    if (!selectedElement || !selectedElement.canvas) return;
    
    // Convert inches to pixels
    try {
      const canvasWidth = canvasSize.width || (selectedElement.canvas.width || 800);
      const scale = calculateScale(realWorldWidth, canvasWidth);
      const newHeightPx = inchesToPixels(newHeightInches, scale);
      
      // Calculate scale factor based on base height
      const baseHeightPx = selectedElement.get('height') || 1;
      const newScaleY = baseHeightPx > 0 ? newHeightPx / baseHeightPx : 1;
      
      // Update scaleY to achieve the desired height
      selectedElement.set('scaleY', newScaleY);
      selectedElement.setCoords();
      selectedElement.canvas.renderAll();
      
      if (onUpdateElement) {
        onUpdateElement(selectedElement);
      }
    } catch (error) {
      console.warn('Could not convert height from inches to pixels:', error);
      // Fallback to direct pixel value
      updateFabricObject('height', newHeightInches);
    }
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
        
        // Check if this is panel artwork - panel artwork should have no stroke
        const artworkId = customData.artworkId;
        
        // Look up artwork item with more robust matching (handle whitespace/trimming)
        let artworkItem = null;
        if (artworkId) {
          const trimmedId = typeof artworkId === 'string' ? artworkId.trim() : artworkId;
          artworkItem = artwork.find(a => {
            const aId = a.id ? String(a.id).trim() : '';
            return aId === trimmedId || aId.toLowerCase() === String(trimmedId).toLowerCase();
          });
        }
        
        // Use case-insensitive check for consistency
        const category = artworkItem?.category || customData.category || '';
        const isPanelArtwork = Boolean(
          (category && category.toLowerCase() === 'panels') ||
          (artworkId && typeof artworkId === 'string' && artworkId.toLowerCase().startsWith('panel'))
        );
        
        // Function to recursively set fill on all elements and remove strokes for panel artwork
        const setFillRecursive = (element, color) => {
          // Skip text, style, script, and other non-visual elements
          const tagName = element.tagName?.toLowerCase();
          if (tagName === 'style' || tagName === 'script' || tagName === 'defs') {
            return;
          }
          
          // For panel artwork, ALWAYS remove all strokes regardless of ColorData
          if (isPanelArtwork) {
            element.removeAttribute('stroke');
            element.setAttribute('stroke-width', '0');
            element.setAttribute('strokeWidth', '0');
            // Also set stroke to 'none' explicitly
            element.setAttribute('stroke', 'none');
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
        // Get exact position values before any operations
        const oldLeft = selectedElement.left;
        const oldTop = selectedElement.top;
        const oldScaleX = selectedElement.scaleX || 1;
        const oldScaleY = selectedElement.scaleY || 1;
        const oldAngle = selectedElement.angle || 0;
        const oldOriginX = selectedElement.originX || 'center';
        const oldOriginY = selectedElement.originY || 'center';
        
        const oldCustomData = selectedElement.customData || {};
        const oldProps = {
          left: oldLeft,
          top: oldTop,
          scaleX: oldScaleX,
          scaleY: oldScaleY,
          angle: oldAngle,
          originX: oldOriginX,
          originY: oldOriginY,
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
        
        // Explicitly set position and scale again to ensure they're preserved exactly
        // This prevents any drift that might occur during setCoords()
        newImg.set({
          left: oldLeft,
          top: oldTop,
          scaleX: oldScaleX,
          scaleY: oldScaleY,
          angle: oldAngle,
          originX: oldOriginX,
          originY: oldOriginY
        });
        
        // Re-apply coordinates after setting all properties
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

  const handleClone = async () => {
    if (!selectedElement || !selectedElement.canvas) {
      console.warn('Cannot clone: no selected element or canvas');
      return;
    }

    const canvas = selectedElement.canvas;
    
    try {
      // Clone the object using serialization/deserialization method
      // This works reliably across all Fabric.js versions and object types
      const objectData = selectedElement.toObject();
      
      // Get the appropriate class based on object type
      let ObjectClass;
      const type = selectedElement.type;
      if (type === 'i-text' || type === 'itext') {
        ObjectClass = fabric.IText;
      } else if (type === 'text') {
        ObjectClass = fabric.Text;
      } else if (type === 'image') {
        ObjectClass = fabric.Image;
      } else if (type === 'group') {
        ObjectClass = fabric.Group;
      } else if (type === 'path') {
        ObjectClass = fabric.Path;
      } else {
        // Fallback to generic Object
        ObjectClass = fabric.Object;
      }
      
      // Deserialize to create clone
      const clonedObj = await ObjectClass.fromObject(objectData);

      if (!clonedObj) {
        console.error('Failed to clone object');
        return;
      }

      // Calculate center position of edit zone
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      let centerX = canvasWidth / 2; // Default to canvas center
      let centerY = canvasHeight / 2; // Default to canvas center

      // Check if editZones are defined
      if (initialData && initialData.editZones && initialData.editZones.length > 0) {
        const editZone = initialData.editZones[0];
        const realWorldWidth = initialData.realWorldWidth || 24;
        const realWorldHeight = initialData.realWorldHeight || 18;
        
        // Calculate scale for converting inches to pixels
        const scaleX = canvasWidth / realWorldWidth;
        const scaleY = canvasHeight / realWorldHeight;
        
        // Convert editZone coordinates from inches to pixels
        const editZoneLeft = editZone.x * scaleX;
        const editZoneTop = editZone.y * scaleY;
        const editZoneWidth = editZone.width * scaleX;
        const editZoneHeight = editZone.height * scaleY;
        
        // Calculate center of the edit zone
        centerX = editZoneLeft + (editZoneWidth / 2);
        centerY = editZoneTop + (editZoneHeight / 2);
      }

      // Account for object origin point when positioning
      const originX = clonedObj.originX || 'left';
      const originY = clonedObj.originY || 'top';
      
      // Get object dimensions
      const objWidth = Math.abs(clonedObj.width * clonedObj.scaleX);
      const objHeight = Math.abs(clonedObj.height * clonedObj.scaleY);
      
      // Calculate position based on origin point
      let newLeft = centerX;
      let newTop = centerY;
      
      if (originX === 'center') {
        // Object is already centered at its origin
        newLeft = centerX;
      } else {
        // Object origin is at left, need to adjust for object width
        newLeft = centerX - (objWidth / 2);
      }
      
      if (originY === 'center') {
        // Object is already centered at its origin
        newTop = centerY;
      } else {
        // Object origin is at top, need to adjust for object height
        newTop = centerY - (objHeight / 2);
      }

      // Set position
      clonedObj.set({
        left: newLeft,
        top: newTop
      });

      // Generate new elementId for the clone
      clonedObj.elementId = `${selectedElement.elementId || 'element'}-clone-${Date.now()}`;
      
      // Preserve viewId from original (clone should be in same view)
      const originalViewId = selectedElement.viewId || selectedElement.get?.('viewId');
      if (originalViewId) {
        clonedObj.viewId = originalViewId;
      }
      
      // Set z-index for layer ordering (place at top)
      clonedObj.zIndex = canvas.getObjects().length;

      // Preserve artwork metadata for groups (needed for saving/reloading)
      if (selectedElement.type === 'group') {
        // Copy imageUrl and artworkId if they exist on the original
        if (selectedElement.imageUrl) {
          clonedObj.imageUrl = selectedElement.imageUrl;
        }
        if (selectedElement.artworkId) {
          clonedObj.artworkId = selectedElement.artworkId;
        }
        if (selectedElement.textureUrl) {
          clonedObj.textureUrl = selectedElement.textureUrl;
        }
        if (selectedElement.category) {
          clonedObj.category = selectedElement.category;
        }
        
        // Also preserve customData if it exists
        const originalCustomData = selectedElement.customData || selectedElement.get?.('customData') || {};
        if (Object.keys(originalCustomData).length > 0) {
          clonedObj.set('customData', { ...originalCustomData });
        }
        
        console.log('Cloned group with preserved metadata:', {
          elementId: clonedObj.elementId,
          imageUrl: clonedObj.imageUrl,
          artworkId: clonedObj.artworkId,
          textureUrl: clonedObj.textureUrl,
          category: clonedObj.category
        });
      }

      // Add to canvas (this automatically places it at the end/top of the layer stack)
      canvas.add(clonedObj);

      // Ensure it's at the very top by removing and re-adding (same as handleBringToFront)
      canvas.remove(clonedObj);
      canvas.add(clonedObj);

      // Select the cloned object
      canvas.setActiveObject(clonedObj);
      canvas.renderAll();

      // Notify parent of the new element
      if (onUpdateElement) {
        onUpdateElement(clonedObj);
      }

      console.log('Object cloned successfully:', clonedObj);
    } catch (error) {
      console.error('Error cloning object:', error);
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
  if (selectedElement.type === 'text' || selectedElement.type === 'i-text' || selectedElement.type === 'itext') {
    return (
      <div className="options-panel">
        <div className="options-panel-header">
          <h3 className="options-panel-title">Text</h3>
          <div className="group" style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="options-panel-delete-button" 
              onClick={handleClone}
              title="Clone element"
            >
              <img src="/images/clone_icon.png" alt="Clone" className="options-panel-icon" style={{ width: '14px', height: '14px' }} />
            </button>
          <button
            type="button"
            className="options-panel-delete-button"
            onClick={handleDelete}
            title="Delete element"
          >
              <img src="/images/delete_icon.png" alt="Delete" className="options-panel-icon" style={{ width: '12px', height: '14px' }} />
          </button>
          </div>
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
        
        {/* Arrange buttons */}
        <div className="options-panel-actions">
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onBringToFront}
            title="To Front"
            style={{ padding: '8px 12px 6px 12px' }}
          >
            <img src="/images/tofront_icon.png" alt="Text" className="options-panel-icon" style={{ width: '27px', height: '17px' }} />
          </button>
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onSendToBack}
            title="To Back"
            style={{ padding: '4px 12px 6px 12px' }}
          >
            <img src="/images/toback_icon.png" alt="Text" className="options-panel-icon" style={{ width: '25px', height: '16px' }} />
          </button>
        </div>


        <div className="options-panel-form">



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

          {/* Size and Color in same row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label htmlFor="text-font-size" className="form-label">
                Size
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="text-font-size"
                  type="number"
                  className="form-input"
                  value={typeof fontSize === 'number' ? fontSize.toFixed(2) : fontSize}
                  readOnly
                  style={{ width: '70px', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  title="Text size is controlled by resizing the text object on the canvas"
                />
              </div>
            </div>

            <div className="form-group">

            <div className="form-group">
            <label htmlFor="text-align" className="form-label">
              Alignment
            </label>
            <select
              id="text-align"
              className="form-input form-select"
              value={textAlign}
              onChange={handleTextAlignChange}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>


              
            </div>
          </div>

          {/* Letter Spacing and Line Height in same row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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

            <div className="form-group">
              <label htmlFor="text-line-height" className="form-label">
                Line Height
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="text-line-height"
                  type="number"
                  className="form-input"
                  value={lineHeight}
                  onChange={handleLineHeightChange}
                  min="50"
                  max="300"
                  step="1"
                  style={{ width: '70px' }}
                />
                <span style={{ fontSize: '14px', color: '#666', minWidth: '30px' }}>%</span>
              </div>
            </div>
          </div>


          <label className="form-label">
                Color: <span style={{ fontSize: '12px', color: '#666' }}>{selectedColorId ? colorData.find(c => c.id === selectedColorId)?.name || '' : ''}</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {colorData.map((colorItem) => {
                  const isSelected = selectedColorId === colorItem.id;
                  return (
                    <div
                      key={colorItem.id}
                      className={`options-panel-color-swatch ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        console.log('Swatch clicked:', {
                          colorId: colorItem.id,
                          colorName: colorItem.name,
                          fillColor: colorItem.fillColor,
                          opacity: colorItem.opacity,
                          eventTarget: e.target,
                          currentTarget: e.currentTarget,
                          isSelected
                        });
                        e.stopPropagation();
                        e.preventDefault();
                        handleColorSwatchSelect(colorItem);
                      }}
                      style={{
                        background: colorItem.opacity < 1 
                          ? `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`
                          : 'none',
                        backgroundSize: colorItem.opacity < 1 ? '8px 8px' : 'auto',
                        backgroundPosition: colorItem.opacity < 1 ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto',
                        backgroundColor: colorItem.fillColor,
                        opacity: colorItem.opacity,
                        border: !isSelected && colorItem.strokeWidth > 0 
                          ? `1px solid ${colorItem.strokeColor}`
                          : undefined,
                        pointerEvents: 'auto'
                      }}
                      title={colorItem.name}
                    />
                  );
                })}
              </div>


        </div>
      </div>
    );
  }

  // Artwork properties panel (for image, group, and path types)
  if (selectedElement.type === 'image' || selectedElement.type === 'group' || selectedElement.type === 'path') {
    const panelTitle = selectedElement.type === 'group' || selectedElement.type === 'path' 
      ? 'Artwork' 
      : 'Image';
    return (
      <div className="options-panel">
        <div className="options-panel-header">
          <h3 className="options-panel-title">{panelTitle}</h3>

         <div className="group" style={{ display: 'flex', gap: '8px' }}>
             <button 
               type="button" 
               className="options-panel-delete-button" 
               onClick={handleClone}
               title="Clone element"
             >
               <img src="/images/clone_icon.png" alt="Clone" className="options-panel-icon" style={{ width: '14px', height: '14px' }} />
             </button>
          <button
            type="button"
            className="options-panel-delete-button"
            onClick={handleDelete}
            title="Delete element"
          >
            <img src="/images/delete_icon.png" alt="Text" className="options-panel-icon" style={{ width: '12px', height: '14px' }} />
          </button>
          </div>
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
        

        {/* Arrange buttons */}
        <div className="options-panel-actions">
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onBringToFront}
            title="To Front"
            style={{ padding: '8px 12px 6px 12px' }}
          >
            <img src="/images/tofront_icon.png" alt="Text" className="options-panel-icon" style={{ width: '27px', height: '17px' }} />
          </button>
          <button
            type="button"
            className="options-panel-action-button"
            onClick={onSendToBack}
            title="To Back"
            style={{ padding: '4px 12px 6px 12px' }}
          >
            <img src="/images/toback_icon.png" alt="Text" className="options-panel-icon" style={{ width: '25px', height: '16px' }} />
          </button>
        </div>

        <div className="options-panel-form">


          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

            <div className="form-group">
              <label htmlFor="image-width" className="form-label">
                Width
              </label>
              <input
                id="image-width"
                type="number"
                className="form-input"
                value={width || 0}
                onChange={handleWidthChange}
                min="0.1"
                step="0.1"
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
                value={height || 0}
                onChange={handleHeightChange}
                min="0.1"
                step="0.1"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}></div>

          <div className="form-group">
            <label className="form-label">
              Color: <span style={{ fontSize: '12px', color: '#666' }}>{selectedColorId ? colorData.find(c => c.id === selectedColorId)?.name || '' : ''}</span>
            </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {colorData.map((colorItem) => {
                  const isSelected = selectedColorId === colorItem.id;
                  return (
                    <div
                      key={colorItem.id}
                      className={`options-panel-color-swatch ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        console.log('Swatch clicked:', {
                          colorId: colorItem.id,
                          colorName: colorItem.name,
                          fillColor: colorItem.fillColor,
                          opacity: colorItem.opacity,
                          eventTarget: e.target,
                          currentTarget: e.currentTarget,
                          isSelected
                        });
                        e.stopPropagation();
                        e.preventDefault();
                        handleColorSwatchSelect(colorItem);
                      }}
                      style={{
                        background: colorItem.opacity < 1 
                          ? `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`
                          : 'none',
                        backgroundSize: colorItem.opacity < 1 ? '8px 8px' : 'auto',
                        backgroundPosition: colorItem.opacity < 1 ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto',
                        backgroundColor: colorItem.fillColor,
                        opacity: colorItem.opacity,
                        border: !isSelected && colorItem.strokeWidth > 0 
                          ? `1px solid ${colorItem.strokeColor}`
                          : undefined,
                        pointerEvents: 'auto'
                      }}
                      title={colorItem.name}
                    />
                  );
                })}
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
