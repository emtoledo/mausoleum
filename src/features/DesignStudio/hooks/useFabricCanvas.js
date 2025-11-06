/**
 * useFabricCanvas Hook
 * 
 * Core engine for the memorial design studio. Manages Fabric.js canvas lifecycle,
 * handles object creation, constrains objects within edit zones, and manages
 * selection and modification events.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { calculateScale, inchesToPixels } from '../utils/unitConverter';

/**
 * @param {React.RefObject} fabricCanvasRef - Ref to the main Fabric.js canvas container
 * @param {React.RefObject} productCanvasRef - Ref to the product canvas (HTML5 Canvas)
 * @param {Object} initialData - Template data with dimensions and designElements
 * @param {Function} onElementSelect - Callback when an element is selected
 * @param {Object} canvasSize - Current canvas container size { width, height }
 * @param {Function} onCanvasReady - Callback when canvas instance is ready
 * @param {Object} activeMaterial - Currently selected material object
 * @param {Array} materials - Array of all materials for productBase rendering
 * 
 * @returns {Object} Canvas instance
 */
export const useFabricCanvas = (fabricCanvasRef, productCanvasRef, initialData, onElementSelect, canvasSize, onCanvasReady, activeMaterial, materials = []) => {
  const fabricCanvasInstance = useRef(null);
  const scale = useRef(0);
  const selectedObject = useRef(null);

  /**
   * Constrain an object within the canvas boundaries
   * 
   * @param {fabric.Object} obj - The object to constrain
   */
  const constrainObjectInCanvas = useCallback((obj) => {
    if (!obj || !fabricCanvasInstance.current) return;

    // Get canvas dimensions
    const canvasWidth = fabricCanvasInstance.current.width;
    const canvasHeight = fabricCanvasInstance.current.height;
    const canvasLeft = 0;
    const canvasTop = 0;
    const canvasRight = canvasWidth;
    const canvasBottom = canvasHeight;

    // Get object dimensions
    const objLeft = obj.left;
    const objTop = obj.top;
    const objWidth = obj.width * obj.scaleX;
    const objHeight = obj.height * obj.scaleY;
    const objRight = objLeft + objWidth;
    const objBottom = objTop + objHeight;

    // Constrain position
    let newLeft = objLeft;
    let newTop = objTop;

    // Constrain horizontally
    if (objLeft < canvasLeft) {
      newLeft = canvasLeft;
    } else if (objRight > canvasRight) {
      newLeft = canvasRight - objWidth;
    }

    // Constrain vertically
    if (objTop < canvasTop) {
      newTop = canvasTop;
    } else if (objBottom > canvasBottom) {
      newTop = canvasBottom - objHeight;
    }

    // Constrain scale if object would exceed canvas
    let constrainedScaleX = obj.scaleX;
    let constrainedScaleY = obj.scaleY;

    if (objWidth > canvasWidth) {
      constrainedScaleX = canvasWidth / obj.width;
    }

    if (objHeight > canvasHeight) {
      constrainedScaleY = canvasHeight / obj.height;
    }

    // Apply constraints
    obj.set({
      left: newLeft,
      top: newTop,
      scaleX: constrainedScaleX,
      scaleY: constrainedScaleY
    });
  }, [fabricCanvasInstance]);

  /**
   * Draw the product canvas with template image and material fill
   */
  const drawProductCanvas = useCallback(() => {
    if (!productCanvasRef.current || !initialData) return;

    const canvas = productCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas size - use canvas dimensions if specified, otherwise fall back to realWorld dimensions
    const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
      ? initialData.canvas.width 
      : (initialData.realWorldWidth || 24);
    const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
      ? initialData.canvas.height 
      : (initialData.realWorldHeight || 18);
    
    const canvasWidth = inchesToPixels(canvasWidthInches, scale.current);
    const canvasHeight = inchesToPixels(canvasHeightInches, scale.current);

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw template image with material fill
    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous'; // Enable CORS if needed
    
    // Helper function to draw productBase rectangles
    const drawProductBases = () => {
      if (!initialData || !initialData.productBase || !Array.isArray(initialData.productBase)) {
        return;
      }
      
      // Draw each productBase rectangle
      initialData.productBase.forEach((base) => {
        if (!base.material || base.x === undefined || base.y === undefined || !base.width || !base.height) {
          return;
        }
        
        // Find the material for this base
        const baseMaterial = materials.find(m => m.id === base.material);
        if (!baseMaterial || !baseMaterial.textureUrl) {
          console.warn(`Material ${base.material} not found for productBase ${base.id}`);
          return;
        }
        
        // Calculate pixel positions and dimensions
        const baseX = inchesToPixels(base.x, scale.current);
        const baseY = inchesToPixels(base.y, scale.current);
        const baseWidth = inchesToPixels(base.width, scale.current);
        const baseHeight = inchesToPixels(base.height, scale.current);
        
        // Load and draw the base material texture
        const baseMaterialImg = new Image();
        baseMaterialImg.crossOrigin = 'anonymous';
        
        baseMaterialImg.onload = () => {
          // Create a pattern from the base material texture
          const basePattern = ctx.createPattern(baseMaterialImg, 'repeat');
          
          if (basePattern) {
            // Save context state
            ctx.save();
            
            // Fill the rectangle with the material pattern
            ctx.fillStyle = basePattern;
            ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
            
            // Restore context state
            ctx.restore();
          } else {
            console.warn(`Failed to create pattern for base material ${base.material}`);
          }
        };
        
        baseMaterialImg.onerror = () => {
          console.warn(`Failed to load base material texture: ${baseMaterial.textureUrl}`);
        };
        
        baseMaterialImg.src = baseMaterial.textureUrl;
      });
    };
    
    // Calculate template SVG dimensions using realWorldWidth and realWorldHeight
    const templateWidthInches = initialData.realWorldWidth || 24;
    const templateHeightInches = initialData.realWorldHeight || 18;
    const templateWidth = inchesToPixels(templateWidthInches, scale.current);
    const templateHeight = inchesToPixels(templateHeightInches, scale.current);
    
    templateImg.onload = () => {
      // Helper function to draw overlay after base template/material is drawn
      const drawOverlay = () => {
        if (initialData && initialData.overlayUrl) {
          const overlayImg = new Image();
          overlayImg.crossOrigin = 'anonymous';
          
          overlayImg.onload = () => {
            ctx.save();
            ctx.globalAlpha = 0.5;
            
            // If activeMaterial has overlayFill, fill the overlay SVG with that color
            if (activeMaterial && activeMaterial.overlayFill) {
              // Create a temporary canvas to draw the overlay with fill color
              const overlayCanvas = document.createElement('canvas');
              overlayCanvas.width = templateWidth;
              overlayCanvas.height = templateHeight;
              const overlayCtx = overlayCanvas.getContext('2d');
              
              // Fill the temporary canvas with the overlay fill color
              overlayCtx.fillStyle = activeMaterial.overlayFill;
              overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
              
              // Apply the overlay SVG shape as a mask using composite operation
              // This will only show the fill color where the overlay SVG has pixels
              overlayCtx.globalCompositeOperation = 'destination-in';
              overlayCtx.drawImage(overlayImg, 0, 0, overlayCanvas.width, overlayCanvas.height);
              
              // Reset composite operation
              overlayCtx.globalCompositeOperation = 'source-over';
              
              // Draw the filled overlay onto the main canvas at template position
              ctx.drawImage(overlayCanvas, 0, 0, templateWidth, templateHeight);
            } else {
              // No overlayFill specified, just draw the overlay as-is at template size
              ctx.drawImage(overlayImg, 0, 0, templateWidth, templateHeight);
            }
            
            ctx.restore();
          };
          
          overlayImg.onerror = () => {
            console.warn('Failed to load overlay image:', initialData.overlayUrl);
          };
          
          overlayImg.src = initialData.overlayUrl;
        }
      };

      // If we have an active material, fill the SVG shape with the material texture
      if (activeMaterial && activeMaterial.textureUrl) {
        const materialImg = new Image();
        materialImg.crossOrigin = 'anonymous';
        
        materialImg.onload = () => {
          // Create a pattern from the material texture
          const pattern = ctx.createPattern(materialImg, 'repeat');
          
          if (pattern) {
            // Fill template area with material pattern
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, templateWidth, templateHeight);
            
            // Apply the SVG shape as a mask using composite operation
            // This will only show the material pattern where the SVG has pixels
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
            
            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';
          } else {
            // Fallback: just draw the template without material fill
            ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
          }
          
            // Draw overlay on top of material-filled template
            drawOverlay();
            
            // Draw productBase rectangles after overlay
            drawProductBases();
          };
          
          materialImg.onerror = () => {
            console.warn('Failed to load material texture:', activeMaterial.textureUrl);
            // Fallback: just draw the template without material fill
            ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
            // Draw overlay on top
            drawOverlay();
            // Draw productBase rectangles
            drawProductBases();
          };
          
          materialImg.src = activeMaterial.textureUrl;
        } else {
          // No material selected, just draw the template SVG as-is at template size
          ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
          // Draw overlay on top
          drawOverlay();
          // Draw productBase rectangles
          drawProductBases();
        }
    };
    
    templateImg.onerror = () => {
      console.warn('Failed to load template image:', initialData.imageUrl);
    };
    
    // Use imageUrl from initialData (template image)
    if (initialData.imageUrl) {
      templateImg.src = initialData.imageUrl;
    }

  }, [productCanvasRef, initialData, scale, activeMaterial, materials]);


  /**
   * Create Fabric.js objects from design elements
   */
  const populateCanvasFromData = useCallback((canvas, elements) => {
    if (!canvas || !elements || elements.length === 0) return;

    elements.forEach(element => {
      let fabricObject;

      if (element.type === 'text') {
        // Create Fabric.js Text object
        fabricObject = new fabric.Text(element.content || 'Text', {
          left: inchesToPixels(element.x || 0, scale.current),
          top: inchesToPixels(element.y || 0, scale.current),
          fontSize: inchesToPixels(element.fontSize || 12, scale.current),
          fontFamily: element.font || 'Arial',
          originX: 'left',
          originY: 'top',
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          editable: true
        });
      } else if (element.type === 'artwork') {
        // Create Fabric.js Image object
        fabricObject = new fabric.Image(element.content || '', {
          left: inchesToPixels(element.x || 0, scale.current),
          top: inchesToPixels(element.y || 0, scale.current),
          originX: 'left',
          originY: 'top',
          hasControls: true,
          hasBorders: true,
          lockRotation: false
        });

        // Load image
        if (element.content) {
          fabric.Image.fromURL(element.content, img => {
            img.set({
              left: inchesToPixels(element.x || 0, scale.current),
              top: inchesToPixels(element.y || 0, scale.current),
              scaleX: inchesToPixels(element.scaleX || 1, scale.current) / img.width,
              scaleY: inchesToPixels(element.scaleY || 1, scale.current) / img.height
            });
            canvas.add(img);
            canvas.renderAll();
          });
          return; // Skip adding object now, it will be added in callback
        }
      }

      if (fabricObject) {
        // Store element metadata
        fabricObject.elementId = element.id;

        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
  }, [scale]);


  /**
   * Initialize Fabric.js canvas
   */
  useEffect(() => {
    if (!fabricCanvasRef.current || !initialData) return;
    
    // Wait for canvas size to be available
    if (!canvasSize || canvasSize.width === 0) {
      console.log('Waiting for canvas size...');
      return;
    }

    const container = fabricCanvasRef.current;
    
    // Calculate canvas dimensions - use canvas dimensions if specified, otherwise fall back to realWorld dimensions
    const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
      ? initialData.canvas.width 
      : (initialData.realWorldWidth || 24);
    const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
      ? initialData.canvas.height 
      : (initialData.realWorldHeight || 18);
    
    // Calculate scale based on canvas width (not realWorldWidth) for proper scaling
    // But use realWorldWidth for object positioning/scaling calculations
    const realWorldWidth = initialData.realWorldWidth || 24;
    
    // Use responsive canvas size from container
    const canvasWidth = canvasSize.width;
    const canvasHeight = (canvasWidth / canvasWidthInches) * canvasHeightInches;

    // Scale is still calculated based on realWorldWidth for object positioning
    scale.current = calculateScale(realWorldWidth, canvasWidth);

    // Create or update Fabric.js canvas
    if (!fabricCanvasInstance.current) {
      const canvas = new fabric.Canvas(container, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        renderOnAddRemove: true
      });
      fabricCanvasInstance.current = canvas;
      
      // Notify parent that canvas is ready
      if (onCanvasReady) {
        onCanvasReady(canvas);
      }
      
      // Ensure Fabric's canvas elements have proper positioning
      // Fabric creates a wrapper div with 'lower-canvas' and 'upper-canvas' inside it
      const upperCanvas = canvas.upperCanvasEl;
      const lowerCanvas = canvas.lowerCanvasEl;
      
      if (upperCanvas) {
        // Set absolute positioning to match the container
        upperCanvas.style.position = 'absolute';
        upperCanvas.style.left = '50%';
        upperCanvas.style.top = '50%';
        upperCanvas.style.transform = 'translate(-50%, -50%)';
      }
      
      if (lowerCanvas) {
        // Set absolute positioning to match the container
        lowerCanvas.style.position = 'absolute';
        lowerCanvas.style.left = '50%';
        lowerCanvas.style.top = '50%';
        lowerCanvas.style.transform = 'translate(-50%, -50%)';
      }
      
    } else {
      // Update existing canvas dimensions and scale all objects proportionally
      const canvas = fabricCanvasInstance.current;
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      
      // Only resize if dimensions actually changed (prevent infinite loops)
      if (Math.abs(oldWidth - canvasWidth) < 1 && Math.abs(oldHeight - canvasHeight) < 1) {
        // Dimensions haven't changed, skip resize
        return;
      }
      
      const oldScale = scale.current;
      const newScale = calculateScale(realWorldWidth, canvasWidth);
      
      // Calculate scale ratio for objects
      const scaleRatioX = canvasWidth / oldWidth;
      const scaleRatioY = canvasHeight / oldHeight;
      
      console.log('Resizing canvas:', {
        oldWidth,
        oldHeight,
        canvasWidth,
        canvasHeight,
        scaleRatioX,
        scaleRatioY,
        oldScale,
        newScale
      });
      
      // Scale all objects proportionally from center
      // First, filter out any invalid objects that don't have required methods
      const validObjects = canvas.getObjects().filter(obj => 
        obj && 
        typeof obj.set === 'function' && 
        typeof obj.setCoords === 'function' &&
        typeof obj.render === 'function'
      );
      
      // Remove invalid objects
      // Get all objects and identify invalid ones
      const allObjects = canvas.getObjects();
      const invalidIndices = [];
      
      allObjects.forEach((obj, idx) => {
        if (!obj || 
            typeof obj.set !== 'function' || 
            typeof obj.setCoords !== 'function' ||
            typeof obj.render !== 'function') {
          invalidIndices.push(idx);
        }
      });
      
      if (invalidIndices.length > 0) {
        console.warn(`Found ${invalidIndices.length} invalid objects during resize`);
        
        // Remove invalid objects by index (in reverse order to maintain indices)
        invalidIndices.reverse().forEach(idx => {
          try {
            const objToRemove = allObjects[idx];
            if (objToRemove) {
              canvas.remove(objToRemove);
            }
          } catch (err) {
            console.warn(`Error removing invalid object at index ${idx}:`, err);
            // If removal fails, the object might already be gone or corrupted
            // Continue with other objects
          }
        });
      }
      
      // Scale valid objects
      validObjects.forEach((obj) => {
        try {
          // Get current position relative to canvas center
          const oldCenterX = oldWidth / 2;
          const oldCenterY = oldHeight / 2;
          
          // Calculate distance from center
          const distFromCenterX = obj.left - oldCenterX;
          const distFromCenterY = obj.top - oldCenterY;
          
          // Calculate new position
          const newCenterX = canvasWidth / 2;
          const newCenterY = canvasHeight / 2;
          const newLeft = newCenterX + (distFromCenterX * scaleRatioX);
          const newTop = newCenterY + (distFromCenterY * scaleRatioY);
          
          // Update position
          obj.set({
            left: newLeft,
            top: newTop
          });
          
          // Update dimensions (for text, this means fontSize)
          if (obj.type === 'text') {
            const newFontSize = obj.fontSize * scaleRatioX;
            obj.set({
              fontSize: newFontSize
            });
          } else if (obj.type === 'image') {
            // For images, scale the scaleX and scaleY
            obj.set({
              scaleX: obj.scaleX * scaleRatioX,
              scaleY: obj.scaleY * scaleRatioY
            });
          }
          
          // Recalculate hit area and coordinates for the object
          // This is critical for proper hit detection after scaling
          obj.setCoords();
        } catch (err) {
          console.warn('Error scaling object during resize:', err, obj);
          // Try to remove the problematic object
          try {
            canvas.remove(obj);
          } catch (removeErr) {
            console.warn('Could not remove problematic object:', removeErr);
          }
        }
      });
      
      // Update canvas dimensions
      canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      
      // Final validation before rendering - ensure all objects are valid
      const finalObjects = canvas.getObjects();
      const finalInvalidObjects = finalObjects.filter(obj => 
        !obj || 
        typeof obj.render !== 'function'
      );
      
      if (finalInvalidObjects.length > 0) {
        console.warn(`Removing ${finalInvalidObjects.length} invalid objects before final render`);
        finalInvalidObjects.forEach(invalidObj => {
          try {
            // Get index before removal
            const idx = finalObjects.indexOf(invalidObj);
            if (idx !== -1) {
              // Use direct array manipulation as last resort
              const currentObjects = canvas.getObjects();
              currentObjects.splice(idx, 1);
              // Re-set the objects array
              canvas._objects = currentObjects.filter(o => o && typeof o.render === 'function');
            }
          } catch (err) {
            console.error('Could not remove invalid object before render:', err);
          }
        });
      }
      
      try {
        canvas.renderAll();
      } catch (renderErr) {
        console.error('Error rendering canvas after resize:', renderErr);
        // Try to clean up and render again
        try {
          const cleanObjects = canvas.getObjects().filter(obj => 
            obj && typeof obj.render === 'function'
          );
          canvas._objects = cleanObjects;
          canvas.renderAll();
        } catch (cleanupErr) {
          console.error('Could not recover from render error:', cleanupErr);
        }
      }
      
      // Update the scale reference for future resizes
      scale.current = newScale;
      
      // Re-apply proper positioning on resize
      const upperCanvas = canvas.upperCanvasEl;
      const lowerCanvas = canvas.lowerCanvasEl;
      
      if (upperCanvas) {
        // Set absolute positioning to match the container
        upperCanvas.style.position = 'absolute';
        upperCanvas.style.left = '50%';
        upperCanvas.style.top = '50%';
        upperCanvas.style.transform = 'translate(-50%, -50%)';
      }
      
      if (lowerCanvas) {
        // Set absolute positioning to match the container
        lowerCanvas.style.position = 'absolute';
        lowerCanvas.style.left = '50%';
        lowerCanvas.style.top = '50%';
        lowerCanvas.style.transform = 'translate(-50%, -50%)';
      }
      
      // Redraw product canvas with new scale
      drawProductCanvas();
    }

    const canvas = fabricCanvasInstance.current;

    // Draw product canvas (only on initial creation, not on resize)
    if (!fabricCanvasInstance.current || (fabricCanvasInstance.current && !fabricCanvasInstance.current.listening)) {
      drawProductCanvas();
    }

    // Only populate and set up event listeners on first creation
    if (!canvas.listening) {
      // Mark that listeners are set up
      canvas.listening = true;
      
      // Populate canvas with design elements
      if (initialData.designElements && initialData.designElements.length > 0) {
        populateCanvasFromData(canvas, initialData.designElements);
      }

      // Selection event listeners
      canvas.on('selection:created', (e) => {
        const activeObject = canvas.getActiveObject();
        selectedObject.current = activeObject;
        console.log('Object selected:', activeObject);
        if (onElementSelect) {
          onElementSelect(activeObject);
        }
      });

      canvas.on('selection:cleared', () => {
        selectedObject.current = null;
        console.log('Selection cleared');
        if (onElementSelect) {
          onElementSelect(null);
        }
      });

      canvas.on('selection:updated', (e) => {
        const activeObject = canvas.getActiveObject();
        selectedObject.current = activeObject;
        console.log('Selection updated:', activeObject);
        if (onElementSelect) {
          onElementSelect(activeObject);
        }
      });

      // Object modification event listeners
      canvas.on('object:moving', (e) => {
        const obj = e.target;
        constrainObjectInCanvas(obj);
      });

      canvas.on('object:scaling', (e) => {
        const obj = e.target;
        constrainObjectInCanvas(obj);
      });

      canvas.on('object:rotating', (e) => {
        const obj = e.target;
        console.log('Object rotating:', obj);
      });

      // Object modification completion
      canvas.on('object:modified', (e) => {
        const obj = e.target;
        console.log('Object modified:', obj);
      });
    }

    // Cleanup
    return () => {
      // Don't dispose canvas on resize - just let the effect handle canvas updates
    };
    // eslint-disable-next-line
  }, [fabricCanvasRef, initialData, canvasSize]); // Re-run when canvasSize changes

  /**
   * Redraw product canvas when activeMaterial changes
   */
  useEffect(() => {
    if (scale.current > 0 && fabricCanvasInstance.current) {
      drawProductCanvas();
    }
  }, [activeMaterial, drawProductCanvas]);

  return fabricCanvasInstance.current;
};

export default useFabricCanvas;
