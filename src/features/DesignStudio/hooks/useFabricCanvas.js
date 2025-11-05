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
 * @param {React.RefObject} zoneCanvasRef - Ref to the zone overlay canvas (HTML5 Canvas)
 * @param {Object} initialData - Template data with dimensions, editZones, and designElements
 * @param {Function} onElementSelect - Callback when an element is selected
 * @param {Object} canvasSize - Current canvas container size { width, height }
 * @param {Function} onCanvasReady - Callback when canvas instance is ready
 * @param {Object} activeMaterial - Currently selected material object
 * 
 * @returns {Object} Canvas instance
 */
export const useFabricCanvas = (fabricCanvasRef, productCanvasRef, zoneCanvasRef, initialData, onElementSelect, canvasSize, onCanvasReady, activeMaterial) => {
  const fabricCanvasInstance = useRef(null);
  const scale = useRef(0);
  const selectedObject = useRef(null);

  /**
   * Constrain an object within its edit zone boundaries
   * 
   * @param {fabric.Object} obj - The object to constrain
   * @param {Object} zone - The edit zone boundaries
   */
  const constrainObjectInZone = useCallback((obj, zone) => {
    if (!zone) return;

    // Get zone boundaries in pixels
    const zoneLeft = inchesToPixels(zone.x, scale.current);
    const zoneTop = inchesToPixels(zone.y, scale.current);
    const zoneWidth = inchesToPixels(zone.width, scale.current);
    const zoneHeight = inchesToPixels(zone.height, scale.current);
    const zoneRight = zoneLeft + zoneWidth;
    const zoneBottom = zoneTop + zoneHeight;

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
    if (objLeft < zoneLeft) {
      newLeft = zoneLeft;
    } else if (objRight > zoneRight) {
      newLeft = zoneRight - objWidth;
    }

    // Constrain vertically
    if (objTop < zoneTop) {
      newTop = zoneTop;
    } else if (objBottom > zoneBottom) {
      newTop = zoneBottom - objHeight;
    }

    // Constrain scale if object would exceed zone
    let constrainedScaleX = obj.scaleX;
    let constrainedScaleY = obj.scaleY;

    if (objWidth > zoneWidth) {
      constrainedScaleX = zoneWidth / obj.width;
    }

    if (objHeight > zoneHeight) {
      constrainedScaleY = zoneHeight / obj.height;
    }

    // Apply constraints
    obj.set({
      left: newLeft,
      top: newTop,
      scaleX: constrainedScaleX,
      scaleY: constrainedScaleY
    });
  }, []);

  /**
   * Draw the product canvas with template image and material fill
   */
  const drawProductCanvas = useCallback(() => {
    if (!productCanvasRef.current || !initialData) return;

    const canvas = productCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas size based on real-world dimensions
    const realWorldWidth = initialData.realWorldWidth || 24;
    const realWorldHeight = initialData.realWorldHeight || 18;
    const canvasWidth = inchesToPixels(realWorldWidth, scale.current);
    const canvasHeight = inchesToPixels(realWorldHeight, scale.current);

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw template image with material fill
    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous'; // Enable CORS if needed
    
    templateImg.onload = () => {
      // If we have an active material, fill the SVG shape with the material texture
      if (activeMaterial && activeMaterial.textureUrl) {
        const materialImg = new Image();
        materialImg.crossOrigin = 'anonymous';
        
        materialImg.onload = () => {
          // Create a pattern from the material texture
          const pattern = ctx.createPattern(materialImg, 'repeat');
          
          if (pattern) {
            // Fill entire canvas with material pattern
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply the SVG shape as a mask using composite operation
            // This will only show the material pattern where the SVG has pixels
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
            
            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';
          } else {
            // Fallback: just draw the template without material fill
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
          }
        };
        
        materialImg.onerror = () => {
          console.warn('Failed to load material texture:', activeMaterial.textureUrl);
          // Fallback: just draw the template without material fill
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
        };
        
        materialImg.src = activeMaterial.textureUrl;
      } else {
        // No material selected, just draw the template SVG as-is
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
      }
    };
    
    templateImg.onerror = () => {
      console.warn('Failed to load template image:', initialData.imageUrl);
    };
    
    // Use imageUrl from initialData (template image)
    if (initialData.imageUrl) {
      templateImg.src = initialData.imageUrl;
    }

  }, [productCanvasRef, initialData, scale, activeMaterial]);

  /**
   * Draw the zone overlay canvas with edit zones
   */
  const drawZoneCanvas = useCallback(() => {
    if (!zoneCanvasRef.current || !initialData || !initialData.editZones) return;

    const canvas = zoneCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Match canvas size to product canvas
    const realWorldWidth = initialData.realWorldWidth || 24;
    const realWorldHeight = initialData.realWorldHeight || 18;
    const canvasWidth = inchesToPixels(realWorldWidth, scale.current);
    const canvasHeight = inchesToPixels(realWorldHeight, scale.current);

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw edit zones
    initialData.editZones.forEach(zone => {
      const x = inchesToPixels(zone.x, scale.current);
      const y = inchesToPixels(zone.y, scale.current);
      const width = inchesToPixels(zone.width, scale.current);
      const height = inchesToPixels(zone.height, scale.current);

      // Draw zone boundary (semi-transparent overlay)
      ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      // Draw zone background (very subtle)
      ctx.fillStyle = 'rgba(0, 123, 255, 0.05)';
      ctx.fillRect(x, y, width, height);
    });

  }, [zoneCanvasRef, initialData, scale]);

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
        fabricObject.zoneId = element.zoneId;

        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
  }, [scale]);

  /**
   * Get edit zone for an object
   */
  const getEditZoneForObject = useCallback((obj) => {
    if (!initialData || !initialData.editZones || !obj.zoneId) return null;
    return initialData.editZones.find(zone => zone.id === obj.zoneId);
  }, [initialData]);

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
    
    // Calculate scale based on real-world dimensions and responsive canvas width
    const realWorldWidth = initialData.realWorldWidth || 24;
    const realWorldHeight = initialData.realWorldHeight || 18;
    
    // Use responsive canvas size from container
    const canvasWidth = canvasSize.width;
    const canvasHeight = (canvasWidth / realWorldWidth) * realWorldHeight;

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
      canvas.forEachObject((obj) => {
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
      });
      
      // Update canvas dimensions
      canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      canvas.renderAll();
      
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
      
      // Redraw product and zone canvases with new scale
      drawProductCanvas();
      drawZoneCanvas();
    }

    const canvas = fabricCanvasInstance.current;

    // Draw product and zone canvases (only on initial creation, not on resize)
    if (!fabricCanvasInstance.current || (fabricCanvasInstance.current && !fabricCanvasInstance.current.listening)) {
      drawProductCanvas();
      drawZoneCanvas();
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
        const zone = getEditZoneForObject(obj);
        
        if (zone) {
          constrainObjectInZone(obj, zone);
        }
      });

      canvas.on('object:scaling', (e) => {
        const obj = e.target;
        const zone = getEditZoneForObject(obj);
        
        if (zone) {
          constrainObjectInZone(obj, zone);
        }
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
