/**
 * useFabricCanvas Hook
 * 
 * Core engine for the memorial design studio. Manages Fabric.js canvas lifecycle,
 * handles object creation, constrains objects within edit zones, and manages
 * selection and modification events.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as fabric from 'fabric';
import { calculateScale, inchesToPixels } from '../utils/unitConverter';
import { colorData } from '../../../data/ColorData';

// Set global selection color for all Fabric.js objects
// This must be set at module level before any objects are created
fabric.Object.prototype.borderColor = '#008FF0';
fabric.Object.prototype.cornerColor = '#008FF0';
fabric.Object.prototype.cornerStrokeColor = '#008FF0';
fabric.Object.prototype.selectionBackgroundColor = 'rgba(0, 143, 240, 0.1)';

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
export const useFabricCanvas = (fabricCanvasRef, productCanvasRef, initialData, onElementSelect, canvasSize, onCanvasReady, activeMaterial, materials = [], onLoadingStateChange = null, currentView = 'front', artworkData = []) => {
  const fabricCanvasInstance = useRef(null);
  const scale = useRef(0);
  const loadingStateRef = useRef({ isLoading: false, loaded: 0, total: 0, message: '' });
  
  // Helper function to update loading state
  const updateLoadingState = useCallback((updates) => {
    loadingStateRef.current = { ...loadingStateRef.current, ...updates };
    if (onLoadingStateChange) {
      onLoadingStateChange(loadingStateRef.current);
    }
  }, [onLoadingStateChange]);
  const selectedObject = useRef(null);
  const constraintOverlay = useRef(null); // Reference to constraint border overlay
  const isObjectMoving = useRef(false);

  /**
   * Constrain an object within the canvas boundaries or edit zones
   * 
   * @param {fabric.Object} obj - The object to constrain
   */
  const constrainObjectInCanvas = useCallback((obj) => {
    if (!obj || !fabricCanvasInstance.current || !initialData) return;

    const canvas = fabricCanvasInstance.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Check if editZones are defined in initialData
    let constraintLeft = 0;
    let constraintTop = 0;
    let constraintRight = canvasWidth;
    let constraintBottom = canvasHeight;
    
    if (initialData.editZones && initialData.editZones.length > 0) {
      // Use the first editZone (or could combine multiple zones)
      const editZone = initialData.editZones[0];
      const realWorldWidth = initialData.realWorldWidth || 24;
      // Use canvas.height (in inches) for vertical scale, not realWorldHeight
      // canvas.height includes the base, while realWorldHeight is just the product
      const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
        ? initialData.canvas.height 
        : (initialData.realWorldHeight || 18);
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / canvasHeightInches;
      
      // Convert editZone coordinates from inches to pixels
      const editZoneWidthPx = editZone.width * scaleX;
      const editZoneHeightPx = editZone.height * scaleY;
      
      // If X position is not defined or set to "center", center horizontally relative to canvas width
      if (editZone.x === undefined || editZone.x === null || editZone.x === 'center') {
        constraintLeft = (canvasWidth - editZoneWidthPx) / 2;
      } else {
        constraintLeft = editZone.x * scaleX;
      }
      
      constraintTop = editZone.y * scaleY;
      constraintRight = constraintLeft + editZoneWidthPx;
      constraintBottom = constraintTop + editZoneHeightPx;
    } else {
      // Fall back to canvas boundaries
      constraintLeft = 0;
      constraintTop = 0;
      constraintRight = canvasWidth;
      constraintBottom = canvasHeight;
    }

    // Get object dimensions (accounting for scale)
    const objWidth = Math.abs(obj.width * obj.scaleX);
    const objHeight = Math.abs(obj.height * obj.scaleY);
    
    // Get object origin point
    const originX = obj.originX || 'left';
    const originY = obj.originY || 'top';
    
    // Calculate actual bounding box based on origin point
    let objLeft, objTop, objRight, objBottom;
    
    if (originX === 'center') {
      objLeft = obj.left - (objWidth / 2);
      objRight = obj.left + (objWidth / 2);
    } else {
      objLeft = obj.left;
      objRight = obj.left + objWidth;
    }
    
    if (originY === 'center') {
      objTop = obj.top - (objHeight / 2);
      objBottom = obj.top + (objHeight / 2);
    } else {
      objTop = obj.top;
      objBottom = obj.top + objHeight;
    }

    // Constrain position
    let newLeft = obj.left;
    let newTop = obj.top;

    // Constrain horizontally
    if (objLeft < constraintLeft) {
      if (originX === 'center') {
        newLeft = constraintLeft + (objWidth / 2);
      } else {
        newLeft = constraintLeft;
      }
    } else if (objRight > constraintRight) {
      if (originX === 'center') {
        newLeft = constraintRight - (objWidth / 2);
      } else {
        newLeft = constraintRight - objWidth;
      }
    }

    // Constrain vertically
    if (objTop < constraintTop) {
      if (originY === 'center') {
        newTop = constraintTop + (objHeight / 2);
      } else {
        newTop = constraintTop;
      }
    } else if (objBottom > constraintBottom) {
      if (originY === 'center') {
        newTop = constraintBottom - (objHeight / 2);
      } else {
        newTop = constraintBottom - objHeight;
      }
    }

    // Constrain scale if object would exceed constraint area
    const constraintWidth = constraintRight - constraintLeft;
    const constraintHeight = constraintBottom - constraintTop;
    let constrainedScaleX = obj.scaleX;
    let constrainedScaleY = obj.scaleY;

    if (objWidth > constraintWidth) {
      constrainedScaleX = (constraintWidth / obj.width) * Math.sign(obj.scaleX || 1);
    }

    if (objHeight > constraintHeight) {
      constrainedScaleY = (constraintHeight / obj.height) * Math.sign(obj.scaleY || 1);
    }

    // Apply constraints
    obj.set({
      left: newLeft,
      top: newTop,
      scaleX: constrainedScaleX,
      scaleY: constrainedScaleY
    });
    
    // Update coordinates after constraint
    obj.setCoords();
  }, [fabricCanvasInstance, initialData]);

  /**
   * Draw the product canvas with template image and material fill
   */
  // Memoize product canvas properties to prevent unnecessary redraws
  // Only redraw when properties that affect the product canvas change (not designElements)
  const productCanvasProps = useMemo(() => ({
    imageUrl: initialData?.imageUrl,
    overlayUrl: initialData?.overlayUrl,
    floral: initialData?.floral,
    productBase: initialData?.productBase,
    canvasWidth: initialData?.canvas?.width,
    canvasHeight: initialData?.canvas?.height,
    realWorldWidth: initialData?.realWorldWidth,
    realWorldHeight: initialData?.realWorldHeight
  }), [
    initialData?.imageUrl,
    initialData?.overlayUrl,
    initialData?.floral,
    initialData?.productBase,
    initialData?.canvas?.width,
    initialData?.canvas?.height,
    initialData?.realWorldWidth,
    initialData?.realWorldHeight
  ]);

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
      if (!productCanvasProps || !productCanvasProps.productBase || !Array.isArray(productCanvasProps.productBase)) {
        return;
      }
      
      // Draw each productBase rectangle
      productCanvasProps.productBase.forEach((base) => {
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

    // Helper function to draw floral images (at highest layer)
    const drawFloral = () => {
      if (!productCanvasProps || !productCanvasProps.floral || !Array.isArray(productCanvasProps.floral)) {
        return;
      }
      
      // Draw each floral image
      productCanvasProps.floral.forEach((floralItem) => {
        if (!floralItem.imageUrl || floralItem.x === undefined || floralItem.y === undefined || !floralItem.width || !floralItem.height) {
          console.warn(`Invalid floral item data:`, floralItem);
          return;
        }
        
        // Calculate pixel positions and dimensions from inches
        const floralX = inchesToPixels(floralItem.x, scale.current);
        const floralY = inchesToPixels(floralItem.y, scale.current);
        const floralWidth = inchesToPixels(floralItem.width, scale.current);
        const floralHeight = inchesToPixels(floralItem.height, scale.current);
        
        // Load and draw the floral image
        const floralImg = new Image();
        floralImg.crossOrigin = 'anonymous';
        
        floralImg.onload = () => {
          // Save context state
          ctx.save();
          
          // Draw the floral image at the specified position and size
          ctx.drawImage(floralImg, floralX, floralY, floralWidth, floralHeight);
          
          // Restore context state
          ctx.restore();
          
          console.log(`Floral image drawn: ${floralItem.id} at (${floralX}, ${floralY}) size ${floralWidth}x${floralHeight}`);
        };
        
        floralImg.onerror = () => {
          console.warn(`Failed to load floral image: ${floralItem.imageUrl} for item ${floralItem.id}`);
        };
        
        floralImg.src = floralItem.imageUrl;
      });
    };
    
    // Calculate template SVG dimensions using realWorldWidth and realWorldHeight
    const templateWidthInches = productCanvasProps.realWorldWidth || 24;
    const templateHeightInches = productCanvasProps.realWorldHeight || 18;
    const templateWidth = inchesToPixels(templateWidthInches, scale.current);
    const templateHeight = inchesToPixels(templateHeightInches, scale.current);
    
    templateImg.onload = () => {
      // Helper function to draw overlay after base template/material is drawn
      // Returns a Promise that resolves when overlay is drawn (or immediately if no overlay)
      const drawOverlay = () => {
        return new Promise((resolve) => {
          if (productCanvasProps && productCanvasProps.overlayUrl) {
            const overlayImg = new Image();
            overlayImg.crossOrigin = 'anonymous';
            
            overlayImg.onload = () => {
              // Always save context state before modifying it
              ctx.save();
              
              // Consistently set overlay opacity to 0.5
              const OVERLAY_OPACITY = 0.5;
              ctx.globalAlpha = OVERLAY_OPACITY;
              
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
                // The globalAlpha (0.5) will be applied when drawing the temporary canvas
                ctx.drawImage(overlayCanvas, 0, 0, templateWidth, templateHeight);
              } else {
                // No overlayFill specified, just draw the overlay as-is at template size
                // The globalAlpha (0.5) will be applied when drawing the image
                ctx.drawImage(overlayImg, 0, 0, templateWidth, templateHeight);
              }
              
              // Always restore context state to ensure opacity doesn't affect subsequent draws
              ctx.restore();
              resolve(); // Resolve after overlay is drawn
            };
            
            overlayImg.onerror = () => {
              console.warn('Failed to load overlay image:', productCanvasProps.overlayUrl);
              resolve(); // Resolve even on error so floral can still be drawn
            };
            
            overlayImg.src = productCanvasProps.overlayUrl;
          } else {
            // No overlay, resolve immediately
            resolve();
          }
        });
      };

      // If we have an active material, fill the SVG shape with the material texture
      if (activeMaterial && activeMaterial.textureUrl) {
        const materialImg = new Image();
        materialImg.crossOrigin = 'anonymous';
        
        materialImg.onload = async () => {
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
          
          // Draw overlay on top of material-filled template, wait for it to complete
          await drawOverlay();
          
          // Draw productBase rectangles after overlay
          drawProductBases();
          
          // Draw floral images at highest layer (on top of everything, after overlay is done)
          drawFloral();
        };
        
        materialImg.onerror = async () => {
          console.warn('Failed to load material texture:', activeMaterial.textureUrl);
          // Fallback: just draw the template without material fill
          ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
          // Draw overlay on top, wait for it to complete
          await drawOverlay();
          // Draw productBase rectangles
          drawProductBases();
          // Draw floral images at highest layer (after overlay is done)
          drawFloral();
        };
        
        materialImg.src = activeMaterial.textureUrl;
      } else {
        // No material selected, just draw the template SVG as-is at template size
        ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
        // Draw overlay on top, wait for it to complete, then draw floral
        drawOverlay().then(() => {
          // Draw productBase rectangles
          drawProductBases();
          // Draw floral images at highest layer (after overlay is done)
          drawFloral();
        });
      }
    };
    
    templateImg.onerror = () => {
      console.warn('Failed to load template image:', productCanvasProps.imageUrl);
    };
    
    // Use imageUrl from productCanvasProps (template image)
    if (productCanvasProps.imageUrl) {
      templateImg.src = productCanvasProps.imageUrl;
    }

  }, [productCanvasRef, productCanvasProps, scale, activeMaterial, materials]);


  /**
   * Create Fabric.js objects from design elements
   */
  const populateCanvasFromData = useCallback(async (canvas, elements, savedCanvasDimensions, skipLoadingState = false, viewId = null, onProgressUpdate = null) => {
    if (!canvas || !elements || elements.length === 0) {
      // Update loading state: no elements to load
      if (onLoadingStateChange && !skipLoadingState) {
        onLoadingStateChange({ isLoading: false, loaded: 0, total: 0, message: '' });
      }
      return;
    }

    console.log('Populating canvas from saved data:', elements);
    console.log('Saved canvas dimensions:', savedCanvasDimensions);
    console.log('Current canvas size:', canvas.width, canvas.height);
    console.log('Current objects on canvas before clearing:', canvas.getObjects().length);

    // Count assets that need to be loaded (images, SVG files, etc.)
    const assetsToLoad = elements.filter(el => 
      el.type === 'image' || 
      el.type === 'artwork' || 
      (el.type === 'group' && (el.imageUrl || el.artworkId))
    );
    const totalAssets = assetsToLoad.length;
    let loadedAssets = 0;

    // Start loading state (skip if loading from local state for view switching)
    // If onProgressUpdate is provided, we're managing progress globally (multi-view load)
    if (!skipLoadingState && !onProgressUpdate) {
      updateLoadingState({ isLoading: true, loaded: 0, total: totalAssets, message: 'Loading project...' });
    }

    // IMPORTANT: Only clear canvas if we're loading a single view (not multi-view load)
    // When loading multiple views, we add to the canvas, not replace it
    // Check if viewsLoadedRef exists and is false (initial load) or if we're not in multi-view mode
    const isMultiViewLoad = onProgressUpdate !== null;
    if (!isMultiViewLoad) {
      // Single view load - clear canvas
      const existingObjects = canvas.getObjects();
      const constraintOverlayObj = existingObjects.find(obj => obj.excludeFromExport === true);
      const objectsToRemove = existingObjects.filter(obj => obj !== constraintOverlayObj);
      if (objectsToRemove.length > 0) {
        canvas.remove(...objectsToRemove);
        console.log('Canvas cleared. Remaining objects:', canvas.getObjects().length);
      }
    } else {
      console.log('Skipping canvas clear - loading additional view:', viewId);
    }

    // FIXED CANVAS SIZE: Always use 1000px width
    const FIXED_CANVAS_WIDTH = 1000;
    
    // Sort by zIndex to maintain layer order
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const element of sortedElements) {
      try {
        // Check if object with this elementId AND viewId already exists (prevent duplicates within same view)
        // Allow same elementId in different views (e.g., same text element in front and back)
        const existingObjects = canvas.getObjects();
        const existingObject = existingObjects.find(obj => 
          obj.elementId === element.id && 
          (obj.viewId === viewId || (obj.viewId === null && viewId === null))
        );
        if (existingObject) {
          console.log(`⚠ Skipping duplicate element ${element.id} with viewId ${viewId} - already exists on canvas`);
          continue;
        }
        
        let fabricObject = null;
        
        // LOAD PIXEL VALUES DIRECTLY (preferred) or fall back to inches conversion for backward compatibility
        let baseLeft, baseTop;
        const elementIndex = sortedElements.indexOf(element);
        
        console.log(`=== LOAD Element ${elementIndex} (${element.type}) ===`);
        console.log('Saved element data:', {
          xPx: element.xPx,
          yPx: element.yPx,
          x: element.x,
          y: element.y,
          fontSizePx: element.fontSizePx,
          fontSize: element.fontSize,
          widthPx: element.widthPx,
          heightPx: element.heightPx,
          width: element.width,
          height: element.height,
          scaleX: element.scaleX,
          scaleY: element.scaleY,
          rotation: element.rotation
        });
        
        if (element.xPx !== undefined && element.yPx !== undefined) {
          // New format: Use pixel values directly
          baseLeft = element.xPx;
          baseTop = element.yPx;
          console.log(`✓ Using pixel values directly:`, { xPx: element.xPx, yPx: element.yPx });
        } else {
          // Backward compatibility: Convert from inches (old saved projects)
          const loadScale = scale.current;
          baseLeft = inchesToPixels(element.x || 0, loadScale);
          baseTop = inchesToPixels(element.y || 0, loadScale);
          console.log(`⚠ Converting from inches (backward compat):`, { 
            x: element.x, 
            y: element.y, 
            scale: loadScale,
            converted: { baseLeft, baseTop } 
          });
        }
        
        console.log('Calculated position:', { baseLeft, baseTop });
        
        // Get saved origin point (defaults vary by object type)
        // For groups/artwork/path/images, default to 'center' (matches how they're created)
        // For text objects default to 'left'/'top'
        const savedOriginX = element.originX !== undefined 
          ? element.originX 
          : (element.type === 'group' || element.type === 'artwork' || element.type === 'path' || element.type === 'path-group' || element.type === 'image' || element.type === 'imagebox' ? 'center' : 'left');
        const savedOriginY = element.originY !== undefined 
          ? element.originY 
          : (element.type === 'group' || element.type === 'artwork' || element.type === 'path' || element.type === 'path-group' || element.type === 'image' || element.type === 'imagebox' ? 'center' : 'top');
        
        // Initialize baseProps with saved values
        // IMPORTANT: Use saved scaleX/scaleY directly (preserves flip state: negative = flipped)
        // For groups/images, these may be recalculated later, but we preserve the sign
        const baseProps = {
          left: baseLeft,
          top: baseTop,
          scaleX: element.scaleX !== undefined ? element.scaleX : 1, // Preserve negative values (flip state)
          scaleY: element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1), // Preserve negative values
          angle: element.rotation !== undefined ? element.rotation : 0, // Preserve rotation
          opacity: element.opacity !== undefined ? element.opacity : 1,
          fill: element.fill || '#000000',
          originX: savedOriginX, // Use saved origin point
          originY: savedOriginY, // Use saved origin point
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          selectable: true
        };
        
        console.log('BaseProps initialized:', {
          scaleX: baseProps.scaleX,
          scaleY: baseProps.scaleY,
          angle: baseProps.angle,
          savedScaleX: element.scaleX,
          savedScaleY: element.scaleY,
          savedRotation: element.rotation,
          left: baseProps.left,
          top: baseProps.top,
          originX: baseProps.originX,
          originY: baseProps.originY,
          elementType: element.type,
          hasSavedOriginX: element.originX !== undefined,
          hasSavedOriginY: element.originY !== undefined
        });

        // Add stroke properties if they exist
        if (element.stroke !== undefined && element.stroke !== null) {
          baseProps.stroke = element.stroke;
        }
        if (element.strokeWidthPx !== undefined) {
          // New format: Use pixel value directly
          baseProps.strokeWidth = element.strokeWidthPx;
        } else if (element.strokeWidth !== undefined && element.strokeWidth !== null) {
          // Backward compatibility: Convert from inches
          baseProps.strokeWidth = inchesToPixels(element.strokeWidth, scale.current);
        }

        // Restore customData
        const customData = {
          artworkId: element.artworkId,
          artworkName: element.artworkName,
          category: element.category,
          currentColor: element.fill,
          currentColorId: element.colorId,
          currentOpacity: element.opacity,
          currentStrokeColor: element.stroke,
          currentStrokeWidth: element.strokeWidthPx !== undefined ? element.strokeWidthPx : (element.strokeWidth ? inchesToPixels(element.strokeWidth, scale.current) : undefined),
          originalSource: element.imageUrl || element.content,
          defaultWidthInches: element.defaultWidthInches
        };
        // Remove undefined values
        Object.keys(customData).forEach(key => {
          if (customData[key] === undefined) delete customData[key];
        });
        baseProps.customData = customData;

        if (element.type === 'text' || element.type === 'i-text' || element.type === 'itext' || element.type === 'textbox') {
          // Create Fabric.js Text object
          // LOAD FINAL FONT SIZE FROM PIXELS DIRECTLY - no scaling needed
          // fontSizePx is the final rendered fontSize (already includes scaleX), so scaleX = 1
          let finalFontSizePx;
          if (element.fontSizePx !== undefined) {
            // New format: fontSizePx is the final rendered size, use it directly
            finalFontSizePx = element.fontSizePx;
            console.log(`✓ Using final fontSizePx directly (no scaling):`, finalFontSizePx);
          } else {
            // Backward compatibility: Convert from inches
            // Old format might have saved base fontSize, so check if scaleX needs to be applied
            const fontSizeFromInches = inchesToPixels(element.fontSize || 12, scale.current);
            // If scaleX exists and is not 1, the old format saved base fontSize
            // Multiply by scaleX to get final fontSize
            finalFontSizePx = element.scaleX && element.scaleX !== 1 
              ? fontSizeFromInches * element.scaleX 
              : fontSizeFromInches;
            console.log(`⚠ Converting fontSize from inches (backward compat):`, { 
              fontSize: element.fontSize, 
              scale: scale.current,
              converted: fontSizeFromInches,
              scaleX: element.scaleX,
              finalFontSizePx
            });
          }
          
          // For text, set scaleX/scaleY to 1 since fontSize already includes the scale
          baseProps.scaleX = 1;
          baseProps.scaleY = 1;
          
          // Use saved origin point or default to center (matching how text is created)
          const originX = element.originX || 'center';
          const originY = element.originY || 'center';
          
          console.log('Text object properties:', {
            content: element.content,
            fontSize: finalFontSizePx,
            scaleX: 1, // No scaling - fontSize is final size
            scaleY: 1,
            left: baseLeft,
            top: baseTop,
            originX: originX,
            originY: originY
          });
          
          // Use IText for inline editing support (double-click to edit)
          // Convert charSpacing from saved format (pixels) to pixels
          // If charSpacing is saved as percent, we need to convert it, but it should be saved as pixels
          const charSpacingPx = element.charSpacing !== undefined ? element.charSpacing : 0;
          
          fabricObject = new fabric.IText(element.content || 'Text', {
            ...baseProps,
            fontSize: finalFontSizePx, // Final fontSize, no scaling needed
            fontFamily: element.font || 'Arial',
            fontWeight: element.fontWeight || 'normal',
            fontStyle: element.fontStyle || 'normal',
            textAlign: element.textAlign || 'left',
            lineHeight: element.lineHeight !== undefined ? element.lineHeight : 1.2,
            charSpacing: charSpacingPx, // Letter spacing in pixels
            originX: originX, // Use saved origin point
            originY: originY, // Use saved origin point
            editable: true, // Enable inline editing
            selectable: true, // Allow selection for moving/scaling
            viewId: viewId // Tag with view ID for show/hide management
          });
        } else if (element.type === 'image' || element.type === 'imagebox') {
          // Create Fabric.js Image object
          // Use artworkData from Supabase (define at function scope so it's accessible)
          const allArtwork = artworkData || [];
          
          // If we have artworkId but no imageUrl (or only data URL), look up the artwork
          let resolvedImageUrl = element.imageUrl || null;
          if ((!resolvedImageUrl || resolvedImageUrl.startsWith('data:')) && element.artworkId && allArtwork.length > 0) {
            const artworkItem = allArtwork.find(a => {
              const aId = (a.id || '').toString().trim();
              const eId = element.artworkId.toString().trim();
              return aId === eId || aId.toLowerCase() === eId.toLowerCase();
            });
            if (artworkItem && (artworkItem.imageUrl || artworkItem.image_url)) {
              resolvedImageUrl = artworkItem.imageUrl || artworkItem.image_url;
              console.log('✓ Resolved imageUrl from artwork lookup for image element:', {
                elementId: element.id,
                artworkId: element.artworkId,
                resolvedImageUrl: resolvedImageUrl
              });
            }
          }
          
          // Prioritize imageUrl over content to avoid using data URLs when we have a proper URL
          // Only use content if imageUrl is not available or is a data URL
          let imageSrc = null;
          if (resolvedImageUrl && !resolvedImageUrl.startsWith('data:')) {
            // Prefer resolved imageUrl if it's a proper URL (not a data URL)
            imageSrc = resolvedImageUrl;
          } else if (element.imageUrl && !element.imageUrl.startsWith('data:')) {
            // Prefer imageUrl if it's a proper URL (not a data URL)
            imageSrc = element.imageUrl;
          } else if (element.content && !element.content.startsWith('data:')) {
            // Use content if it's a proper URL
            imageSrc = element.content;
          } else {
            // Fallback to whatever is available (even if data URL)
            imageSrc = resolvedImageUrl || element.imageUrl || element.content || '';
          }
          
          console.log('Loading image element:', {
            elementId: element.id,
            elementType: element.type,
            imageSrc: imageSrc,
            hasImageSrc: !!imageSrc,
            isSvg: imageSrc && imageSrc.toLowerCase().endsWith('.svg'),
            elementImageUrl: element.imageUrl,
            elementContent: element.content ? element.content.substring(0, 50) + '...' : null,
            elementArtworkId: element.artworkId,
            resolvedImageUrl: resolvedImageUrl,
            elementKeys: Object.keys(element)
          });
          
          if (imageSrc && imageSrc.trim()) {
            // Load image asynchronously (supports both SVG and regular images)
            try {
              // Try Promise-based API first (Fabric.js v6), then fallback to callback
              let img;
              const imgResult = fabric.Image.fromURL(imageSrc, { crossOrigin: 'anonymous' });
              
              if (imgResult && typeof imgResult.then === 'function') {
                // Promise-based API
                console.log('Using Promise-based API for image loading');
                img = await imgResult;
              } else {
                // Callback-based API
                console.log('Using callback-based API for image loading');
                img = await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Image loading timeout'));
                  }, 30000); // 30 second timeout
                  
                  fabric.Image.fromURL(imageSrc, (loadedImg) => {
                    clearTimeout(timeout);
                    if (loadedImg) {
                      resolve(loadedImg);
                    } else {
                      reject(new Error('fabric.Image.fromURL returned null'));
                    }
                  }, { crossOrigin: 'anonymous' });
                });
              }
              
              if (!img) {
                throw new Error('Failed to load image - img is null or undefined');
              }
              
              console.log('Image loaded successfully:', {
                type: img.type,
                width: img.width,
                height: img.height,
                imageSrc: imageSrc
              });
              
              // Look up artwork metadata if available (must be done before using imageMinWidthInches)
              let imageMinWidthInches = null;
              if (element.artworkId) {
                // Look up artwork item to get minWidth
                const imageArtworkItem = allArtwork.find(a => a.id === element.artworkId);
                if (imageArtworkItem && imageArtworkItem.minWidth) {
                  imageMinWidthInches = imageArtworkItem.minWidth;
                  console.log('Found minWidth for image artwork:', {
                    artworkId: element.artworkId,
                    minWidthInches: imageMinWidthInches
                  });
                }
              }
              
              // LOAD DIMENSIONS FROM PIXELS DIRECTLY (preferred) or fall back to inches conversion
              const savedWidth = element.width || 0;
              const savedHeight = element.height || 0;
              let targetWidthPx, targetHeightPx;
              
              if (element.widthPx !== undefined && element.heightPx !== undefined) {
                // New format: Use pixel values directly
                targetWidthPx = element.widthPx;
                targetHeightPx = element.heightPx;
              } else if (savedWidth > 0 && savedHeight > 0) {
                // Backward compatibility: Convert from inches
                targetWidthPx = inchesToPixels(savedWidth, scale.current);
                targetHeightPx = inchesToPixels(savedHeight, scale.current);
              }
              
              if (targetWidthPx > 0 && targetHeightPx > 0 && img.width > 0 && img.height > 0) {
                // Calculate scale magnitude based on dimensions
                const scaleMagnitudeX = targetWidthPx / img.width;
                const scaleMagnitudeY = targetHeightPx / img.height;
                
                // IMPORTANT: Preserve flip state (sign) from saved scaleX/scaleY
                // Use !== undefined to allow negative values (flip state)
                const savedScaleX = element.scaleX !== undefined ? element.scaleX : 1;
                const savedScaleY = element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1);
                
                // Apply the sign (positive or negative) from saved scale to the calculated magnitude
                baseProps.scaleX = Math.sign(savedScaleX) * Math.abs(scaleMagnitudeX);
                baseProps.scaleY = Math.sign(savedScaleY) * Math.abs(scaleMagnitudeY);
                
                console.log('Calculated image scale (preserving flip state):', { 
                  scaleX: baseProps.scaleX, 
                  scaleY: baseProps.scaleY,
                  savedScaleX,
                  savedScaleY,
                  targetWidthPx,
                  targetHeightPx,
                  imgWidth: img.width,
                  imgHeight: img.height
                });
              } else {
                // Fall back to saved scaleX/scaleY (preserves flip state - use !== undefined to allow negative values)
                baseProps.scaleX = element.scaleX !== undefined ? element.scaleX : 1;
                baseProps.scaleY = element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1);
                console.log('Using saved scaleX/scaleY (dimensions not available):', {
                  scaleX: baseProps.scaleX,
                  scaleY: baseProps.scaleY,
                  targetWidthPx,
                  targetHeightPx,
                  imgWidth: img.width,
                  imgHeight: img.height
                });
              }
              
              // Ensure rotation is applied (Fabric.js uses 'angle' property)
              baseProps.angle = element.rotation !== undefined ? element.rotation : (baseProps.angle || 0);

              // Check if image should be flipped (negative scaleX/scaleY)
              const shouldFlipX = baseProps.scaleX < 0;
              const shouldFlipY = baseProps.scaleY < 0;
              const absScaleX = Math.abs(baseProps.scaleX);
              const absScaleY = Math.abs(baseProps.scaleY);
              
              console.log('Loading image with flip state:', {
                elementId: element.id,
                savedScaleX: baseProps.scaleX,
                savedScaleY: baseProps.scaleY,
                shouldFlipX: shouldFlipX,
                shouldFlipY: shouldFlipY,
                absScaleX: absScaleX,
                absScaleY: absScaleY
              });
              
              // Set properties - use negative scaleX/scaleY for flip
              // Fabric.js may normalize these, so we'll verify and apply fallback if needed
              // If minWidth exists, lock aspect ratio
              const imageLockUniScaling = !!imageMinWidthInches;
              img.set({
                ...baseProps,
                left: baseProps.left,
                top: baseProps.top,
                angle: baseProps.angle,
                scaleX: shouldFlipX ? -absScaleX : absScaleX,
                scaleY: shouldFlipY ? -absScaleY : absScaleY,
                opacity: baseProps.opacity,
                originX: baseProps.originX || 'center',
                originY: baseProps.originY || 'center',
                flipX: shouldFlipX, // Try setting flipX/flipY too
                flipY: shouldFlipY,
                viewId: viewId || null, // Tag with view ID for show/hide management
                lockUniScaling: imageLockUniScaling // Lock aspect ratio if minWidth exists
              });
              img.setCoords(); // Force recalculation of coordinates
              
              // Verify flip state was applied correctly
              const verifyScaleX = img.scaleX || img.get('scaleX');
              const verifyScaleY = img.scaleY || img.get('scaleY');
              const verifyFlipX = img.flipX || img.get('flipX');
              const verifyFlipY = img.flipY || img.get('flipY');
              
              console.log('Image flip state after set:', {
                elementId: element.id,
                scaleX: verifyScaleX,
                scaleY: verifyScaleY,
                flipX: verifyFlipX,
                flipY: verifyFlipY,
                isFlippedX: verifyFlipX || verifyScaleX < 0,
                isFlippedY: verifyFlipY || verifyScaleY < 0
              });
              
              // If Fabric.js normalized the negative scale, apply CSS transform as fallback
              if (shouldFlipX && verifyScaleX > 0 && !verifyFlipX) {
                console.warn('Fabric.js normalized negative scaleX, applying CSS transform fallback');
                const element = img._element || img.getElement();
                if (element) {
                  element.style.transform = `scaleX(-1)`;
                }
                // Also try setting flipX again
                img.set({ flipX: true });
              }
              if (shouldFlipY && verifyScaleY > 0 && !verifyFlipY) {
                console.warn('Fabric.js normalized negative scaleY, applying CSS transform fallback');
                const element = img._element || img.getElement();
                if (element) {
                  const currentTransform = element.style.transform || '';
                  element.style.transform = currentTransform ? `${currentTransform} scaleY(-1)` : `scaleY(-1)`;
                }
                // Also try setting flipY again
                img.set({ flipY: true });
              }
              
                  img.elementId = element.id;
                  img.viewId = viewId || null; // Tag with view ID for show/hide management
                  img.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                  
                  // Store original opacity for visibility toggling
                  if (img.originalOpacity === undefined) {
                    img.originalOpacity = img.opacity !== undefined ? img.opacity : 1;
                  }
              
              // Store artwork metadata if available (imageMinWidthInches already set above)
              if (element.artworkId) {
                img.artworkId = element.artworkId;
              }
              if (element.category) {
                img.category = element.category;
              }
              
              // Store in customData for proper serialization when saving
              img.customData = {
                artworkId: element.artworkId || null,
                category: element.category || null,
                imageUrl: imageSrc, // Store original URL, not modified data URL
                originalSource: imageSrc // Also store as originalSource for backward compatibility
              };
              
              // Apply color modifications if saved (for SVG images)
              if (element.fill && imageSrc.toLowerCase().endsWith('.svg')) {
                console.log('Applying saved color to SVG image:', {
                  elementId: element.id,
                  savedColor: element.fill,
                  imageSrc: imageSrc
                });
                
                // Use the same color change logic as OptionsPanel
                try {
                  // Fetch the SVG content
                  const response = await fetch(imageSrc);
                  if (response.ok) {
                    const svgText = await response.text();
                    
                    // Parse SVG and modify fill attributes
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                    const svgElement = svgDoc.documentElement;
                    
                    // Function to recursively set fill on all elements
                    const setFillRecursive = (el, color) => {
                      const tagName = el.tagName?.toLowerCase();
                      if (tagName === 'style' || tagName === 'script' || tagName === 'defs') {
                        return;
                      }
                      
                      const currentFill = el.getAttribute('fill');
                      if (currentFill !== null) {
                        if (!currentFill.startsWith('url(') && currentFill !== 'none') {
                          el.setAttribute('fill', color);
                        }
                      } else {
                        const shapeElements = ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line'];
                        if (shapeElements.includes(tagName)) {
                          const hasStroke = el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none';
                          if (!hasStroke || tagName === 'path' || tagName === 'circle' || tagName === 'ellipse' || tagName === 'rect' || tagName === 'polygon') {
                            el.setAttribute('fill', color);
                          }
                        }
                      }
                      
                      Array.from(el.children).forEach(child => {
                        setFillRecursive(child, color);
                      });
                    };
                    
                    // Set fill color on all elements
                    setFillRecursive(svgElement, element.fill);
                    
                    // Serialize back to string
                    const serializer = new XMLSerializer();
                    const modifiedSvg = serializer.serializeToString(svgElement);
                    
                    // Convert SVG to data URL
                    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSvg);
                    
                    // Reload the image with the modified SVG
                    const coloredImgResult = fabric.Image.fromURL(svgDataUrl, { crossOrigin: 'anonymous' });
                    let coloredImg;
                    
                    if (coloredImgResult && typeof coloredImgResult.then === 'function') {
                      coloredImg = await coloredImgResult;
                    } else {
                      coloredImg = await new Promise((resolve, reject) => {
                        fabric.Image.fromURL(svgDataUrl, (loadedImg) => {
                          if (loadedImg) {
                            resolve(loadedImg);
                          } else {
                            reject(new Error('Failed to load colored SVG'));
                          }
                        }, { crossOrigin: 'anonymous' });
                      });
                    }
                    
                    if (coloredImg) {
                      // Remove old image and add colored version
                      canvas.remove(img);
                      
                      // Apply all properties to the colored image
                      // Use the original image's position and flip state if available, otherwise use baseProps
                      const finalLeft = (img.left !== undefined && img.left !== null) ? img.left : baseProps.left;
                      const finalTop = (img.top !== undefined && img.top !== null) ? img.top : baseProps.top;
                      const finalScaleX = (img.scaleX !== undefined && img.scaleX !== null) ? img.scaleX : baseProps.scaleX;
                      const finalScaleY = (img.scaleY !== undefined && img.scaleY !== null) ? img.scaleY : baseProps.scaleY;
                      const finalFlipX = img.flipX !== undefined ? img.flipX : false;
                      const finalFlipY = img.flipY !== undefined ? img.flipY : false;
                      
                      // Preserve origin point from original image or use baseProps
                      const finalOriginX = (img.originX !== undefined && img.originX !== null) 
                        ? (img.get ? img.get('originX') : img.originX)
                        : (baseProps.originX || 'center');
                      const finalOriginY = (img.originY !== undefined && img.originY !== null)
                        ? (img.get ? img.get('originY') : img.originY)
                        : (baseProps.originY || 'center');
                      
                      coloredImg.set({
                        left: finalLeft,
                        top: finalTop,
                        angle: baseProps.angle,
                        scaleX: finalScaleX,
                        scaleY: finalScaleY,
                        flipX: finalFlipX,
                        flipY: finalFlipY,
                        opacity: baseProps.opacity,
                        originX: finalOriginX,
                        originY: finalOriginY
                      });
                      coloredImg.setCoords();
                      coloredImg.elementId = element.id;
                      coloredImg.viewId = viewId || null; // Tag with view ID for show/hide management
                      coloredImg.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                      
                      // Store metadata
                      if (element.artworkId) {
                        coloredImg.artworkId = element.artworkId;
                      }
                      if (element.category) {
                        coloredImg.category = element.category;
                      }
                      
                      // Store color in customData
                      coloredImg.set('customData', {
                        artworkId: element.artworkId || null,
                        category: element.category || null,
                        imageUrl: imageSrc, // Store original URL, not modified data URL
                        originalSource: imageSrc,
                        currentColor: element.fill,
                        currentColorId: element.colorId,
                        currentOpacity: element.opacity,
                        minWidthInches: imageMinWidthInches || null // Store minWidth if it exists
                      });
                      
                      // Set lockUniScaling on colored image if minWidth exists
                      if (imageMinWidthInches) {
                        coloredImg.set('lockUniScaling', true);
                      }
                      
                      canvas.add(coloredImg);
                      canvas.renderAll();
                      
                      console.log('Colored SVG image successfully added to canvas:', {
                        elementId: element.id,
                        color: element.fill,
                        left: coloredImg.left,
                        top: coloredImg.top,
                        scaleX: coloredImg.scaleX,
                        scaleY: coloredImg.scaleY,
                        flipX: coloredImg.flipX,
                        flipY: coloredImg.flipY,
                        originalImgLeft: img.left,
                        originalImgTop: img.top,
                        basePropsLeft: baseProps.left,
                        basePropsTop: baseProps.top
                      });
                      
                      // Update loading progress
                      loadedAssets++;
                      if (onProgressUpdate) {
                        // Multi-view load - use global progress callback
                        onProgressUpdate(1);
                      } else if (!skipLoadingState) {
                        // Single view load - update local progress
                        updateLoadingState({ 
                          loaded: loadedAssets, 
                          message: `Loading project... (${loadedAssets}/${totalAssets})` 
                        });
                      }
                      
                      continue; // Skip to next element
                    }
                  }
                } catch (colorErr) {
                  console.error('Error applying color to SVG:', colorErr);
                  // Continue with original image if color application fails
                }
              }
              
              // Store color in customData if available (even if not SVG)
              const imageCustomData = {
                artworkId: element.artworkId || null,
                category: element.category || null,
                imageUrl: imageSrc, // Store original URL, not modified data URL
                originalSource: imageSrc
              };
              if (element.fill) {
                imageCustomData.currentColor = element.fill;
                imageCustomData.currentColorId = element.colorId;
                imageCustomData.currentOpacity = element.opacity;
              }
              if (imageMinWidthInches) {
                imageCustomData.minWidthInches = imageMinWidthInches;
              }
              img.set('customData', imageCustomData);
              
              canvas.add(img);
              canvas.renderAll();
              console.log('Image successfully added to canvas:', {
                elementId: element.id,
                type: img.type,
                left: img.left,
                top: img.top,
                scaleX: img.scaleX,
                scaleY: img.scaleY,
                hasColorModification: !!element.fill
              });
            } catch (err) {
              console.error('Error loading image:', err);
              console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                imageSrc: imageSrc,
                elementId: element.id,
                elementType: element.type
              });
            }
            continue; // Skip to next element, image was added
          } else {
            console.warn('No image source found for image element:', {
              elementId: element.id,
              elementType: element.type,
              content: element.content,
              imageUrl: element.imageUrl
            });
            // No image source, create placeholder
            fabricObject = new fabric.Image('', baseProps);
          }
        } else if (element.type === 'group' || element.type === 'artwork') {
          // Handle groups (SVG artwork with textures)
          let imageUrl = element.imageUrl || element.content;
          let textureUrl = element.textureUrl;
          
          // Normalize empty strings to null/undefined for easier checking
          if (imageUrl && imageUrl.trim() === '') imageUrl = null;
          if (textureUrl && textureUrl.trim() === '') textureUrl = null;
          
          // Use artworkData from Supabase
          const allArtwork = artworkData || [];
          
          // Fallback: If imageUrl or textureUrl is missing but we have artworkId, look it up from artwork data
          // Also check if we can infer artworkId from category or other properties
          let artworkId = element.artworkId;
          
          // If artworkId is missing but we have textureUrl, try to find matching artwork
          // First try with category if available, then fall back to textureUrl only
          if (!artworkId && textureUrl) {
            let foundArtwork = null;
            
            // Try with category first if available
            if (element.category) {
              foundArtwork = allArtwork.find(a => a.category === element.category && a.textureUrl === textureUrl);
            }
            
            // If not found with category, try textureUrl only
            if (!foundArtwork) {
              foundArtwork = allArtwork.find(a => a.textureUrl === textureUrl);
            }
            
            if (foundArtwork) {
              artworkId = foundArtwork.id;
              console.log('Inferred artworkId from textureUrl:', {
                category: element.category || 'none',
                textureUrl: textureUrl,
                artworkId: artworkId,
                foundCategory: foundArtwork.category
              });
            }
          }
          
          // Get artwork item and minWidth if available
          let artworkItem = null;
          let minWidthInches = null;
          if (artworkId) {
            artworkItem = allArtwork.find(a => a.id === artworkId);
            if (artworkItem) {
              if ((!imageUrl || imageUrl.trim() === '') && artworkItem.imageUrl) {
                imageUrl = artworkItem.imageUrl;
                console.log('Found imageUrl from artworkId lookup:', {
                  artworkId: artworkId,
                  imageUrl: imageUrl
                });
              }
              if ((!textureUrl || textureUrl.trim() === '') && artworkItem.textureUrl) {
                textureUrl = artworkItem.textureUrl;
                console.log('Found textureUrl from artworkId lookup:', {
                  artworkId: artworkId,
                  textureUrl: textureUrl
                });
              }
              // Get minWidth from artwork item
              if (artworkItem.minWidth) {
                minWidthInches = artworkItem.minWidth;
                console.log('Found minWidth from artwork item:', {
                  artworkId: artworkId,
                  minWidthInches: minWidthInches
                });
              }
            } else {
              console.warn('Artwork not found in artworkData for artworkId:', artworkId);
            }
          }
          
          console.log('Loading artwork/group element:', {
            elementId: element.id,
            elementType: element.type,
            imageUrl: imageUrl,
            textureUrl: textureUrl,
            artworkId: element.artworkId,
            hasImageUrl: !!imageUrl,
            elementKeys: Object.keys(element)
          });
          
          // Skip DXF files - they should have been converted to SVG in admin area
          if (imageUrl && imageUrl.trim() && (imageUrl.endsWith('.dxf') || imageUrl.endsWith('.DXF'))) {
            console.warn('DXF files are no longer supported. Please convert DXF files to SVG in the admin area:', {
              elementId: element.id,
              imageUrl: imageUrl
            });
            continue; // Skip this element
          }
          
          // Final check: if we still don't have imageUrl but have textureUrl, try one more lookup
          // Try with category first if available, then fall back to textureUrl only
          if ((!imageUrl || !imageUrl.trim()) && textureUrl) {
            let foundArtwork = null;
            
            // Try with category first if available
            if (element.category) {
              foundArtwork = allArtwork.find(a => a.category === element.category && a.textureUrl === textureUrl && a.imageUrl);
            }
            
            // If not found with category, try textureUrl only
            if (!foundArtwork) {
              foundArtwork = allArtwork.find(a => a.textureUrl === textureUrl && a.imageUrl);
            }
            
            if (foundArtwork && foundArtwork.imageUrl) {
              imageUrl = foundArtwork.imageUrl;
              console.log('Final fallback: Found imageUrl from textureUrl match:', {
                category: element.category || 'none',
                textureUrl: textureUrl,
                imageUrl: imageUrl,
                artworkId: foundArtwork.id,
                foundCategory: foundArtwork.category
              });
              // Update artworkId if we found it
              if (!artworkId && foundArtwork.id) {
                artworkId = foundArtwork.id;
              }
            }
          }
          
          // Skip DXF files - they should have been converted to SVG in admin area
          if (imageUrl && imageUrl.trim() && (imageUrl.endsWith('.dxf') || imageUrl.endsWith('.DXF'))) {
            console.warn('DXF files are no longer supported. Please convert DXF files to SVG in the admin area:', {
              elementId: element.id,
              imageUrl: imageUrl
            });
            continue; // Skip this element
          }
          
          if (imageUrl && imageUrl.trim()) {
            // Check if this is panel artwork that should be loaded as SVG paths with texture
            const isSvg = imageUrl.toLowerCase().endsWith('.svg');
            const isPanelArtwork = textureUrl || 
                                   (element.category && element.category.toLowerCase() === 'panels') ||
                                   (element.artworkId && element.artworkId.toLowerCase().startsWith('panel'));
            
            // If it's SVG with texture (panel artwork), route to path restoration logic
            if (isSvg && isPanelArtwork) {
              console.log('Detected panel artwork SVG, routing to path restoration:', {
                elementId: element.id,
                imageUrl: imageUrl,
                textureUrl: textureUrl,
                artworkId: element.artworkId
              });
              
              // Convert element type to 'path' to use path restoration logic
              const pathElement = {
                ...element,
                type: 'path'
              };
              
              // Use the path restoration logic (which handles SVG + texture)
              // We'll fall through to the path handling section below
              // For now, let's handle it inline here
              try {
                // Get artworkId from element
                let artworkId = element.artworkId || null;
                
                if (!artworkId && element.imageUrl) {
                  const imageUrlMatch = element.imageUrl.match(/artwork\/([^\/]+)\/image-/);
                  if (imageUrlMatch && imageUrlMatch[1]) {
                    artworkId = imageUrlMatch[1].trim();
                  }
                }
                
                if (!artworkId) {
                  console.warn('Panel artwork missing artworkId:', {
                    elementId: element.id,
                    imageUrl: element.imageUrl
                  });
                  continue;
                }
                
                // Look up artwork data
                let artworkItem = allArtwork.find(a => {
                  const aId = (a.id || '').toString().trim();
                  const eId = artworkId.toString().trim();
                  return aId === eId || aId.toLowerCase() === eId.toLowerCase();
                });
                
                if (!artworkItem && element.artworkName) {
                  artworkItem = allArtwork.find(a => 
                    (a.name || '').toString().trim() === element.artworkName.toString().trim()
                  );
                }
                
                if (!artworkItem) {
                  console.warn('Panel artwork not found:', {
                    artworkId: artworkId,
                    artworkName: element.artworkName
                  });
                  continue;
                }
                
                // Get minWidth from artwork item
                let panelMinWidthInches = null;
                if (artworkItem.minWidth) {
                  panelMinWidthInches = artworkItem.minWidth;
                  console.log('Found minWidth for panel artwork:', {
                    artworkId: artworkId,
                    minWidthInches: panelMinWidthInches
                  });
                }
                
                // Fetch SVG content
                const response = await fetch(imageUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch SVG: ${response.statusText}`);
                }
                const svgString = await response.text();
                
                // Load SVG into Fabric.js as objects
                // Try Promise-based API first, then fallback to callback
                let loadResult;
                try {
                  // Try as Promise
                  loadResult = await fabric.loadSVGFromString(svgString);
                } catch (promiseErr) {
                  // If that fails, try callback-based API
                  loadResult = await new Promise((resolve, reject) => {
                    fabric.loadSVGFromString(svgString, (objects, options) => {
                      if (objects && objects.length > 0) {
                        resolve({ objects, options });
                      } else {
                        reject(new Error('No objects loaded from SVG (callback)'));
                      }
                    }, (err) => {
                      reject(err || new Error('Failed to load SVG'));
                    });
                  });
                }
                
                const svgObjects = loadResult.objects || loadResult;
                const svgOptions = loadResult.options || {};
                
                const objectsArray = Array.isArray(svgObjects) ? svgObjects : [svgObjects].filter(Boolean);
                
                console.log('SVG loaded for panel artwork:', {
                  elementId: element.id,
                  objectsCount: objectsArray.length,
                  loadResultType: typeof loadResult,
                  hasObjects: !!loadResult.objects,
                  isArray: Array.isArray(svgObjects)
                });
                
                if (objectsArray.length === 0) {
                  throw new Error('No objects loaded from SVG');
                }
                
                // Create a group from SVG objects
                let svgGroup = objectsArray.length === 1 
                  ? objectsArray[0] 
                  : new fabric.Group(objectsArray, svgOptions || {});
                
                // Normalize stroke widths
                const normalizeStrokes = (obj) => {
                  if (obj.type === 'path' || obj.type === 'path-group') {
                    obj.stroke = null;
                    obj.strokeWidth = 0;
                  }
                  if (obj._objects && Array.isArray(obj._objects)) {
                    obj._objects.forEach(child => normalizeStrokes(child));
                  }
                };
                normalizeStrokes(svgGroup);
                
                // Apply saved fill color
                if (element.fill) {
                  const applyFill = (obj, fillColor) => {
                    if (obj.type === 'path' || obj.type === 'path-group') {
                      obj.fill = fillColor;
                    }
                    if (obj._objects && Array.isArray(obj._objects)) {
                      obj._objects.forEach(child => applyFill(child, fillColor));
                    }
                  };
                  applyFill(svgGroup, element.fill);
                }
                
                // Handle texture layer
                let resolvedTextureUrl = textureUrl || artworkItem.textureUrl || null;
                if (!resolvedTextureUrl && artworkItem.category && artworkItem.category.toLowerCase() === 'panels') {
                  resolvedTextureUrl = '/images/materials/panelbg.png';
                }
                
                const finalOriginX = baseProps.originX || 'center';
                const finalOriginY = baseProps.originY || 'center';
                
                svgGroup.set({
                  originX: finalOriginX,
                  originY: finalOriginY
                });
                
                let finalGroup = svgGroup;
                
                // Create texture layer if we have a texture URL
                if (resolvedTextureUrl) {
                  try {
                    const textureImgResult = fabric.Image.fromURL(resolvedTextureUrl, { crossOrigin: 'anonymous' });
                    let textureImg;
                    
                    if (textureImgResult && typeof textureImgResult.then === 'function') {
                      textureImg = await textureImgResult;
                    } else {
                      textureImg = await new Promise((resolve, reject) => {
                        fabric.Image.fromURL(resolvedTextureUrl, (loadedImg) => {
                          if (loadedImg) {
                            resolve(loadedImg);
                          } else {
                            reject(new Error('Failed to load texture image'));
                          }
                        }, { crossOrigin: 'anonymous' });
                      });
                    }
                    
                    if (textureImg) {
                      const svgBounds = svgGroup.getBoundingRect();
                      const svgWidth = svgBounds.width;
                      const svgHeight = svgBounds.height;
                      
                      // Scale texture to fit SVG bounds
                      const scaleX = svgWidth / textureImg.width;
                      const scaleY = svgHeight / textureImg.height;
                      const textureScale = Math.min(scaleX, scaleY);
                      
                      textureImg.set({
                        left: svgBounds.left,
                        top: svgBounds.top,
                        scaleX: textureScale,
                        scaleY: textureScale,
                        originX: 'left',
                        originY: 'top',
                        selectable: false,
                        evented: false
                      });
                      
                      // Create group with texture first, then SVG on top
                      finalGroup = new fabric.Group([textureImg, svgGroup], {
                        originX: finalOriginX,
                        originY: finalOriginY
                      });
                    }
                  } catch (textureErr) {
                    console.error('Error creating texture layer for panel artwork:', textureErr);
                    // Continue with SVG group only
                  }
                }
                
                // Ensure object dimensions are calculated before applying position
                finalGroup.setCoords();
                
                // Check if flip state was saved (negative scaleX/scaleY indicates flip)
                const shouldFlipX = baseProps.scaleX < 0;
                const shouldFlipY = baseProps.scaleY < 0;
                const absScaleX = Math.abs(baseProps.scaleX);
                const absScaleY = Math.abs(baseProps.scaleY);
                
                // Apply saved properties - set scale/origin first, then position
                // If minWidth exists, lock aspect ratio
                const panelLockUniScaling = !!panelMinWidthInches;
                finalGroup.set({
                  scaleX: shouldFlipX ? -absScaleX : absScaleX,
                  scaleY: shouldFlipY ? -absScaleY : absScaleY,
                  angle: baseProps.angle,
                  opacity: baseProps.opacity,
                  originX: finalOriginX,
                  originY: finalOriginY,
                  flipX: shouldFlipX,
                  flipY: shouldFlipY,
                  lockUniScaling: panelLockUniScaling // Lock aspect ratio if minWidth exists
                });
                
                // Update coordinates after setting scale/origin
                finalGroup.setCoords();
                
                // Now set position after dimensions are calculated
                finalGroup.set({
                  left: baseProps.left,
                  top: baseProps.top
                });
                
                // Final coordinate update to ensure position is correct
                finalGroup.setCoords();
                
                // Set metadata
                finalGroup.elementId = element.id;
                finalGroup.artworkId = artworkId;
                finalGroup.imageUrl = imageUrl;
                finalGroup.viewId = viewId || 'front'; // Ensure viewId is set
                finalGroup.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                
                finalGroup.set('customData', {
                  currentColor: element.fill,
                  currentColorId: element.colorId,
                  currentOpacity: element.opacity,
                  currentStrokeColor: element.stroke,
                  currentStrokeWidth: 0,
                  originalSource: imageUrl,
                  defaultWidthInches: element.defaultWidthInches,
                  minWidthInches: panelMinWidthInches || null // Store minWidth if it exists
                });
                
                // Check for duplicate again before adding (in case async processing allowed a duplicate to slip through)
                const currentObjects = canvas.getObjects();
                const duplicateCheck = currentObjects.find(obj => 
                  obj.elementId === element.id && 
                  (obj.viewId === (viewId || 'front') || (obj.viewId === null && viewId === null))
                );
                if (duplicateCheck) {
                  console.log(`⚠ Skipping duplicate panel artwork ${element.id} with viewId ${viewId || 'front'} - already exists on canvas (late check)`);
                  continue;
                }
                
                canvas.add(finalGroup);
                canvas.renderAll();
                
                console.log('Panel artwork restored successfully:', {
                  elementId: element.id,
                  artworkId: artworkId,
                  hasTexture: !!resolvedTextureUrl,
                  type: finalGroup.type
                });
                
                continue;
              } catch (pathErr) {
                console.error('Error restoring panel artwork as path:', pathErr);
                // Fall through to regular image loading as fallback
              }
            }
            
            // Try loading as regular image (including SVG files)
            console.log('Loading artwork image (SVG or regular image):', {
              imageUrl: imageUrl,
              isSvg: isSvg,
              elementId: element.id
            });
            
            try {
              // Try Promise-based API first (Fabric.js v6), then fallback to callback
              let img;
              const imgResult = fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
              
              if (imgResult && typeof imgResult.then === 'function') {
                // Promise-based API
                img = await imgResult;
              } else {
                // Callback-based API
                img = await new Promise((resolve, reject) => {
                  fabric.Image.fromURL(imageUrl, (loadedImg) => {
                    if (loadedImg) {
                      resolve(loadedImg);
                    } else {
                      reject(new Error('fabric.Image.fromURL returned null'));
                    }
                  }, { crossOrigin: 'anonymous' });
                });
              }
              
              if (!img) {
                throw new Error('Failed to load image - img is null or undefined');
              }
              
              console.log('Image loaded successfully:', {
                type: img.type,
                width: img.width,
                height: img.height,
                imageUrl: imageUrl
              });
              
              try {
                  // LOAD DIMENSIONS FROM PIXELS DIRECTLY (preferred) or fall back to inches conversion
                  const savedWidth = element.width || 0;
                  const savedHeight = element.height || 0;
                  let targetWidthPx, targetHeightPx;
                  
                  if (element.widthPx !== undefined && element.heightPx !== undefined) {
                    // New format: Use pixel values directly
                    targetWidthPx = element.widthPx;
                    targetHeightPx = element.heightPx;
                  } else if (savedWidth > 0 && savedHeight > 0) {
                    // Backward compatibility: Convert from inches
                    targetWidthPx = inchesToPixels(savedWidth, scale.current);
                    targetHeightPx = inchesToPixels(savedHeight, scale.current);
                  }
                  
                  if (targetWidthPx > 0 && targetHeightPx > 0 && img.width > 0 && img.height > 0) {
                    // Calculate scale magnitude based on dimensions
                    const scaleMagnitudeX = targetWidthPx / img.width;
                    const scaleMagnitudeY = targetHeightPx / img.height;
                    
                    // IMPORTANT: Preserve flip state (sign) from saved scaleX/scaleY
                    // Use !== undefined to allow negative values (flip state)
                    const savedScaleX = element.scaleX !== undefined ? element.scaleX : 1;
                    const savedScaleY = element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1);
                    
                    // Apply the sign (positive or negative) from saved scale to the calculated magnitude
                    baseProps.scaleX = Math.sign(savedScaleX) * Math.abs(scaleMagnitudeX);
                    baseProps.scaleY = Math.sign(savedScaleY) * Math.abs(scaleMagnitudeY);
                    
                    console.log('Calculated artwork image scale (preserving flip state):', { 
                      scaleX: baseProps.scaleX, 
                      scaleY: baseProps.scaleY,
                      savedScaleX,
                      savedScaleY
                    });
                  } else {
                    // Fall back to saved scaleX/scaleY (preserves flip state - use !== undefined to allow negative values)
                    baseProps.scaleX = element.scaleX !== undefined ? element.scaleX : 1;
                    baseProps.scaleY = element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1);
                  }
                  
                  // Ensure rotation is applied (Fabric.js uses 'angle' property)
                  baseProps.angle = element.rotation !== undefined ? element.rotation : (baseProps.angle || 0);

                  // Check if image should be flipped (negative scaleX/scaleY)
                  const shouldFlipX = baseProps.scaleX < 0;
                  const shouldFlipY = baseProps.scaleY < 0;
                  const absScaleX = Math.abs(baseProps.scaleX);
                  const absScaleY = Math.abs(baseProps.scaleY);
                  
                  console.log('Loading artwork image with flip state:', {
                    elementId: element.id,
                    savedScaleX: baseProps.scaleX,
                    savedScaleY: baseProps.scaleY,
                    shouldFlipX: shouldFlipX,
                    shouldFlipY: shouldFlipY,
                    absScaleX: absScaleX,
                    absScaleY: absScaleY
                  });
                  
                  // Set properties - use negative scaleX/scaleY for flip
                  img.set({
                    ...baseProps,
                    left: baseProps.left,
                    top: baseProps.top,
                    angle: baseProps.angle,
                    scaleX: shouldFlipX ? -absScaleX : absScaleX,
                    scaleY: shouldFlipY ? -absScaleY : absScaleY,
                    opacity: baseProps.opacity,
                    originX: baseProps.originX || 'center',
                    originY: baseProps.originY || 'center',
                    flipX: shouldFlipX, // Try setting flipX/flipY too
                    flipY: shouldFlipY
                  });
                  img.setCoords(); // Force recalculation of coordinates
                  
                  // Verify flip state was applied correctly
                  const verifyScaleX = img.scaleX || img.get('scaleX');
                  const verifyScaleY = img.scaleY || img.get('scaleY');
                  const verifyFlipX = img.flipX || img.get('flipX');
                  const verifyFlipY = img.flipY || img.get('flipY');
                  
                  console.log('Artwork image flip state after set:', {
                    elementId: element.id,
                    scaleX: verifyScaleX,
                    scaleY: verifyScaleY,
                    flipX: verifyFlipX,
                    flipY: verifyFlipY,
                    isFlippedX: verifyFlipX || verifyScaleX < 0,
                    isFlippedY: verifyFlipY || verifyScaleY < 0
                  });
                  
                  // If Fabric.js normalized the negative scale, apply CSS transform as fallback
                  if (shouldFlipX && verifyScaleX > 0 && !verifyFlipX) {
                    console.warn('Fabric.js normalized negative scaleX, applying CSS transform fallback');
                    const element = img._element || img.getElement();
                    if (element) {
                      element.style.transform = `scaleX(-1)`;
                    }
                    // Also try setting flipX again
                    img.set({ flipX: true });
                  }
                  if (shouldFlipY && verifyScaleY > 0 && !verifyFlipY) {
                    console.warn('Fabric.js normalized negative scaleY, applying CSS transform fallback');
                    const element = img._element || img.getElement();
                    if (element) {
                      const currentTransform = element.style.transform || '';
                      element.style.transform = currentTransform ? `${currentTransform} scaleY(-1)` : `scaleY(-1)`;
                    }
                    // Also try setting flipY again
                    img.set({ flipY: true });
                  }
                  
                  img.elementId = element.id;
                  img.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                  img.viewId = viewId; // Tag with view ID for show/hide management
                  
                  // Store original opacity for visibility toggling
                  if (img.originalOpacity === undefined) {
                    img.originalOpacity = img.opacity !== undefined ? img.opacity : 1;
                  }
                
                // Store artwork metadata
                if (element.artworkId) {
                  img.artworkId = element.artworkId;
                }
                if (element.category) {
                  img.category = element.category;
                }
                
                // Apply color modifications if saved (for SVG images)
                if (element.fill && imageUrl && imageUrl.toLowerCase().endsWith('.svg')) {
                  console.log('Applying saved color to SVG image:', {
                    elementId: element.id,
                    savedColor: element.fill,
                    imageUrl: imageUrl
                  });
                  
                  // Use the same color change logic as OptionsPanel
                  try {
                    // Fetch the SVG content
                    const response = await fetch(imageUrl);
                    if (response.ok) {
                      const svgText = await response.text();
                      
                      // Parse SVG and modify fill attributes
                      const parser = new DOMParser();
                      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                      const svgElement = svgDoc.documentElement;
                      
                      // Function to recursively set fill on all elements
                      const setFillRecursive = (el, color) => {
                        const tagName = el.tagName?.toLowerCase();
                        if (tagName === 'style' || tagName === 'script' || tagName === 'defs') {
                          return;
                        }
                        
                        const currentFill = el.getAttribute('fill');
                        if (currentFill !== null) {
                          if (!currentFill.startsWith('url(') && currentFill !== 'none') {
                            el.setAttribute('fill', color);
                          }
                        } else {
                          const shapeElements = ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line'];
                          if (shapeElements.includes(tagName)) {
                            const hasStroke = el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none';
                            if (!hasStroke || tagName === 'path' || tagName === 'circle' || tagName === 'ellipse' || tagName === 'rect' || tagName === 'polygon') {
                              el.setAttribute('fill', color);
                            }
                          }
                        }
                        
                        Array.from(el.children).forEach(child => {
                          setFillRecursive(child, color);
                        });
                      };
                      
                      // Set fill color on all elements
                      setFillRecursive(svgElement, element.fill);
                      
                      // Serialize back to string
                      const serializer = new XMLSerializer();
                      const modifiedSvg = serializer.serializeToString(svgElement);
                      
                      // Convert SVG to data URL
                      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSvg);
                      
                      // Reload the image with the modified SVG
                      const coloredImgResult = fabric.Image.fromURL(svgDataUrl, { crossOrigin: 'anonymous' });
                      let coloredImg;
                      
                      if (coloredImgResult && typeof coloredImgResult.then === 'function') {
                        coloredImg = await coloredImgResult;
                      } else {
                        coloredImg = await new Promise((resolve, reject) => {
                          fabric.Image.fromURL(svgDataUrl, (loadedImg) => {
                            if (loadedImg) {
                              resolve(loadedImg);
                            } else {
                              reject(new Error('Failed to load colored SVG'));
                            }
                          }, { crossOrigin: 'anonymous' });
                        });
                      }
                      
                      if (coloredImg) {
                        // Remove old image and add colored version
                        canvas.remove(img);
                        
                        // Apply all properties to the colored image
                        coloredImg.set({
                          left: baseProps.left,
                          top: baseProps.top,
                          angle: baseProps.angle,
                          scaleX: baseProps.scaleX,
                          scaleY: baseProps.scaleY,
                          opacity: baseProps.opacity,
                          originX: baseProps.originX || 'center',
                          originY: baseProps.originY || 'center'
                        });
                        coloredImg.setCoords();
                        coloredImg.elementId = element.id;
                        
                        // Store metadata
                        if (element.artworkId) {
                          coloredImg.artworkId = element.artworkId;
                        }
                        if (element.category) {
                          coloredImg.category = element.category;
                        }
                        
                        // Store color in customData
                        coloredImg.set('customData', {
                          originalSource: imageUrl,
                          currentColor: element.fill,
                          currentColorId: element.colorId,
                          currentOpacity: element.opacity
                        });
                        
                        canvas.add(coloredImg);
                        canvas.renderAll();
                        
                        console.log('Colored SVG image successfully added to canvas:', {
                          elementId: element.id,
                          color: element.fill,
                          left: coloredImg.left,
                          top: coloredImg.top
                        });
                      }
                    }
                  } catch (colorErr) {
                    console.error('Error applying color to SVG:', colorErr);
                    // Continue with original image if color application fails
                    canvas.add(img);
                    canvas.renderAll();
                  }
                } else {
                  // No color modification or not SVG, just add the image
                  canvas.add(img);
                  canvas.renderAll();
                }
                
                console.log('Image successfully added to canvas:', {
                  elementId: element.id,
                  type: img.type,
                  left: img.left || baseProps.left,
                  top: img.top || baseProps.top,
                  scaleX: img.scaleX || baseProps.scaleX,
                  scaleY: img.scaleY || baseProps.scaleY,
                  hasColorModification: !!element.fill
                });
              } catch (setErr) {
                console.error('Error setting image properties:', setErr);
                throw setErr;
              }
            } catch (err) {
              console.error('Error loading artwork image:', err);
              console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                imageUrl: imageUrl,
                elementId: element.id,
                elementType: element.type
              });
            }
            continue;
          } else {
            // Only warn if we don't have textureUrl either (texture-only artworks are valid)
            if (!textureUrl) {
              console.warn('No imageUrl found for artwork element:', {
                elementId: element.id,
                elementType: element.type,
                hasImageUrl: !!imageUrl,
                imageUrl: imageUrl,
                hasTextureUrl: !!textureUrl,
                textureUrl: textureUrl
              });
            } else {
              // Log info instead of warning for texture-only artworks
              console.log('Artwork element has textureUrl but no imageUrl (texture-only artwork):', {
                elementId: element.id,
                elementType: element.type,
                textureUrl: textureUrl,
                artworkId: element.artworkId
              });
            }
          }
        } else if (element.type === 'path' || element.type === 'path-group') {
          // Path objects - restore SVG artwork
          try {
            // Get artworkId from element (preserve as-is, we'll trim only for lookups if needed)
            let artworkId = element.artworkId || null;
            
            // If artworkId is missing, try to infer it from:
            // 1. imageUrl if present
            // 2. Clone ID pattern (extract original element ID and look it up)
            if (!artworkId) {
              // Check if this is a clone - clone IDs have pattern: "originalId-clone-timestamp"
              if (element.id && element.id.includes('-clone-')) {
                const originalElementId = element.id.split('-clone-')[0];
                // Find the original element in the same elements array
                const originalElement = sortedElements.find(el => el.id === originalElementId);
                if (originalElement && originalElement.artworkId) {
                  // Preserve the original artworkId as-is (don't trim, as it might have leading/trailing spaces)
                  artworkId = originalElement.artworkId;
                  console.log('Inferred artworkId from clone:', {
                    cloneId: element.id,
                    originalElementId: originalElementId,
                    inferredArtworkId: artworkId,
                    originalArtworkId: originalElement.artworkId
                  });
                }
              }
              
              // If still no artworkId, try to extract from imageUrl if present
              if (!artworkId && element.imageUrl) {
                // Try to extract artwork ID from imageUrl pattern
                // Pattern: .../artwork/{artworkId}/image-{artworkId}.svg
                const imageUrlMatch = element.imageUrl.match(/artwork\/([^\/]+)\/image-/);
                if (imageUrlMatch && imageUrlMatch[1]) {
                  artworkId = imageUrlMatch[1].trim();
                  console.log('Inferred artworkId from imageUrl:', {
                    imageUrl: element.imageUrl,
                    inferredArtworkId: artworkId
                  });
                }
              }
            }
            
            if (!artworkId) {
              console.warn('Path element missing artworkId and could not infer it:', {
                elementId: element.id,
                hasImageUrl: !!element.imageUrl,
                imageUrl: element.imageUrl
              });
              continue;
            }
            
            // Look up artwork from passed artworkData (from Supabase)
            const allArtwork = artworkData || [];
            
            // Try exact match first (with original artworkId, preserving spaces)
            let artworkItem = allArtwork.find(a => a.id === artworkId);
            
            // If exact match failed, try trimmed version (handles cases where artworkId has leading/trailing spaces)
            if (!artworkItem && artworkId) {
              const trimmedArtworkId = artworkId.trim();
              if (trimmedArtworkId !== artworkId) {
                artworkItem = allArtwork.find(a => a.id === trimmedArtworkId);
                if (artworkItem) {
                  console.log('Found artwork with trimmed ID match:', {
                    originalId: artworkId,
                    trimmedId: trimmedArtworkId,
                    foundId: artworkItem.id
                  });
                  artworkId = artworkItem.id; // Update to use the found ID
                }
              }
            }
            
            // Try case-insensitive match if exact match failed (trim both sides for comparison)
            if (!artworkItem && artworkId) {
              const trimmedId = artworkId.trim();
              artworkItem = allArtwork.find(a => 
                a.id && a.id.trim().toLowerCase() === trimmedId.toLowerCase()
              );
              if (artworkItem) {
                console.log('Found artwork with case-insensitive match:', {
                  searchedId: artworkId,
                  foundId: artworkItem.id
                });
                artworkId = artworkItem.id; // Update to use the correct case
              }
            }
            
            // Try matching by name if ID match failed
            if (!artworkItem && element.artworkName) {
              artworkItem = allArtwork.find(a => 
                a.name && a.name.toLowerCase() === element.artworkName.toLowerCase()
              );
              if (artworkItem) {
                console.log('Found artwork by name match:', {
                  searchedName: element.artworkName,
                  foundId: artworkItem.id,
                  foundName: artworkItem.name
                });
                artworkId = artworkItem.id;
              }
            }
            
            // If artwork not found but we have imageUrl from saved data, use it
            if (!artworkItem && element.imageUrl) {
              console.log('Artwork lookup failed, but using imageUrl from saved data:', {
                artworkId: artworkId,
                imageUrl: element.imageUrl
              });
              // Try to find artwork in allArtwork to get minWidth
              const foundArtwork = allArtwork.find(a => a.id === artworkId || a.name === element.artworkName);
              // Create a minimal artworkItem object from saved data
              artworkItem = {
                id: artworkId.trim() || element.artworkName || 'unknown',
                name: element.artworkName || artworkId.trim() || 'Unknown',
                imageUrl: element.imageUrl,
                category: element.category || '',
                textureUrl: element.textureUrl || null,
                minWidth: foundArtwork?.minWidth || null // Include minWidth if found
              };
            }
            
            if (!artworkItem || !artworkItem.imageUrl) {
              // Try to use imageUrl from element if available
              if (element.imageUrl) {
                console.log('Using imageUrl directly from element:', {
                  artworkId: artworkId,
                  imageUrl: element.imageUrl
                });
                // Try to find artwork in allArtwork to get minWidth
                const foundArtwork = allArtwork.find(a => a.id === artworkId || a.name === element.artworkName);
                artworkItem = {
                  id: artworkId.trim() || element.artworkName || 'unknown',
                  name: element.artworkName || artworkId.trim() || 'Unknown',
                  imageUrl: element.imageUrl,
                  category: element.category || '',
                  textureUrl: element.textureUrl || null,
                  minWidth: foundArtwork?.minWidth || null // Include minWidth if found
                };
              } else {
                console.warn('Artwork not found and no imageUrl in saved data:', {
                  artworkId: artworkId,
                  artworkName: element.artworkName,
                  found: !!artworkItem,
                  hasImageUrl: artworkItem?.imageUrl,
                  artworkDataCount: artworkData?.length || 0,
                  staticArtworkCount: artwork.length,
                  allArtworkIds: allArtwork.map(a => a.id).slice(0, 20), // Log first 20 IDs for debugging
                  allArtworkNames: allArtwork.map(a => a.name).slice(0, 20) // Log first 20 names for debugging
                });
                continue;
              }
            }
            
            const imageUrl = artworkItem.imageUrl;
            const isSvgFile = imageUrl.toLowerCase().endsWith('.svg');
            
            if (!isSvgFile) {
              console.warn('Path element artwork is not SVG, skipping:', {
                artworkId: artworkId,
                imageUrl: imageUrl
              });
              continue;
            }
            
            console.log('Restoring path artwork:', {
              artworkId: artworkId,
              imageUrl: imageUrl,
              elementId: element.id
            });
            
            // Fetch and load SVG
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch SVG: ${response.statusText}`);
            }
            const svgString = await response.text();
            
            // Load SVG into Fabric.js as objects
            const loadResult = await fabric.loadSVGFromString(svgString);
            const svgObjects = loadResult.objects || loadResult;
            const svgOptions = loadResult.options || {};
            
            const objectsArray = Array.isArray(svgObjects) ? svgObjects : [svgObjects].filter(Boolean);
            
            if (objectsArray.length === 0) {
              throw new Error('No objects loaded from SVG');
            }
            
            // Create a group from SVG objects
            let svgGroup = objectsArray.length === 1 
              ? objectsArray[0] 
              : new fabric.Group(objectsArray, svgOptions || {});
            
            // Check if this is panel artwork (needs stroke normalization)
            const isPanelArtwork = artworkItem.category && artworkItem.category.toLowerCase() === 'panels';
            
            // Normalize stroke widths ONLY for panel artwork (remove strokes, set strokeWidth to 0)
            // Non-panel artwork should preserve their strokeWidth
            if (isPanelArtwork) {
              const normalizeStrokes = (obj) => {
                if (obj.type === 'path' || obj.type === 'path-group') {
                  obj.stroke = null;
                  obj.strokeWidth = 0;
                }
                if (obj._objects && Array.isArray(obj._objects)) {
                  obj._objects.forEach(child => normalizeStrokes(child));
                }
              };
              normalizeStrokes(svgGroup);
            }
            
            // Apply saved fill color to paths
            if (element.fill) {
              const applyFill = (obj, fillColor) => {
                if (obj.type === 'path' || obj.type === 'path-group') {
                  obj.fill = fillColor;
                }
                if (obj._objects && Array.isArray(obj._objects)) {
                  obj._objects.forEach(child => applyFill(child, fillColor));
                }
              };
              applyFill(svgGroup, element.fill);
            }
            
            // Apply saved stroke and strokeWidth for non-panel artwork
            if (!isPanelArtwork && (element.stroke || element.strokeWidthPx !== undefined)) {
              const applyStroke = (obj, strokeColor, strokeWidth) => {
                if (obj.type === 'path' || obj.type === 'path-group') {
                  if (strokeColor) {
                    obj.stroke = strokeColor;
                  }
                  if (strokeWidth !== undefined && strokeWidth !== null) {
                    obj.strokeWidth = strokeWidth;
                  }
                }
                if (obj._objects && Array.isArray(obj._objects)) {
                  obj._objects.forEach(child => applyStroke(child, strokeColor, strokeWidth));
                }
              };
              applyStroke(svgGroup, element.stroke, element.strokeWidthPx);
            }
            
            // Handle texture layer for panel artwork
            let resolvedTextureUrl = artworkItem.textureUrl || null;
            if (!resolvedTextureUrl && isPanelArtwork) {
              resolvedTextureUrl = '/images/materials/panelbg.png';
            }
            
            // Get the saved origin - use saved value or default to 'center' for paths
            const finalOriginX = baseProps.originX || savedOriginX;
            const finalOriginY = baseProps.originY || savedOriginY;
            
            // Check if this is a cloned object
            const isClone = element.id && element.id.includes('-clone-');
            
            // Log origin info for debugging cloned objects
            if (isClone) {
              console.log('Restoring cloned path artwork:', {
                elementId: element.id,
                savedOriginX: element.originX,
                savedOriginY: element.originY,
                finalOriginX: finalOriginX,
                finalOriginY: finalOriginY,
                savedPosition: { left: baseProps.left, top: baseProps.top }
              });
            }
            
            // Set origin on SVG group to match saved origin
            svgGroup.set({
              originX: finalOriginX,
              originY: finalOriginY
            });
            svgGroup.setCoords();
            
            let finalGroup = svgGroup;
            if (resolvedTextureUrl && resolvedTextureUrl.trim() && isPanelArtwork) {
              try {
                svgGroup.setCoords();
                const svgBounds = svgGroup.getBoundingRect();
                
                // Load texture image
                const textureImageResult = fabric.Image.fromURL(resolvedTextureUrl, { crossOrigin: 'anonymous' });
                let textureImage;
                
                if (textureImageResult && typeof textureImageResult.then === 'function') {
                  textureImage = await textureImageResult;
                } else {
                  textureImage = await new Promise((resolve, reject) => {
                    fabric.Image.fromURL(resolvedTextureUrl, (loadedImg) => {
                      if (loadedImg) {
                        resolve(loadedImg);
                      } else {
                        reject(new Error('Failed to load texture image'));
                      }
                    }, { crossOrigin: 'anonymous' });
                  });
                }
                
                if (textureImage) {
                  // Calculate scale to fit texture within SVG bounds
                  const scaleX = svgBounds.width / textureImage.width;
                  const scaleY = svgBounds.height / textureImage.height;
                  const scale = Math.min(scaleX, scaleY);
                  
                  // Position texture to match SVG bounds
                  textureImage.set({
                    left: svgBounds.left,
                    top: svgBounds.top,
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'left',
                    originY: 'top',
                    selectable: false,
                    evented: false,
                    visible: true,
                    opacity: 1
                  });
                  textureImage.setCoords();
                  
                  // Create group with texture (bottom) and color layer (top)
                  finalGroup = new fabric.Group([textureImage, svgGroup], {
                    left: 0,
                    top: 0,
                    originX: finalOriginX,
                    originY: finalOriginY,
                    selectable: true,
                    objectCaching: false
                  });
                  finalGroup.setCoords();
                  finalGroup.textureUrl = resolvedTextureUrl;
                  finalGroup.dirty = true;
                }
              } catch (textureError) {
                console.error('Error creating texture layer for restored artwork:', textureError);
                // Continue without texture layer
              }
            }
            
            // Get minWidth from artwork item for lockUniScaling
            const pathMinWidthInches = artworkItem.minWidth || null;
            const pathLockUniScaling = !!pathMinWidthInches;
            
            // Check if flip state was saved (negative scaleX/scaleY indicates flip)
            const shouldFlipX = baseProps.scaleX < 0;
            const shouldFlipY = baseProps.scaleY < 0;
            const absScaleX = Math.abs(baseProps.scaleX);
            const absScaleY = Math.abs(baseProps.scaleY);
            
            // Apply scale, origin, and other properties FIRST (before position)
            // This ensures the bounding box is correct before we set position
            finalGroup.set({
              scaleX: shouldFlipX ? -absScaleX : absScaleX,
              scaleY: shouldFlipY ? -absScaleY : absScaleY,
              angle: baseProps.angle,
              opacity: baseProps.opacity !== undefined ? baseProps.opacity : 1,
              originX: finalOriginX,
              originY: finalOriginY,
              flipX: shouldFlipX,
              flipY: shouldFlipY,
              selectable: true,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              lockUniScaling: pathLockUniScaling // Lock aspect ratio if minWidth exists
            });
            
            // Update coordinates to ensure bounding box is calculated correctly
            finalGroup.setCoords();
            
            // Verify flip state was applied correctly BEFORE setting position
            // If flip state needs fixing, it will change the bounding box, so we need to fix it first
            const verifyScaleX = finalGroup.scaleX || finalGroup.get('scaleX');
            const verifyScaleY = finalGroup.scaleY || finalGroup.get('scaleY');
            const verifyFlipX = finalGroup.flipX || finalGroup.get('flipX');
            const verifyFlipY = finalGroup.flipY || finalGroup.get('flipY');
            
            // If flip state wasn't applied correctly, fix it now (before setting position)
            if (shouldFlipX && verifyScaleX > 0 && !verifyFlipX) {
              console.warn('Flip state not applied correctly, fixing before position:', {
                elementId: element.id,
                shouldFlipX: shouldFlipX,
                verifyScaleX: verifyScaleX,
                verifyFlipX: verifyFlipX
              });
              finalGroup.set({
                flipX: true,
                scaleX: -absScaleX
              });
              finalGroup.setCoords();
            }
            
            if (shouldFlipY && verifyScaleY > 0 && !verifyFlipY) {
              console.warn('Flip state not applied correctly, fixing before position:', {
                elementId: element.id,
                shouldFlipY: shouldFlipY,
                verifyScaleY: verifyScaleY,
                verifyFlipY: verifyFlipY
              });
              finalGroup.set({
                flipY: true,
                scaleY: -absScaleY
              });
              finalGroup.setCoords();
            }
            
            // NOW set position after all properties (including flip) are correct
            // The saved position (xPx, yPx) represents where the origin point should be
            finalGroup.set({
              left: baseProps.left,
              top: baseProps.top
            });
            
            // Final coordinate update to ensure position is correct
            finalGroup.setCoords();
            
            // For cloned objects, verify the position matches saved position
            if (isClone) {
              const actualCenter = finalGroup.getCenterPoint();
              const bounds = finalGroup.getBoundingRect();
              console.log('Cloned object position after restoration:', {
                elementId: element.id,
                savedPosition: { left: baseProps.left, top: baseProps.top },
                actualPosition: { left: finalGroup.left, top: finalGroup.top },
                actualCenter: { x: actualCenter.x, y: actualCenter.y },
                expectedCenter: { x: baseProps.left, y: baseProps.top },
                bounds: bounds,
                originX: finalOriginX,
                originY: finalOriginY,
                scaleX: finalGroup.scaleX,
                flipX: finalGroup.flipX,
                centerDiff: {
                  x: Math.abs(actualCenter.x - baseProps.left),
                  y: Math.abs(actualCenter.y - baseProps.top)
                }
              });
            }
            
            // Store metadata
            finalGroup.elementId = element.id;
            finalGroup.artworkId = artworkId;
            finalGroup.imageUrl = imageUrl;
            finalGroup.viewId = viewId;
            finalGroup.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
            
            // Store customData (use pathMinWidthInches already defined above)
            const customDataObj = {
              type: 'artwork',
              artworkId: artworkId,
              artworkName: artworkItem.name,
              originalSource: imageUrl,
              currentColor: element.fill || null,
              currentColorId: element.colorId || null,
              currentOpacity: element.opacity !== undefined ? element.opacity : 1,
              currentStrokeColor: element.stroke || null,
              currentStrokeWidth: element.strokeWidth || 0,
              minWidthInches: pathMinWidthInches || null // Store minWidth if it exists
            };
            
            if (artworkItem.category) {
              customDataObj.category = artworkItem.category;
            }
            if (resolvedTextureUrl) {
              customDataObj.textureUrl = resolvedTextureUrl;
            }
            
            finalGroup.set('customData', customDataObj);
            
            // Log if minWidth constraint is being applied
            if (pathLockUniScaling) {
              console.log('Set lockUniScaling for restored path artwork:', {
                artworkId: artworkId,
                minWidthInches: pathMinWidthInches,
                lockUniScaling: pathLockUniScaling
              });
            }
            
            // Final duplicate check before adding to canvas (async operations may have completed)
            const existingObjectsAfterLoad = canvas.getObjects();
            const duplicateCheck = existingObjectsAfterLoad.find(obj => 
              obj.elementId === element.id && 
              (obj.viewId === viewId || (obj.viewId === null && viewId === null))
            );
            if (duplicateCheck) {
              console.log(`⚠ Skipping duplicate path artwork ${element.id} with viewId ${viewId} - already exists on canvas (late check)`);
              continue;
            }
            
            // Set fabricObject so it gets added to canvas
            fabricObject = finalGroup;
            
            console.log('Path artwork restored successfully:', {
              elementId: element.id,
              artworkId: artworkId,
              type: finalGroup.type,
              hasTexture: !!resolvedTextureUrl
            });
            
          } catch (pathError) {
            console.error('Error restoring path artwork:', pathError);
            console.error('Path element:', element);
            // Continue to next element
            continue;
          }
        }

        if (fabricObject) {
          // Store element metadata
          fabricObject.elementId = element.id;
          fabricObject.viewId = viewId; // Tag with view ID for show/hide management
          fabricObject.zIndex = element.zIndex !== undefined ? element.zIndex : 0; // Store z-index for layer ordering
          
          // Store original opacity for visibility toggling (preserve existing opacity or default to 1)
          if (fabricObject.originalOpacity === undefined) {
            fabricObject.originalOpacity = fabricObject.opacity !== undefined ? fabricObject.opacity : 1;
          }
          
          canvas.add(fabricObject);
          
          // Log final loaded object state
          console.log('Final loaded object state:', {
            elementId: element.id,
            type: element.type,
            left: fabricObject.left,
            top: fabricObject.top,
            scaleX: fabricObject.scaleX,
            scaleY: fabricObject.scaleY,
            angle: fabricObject.angle,
            fontSize: fabricObject.fontSize || 'N/A',
            width: fabricObject.width || 'N/A',
            height: fabricObject.height || 'N/A'
          });
        }
        
        console.log(`=== END LOAD Element ${elementIndex} ===`);
      } catch (error) {
        console.error(`❌ Error loading element ${elementIndex}:`, element, error);
      }
    }

    console.log('=== FINISHED LOADING ALL ELEMENTS ===');
    
    // Complete loading state (skip if loading from local state for view switching or multi-view load)
    // Multi-view loads are completed in the parent Promise.all handler
    if (!skipLoadingState && !onProgressUpdate) {
      updateLoadingState({ isLoading: false, loaded: totalAssets, total: totalAssets, message: '' });
    }
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
    
    // FIXED CANVAS SIZE: Always use 1000px width for consistent scaling
    const FIXED_CANVAS_WIDTH = 1000;
    
    // Use canvas dimensions from template if available, otherwise fall back to realWorld dimensions
    // canvas.width/height includes the base, while realWorldWidth/Height is just the product
    const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
      ? initialData.canvas.width 
      : (initialData.realWorldWidth || 24);
    const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
      ? initialData.canvas.height 
      : (initialData.realWorldHeight || 18);
    
    // Calculate canvas height to maintain aspect ratio based on canvas dimensions
    const canvasWidth = FIXED_CANVAS_WIDTH;
    const canvasHeight = (canvasWidth / canvasWidthInches) * canvasHeightInches;

    // Calculate scale for display purposes (converting pixels to inches in UI)
    // Use canvas width for scale calculation to match the actual canvas dimensions
    scale.current = calculateScale(canvasWidthInches, canvasWidth);

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
      
      // Ensure all objects use the custom selection color
      // Update any existing objects and set defaults for new ones
      const updateObjectSelectionColor = (obj) => {
        if (obj && typeof obj.set === 'function') {
          obj.set({
            borderColor: '#008FF0',
            cornerColor: '#008FF0',
            cornerStrokeColor: '#008FF0',
            selectionBackgroundColor: 'rgba(0, 143, 240, 0.1)'
          });
          // Update group children recursively
          if (obj.type === 'group' && obj._objects) {
            obj._objects.forEach(child => updateObjectSelectionColor(child));
          }
        }
      };
      
      // Update all existing objects
      canvas.getObjects().forEach(updateObjectSelectionColor);
      
      // Listen for new objects being added and update them
      canvas.on('object:added', (e) => {
        if (e.target) {
          updateObjectSelectionColor(e.target);
        }
      });
      
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

    // Set up event listeners on first creation only
    if (!canvas.listening) {
      // Mark that listeners are set up
      canvas.listening = true;

      // Double-click handler for entering text editing mode
      canvas.on('mouse:dblclick', (e) => {
        const activeObject = canvas.getActiveObject();
        // Only enter editing mode for text objects (IText)
        if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
          // Enter editing mode - IText will automatically show text cursor
          activeObject.enterEditing();
          canvas.renderAll();
        }
      });

      // Handle text editing completion - preserve properties when editing ends
      canvas.on('text:editing:exited', (e) => {
        const textObject = e.target;
        if (textObject && (textObject.type === 'i-text' || textObject.type === 'text')) {
          // Ensure alignment, line height, and char spacing are preserved
          // These should already be preserved, but we'll ensure they're set
          console.log('Text editing exited:', {
            text: textObject.text,
            textAlign: textObject.textAlign,
            lineHeight: textObject.lineHeight,
            charSpacing: textObject.charSpacing
          });
          canvas.renderAll();
          
          // Notify parent of update
          if (onElementSelect) {
            onElementSelect(textObject);
          }
        }
      });

      // Selection event listeners
      canvas.on('selection:created', (e) => {
        const activeObject = canvas.getActiveObject();
        // Only allow selection of visible objects (current view)
        if (activeObject && activeObject.visible !== false) {
          // Ensure selection color is applied
          activeObject.set({
            borderColor: '#008FF0',
            cornerColor: '#008FF0',
            cornerStrokeColor: '#008FF0',
            selectionBackgroundColor: 'rgba(0, 143, 240, 0.1)'
          });
          canvas.renderAll();
          
          selectedObject.current = activeObject;
          console.log('Object selected:', activeObject);
          if (onElementSelect) {
            onElementSelect(activeObject);
          }
        } else if (activeObject && activeObject.visible === false) {
          // Prevent selection of hidden objects
          console.log('Prevented selection of hidden object:', activeObject);
          canvas.discardActiveObject();
          canvas.renderAll();
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
        // Only allow selection of visible objects (current view)
        if (activeObject && activeObject.visible !== false) {
          // Ensure selection color is applied
          activeObject.set({
            borderColor: '#008FF0',
            cornerColor: '#008FF0',
            cornerStrokeColor: '#008FF0',
            selectionBackgroundColor: 'rgba(0, 143, 240, 0.1)'
          });
          canvas.renderAll();
          
          selectedObject.current = activeObject;
          console.log('Selection updated:', activeObject);
          if (onElementSelect) {
            onElementSelect(activeObject);
          }
        } else if (activeObject && activeObject.visible === false) {
          // Prevent selection of hidden objects
          console.log('Prevented selection of hidden object:', activeObject);
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      });
      
      // Prevent mouse events on hidden objects
      canvas.on('mouse:down', (e) => {
        if (e.target && e.target.visible === false) {
          e.e.preventDefault();
          e.e.stopPropagation();
        }
      });

      // Function to show constraint border overlay
      const showConstraintBorder = () => {
        if (!initialData || !canvas) return;
        
        // Remove existing overlay if it exists
        if (constraintOverlay.current) {
          canvas.remove(constraintOverlay.current);
        }
        
        // Check if editZones are defined
        if (initialData.editZones && initialData.editZones.length > 0) {
          const editZone = initialData.editZones[0];
          const realWorldWidth = initialData.realWorldWidth || 24;
          // Use canvas.height (in inches) for vertical scale, not realWorldHeight
          // canvas.height includes the base, while realWorldHeight is just the product
          const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
            ? initialData.canvas.height 
            : (initialData.realWorldHeight || 18);
          
          // Calculate scale for converting inches to pixels
          const scaleX = canvas.width / realWorldWidth;
          const scaleY = canvas.height / canvasHeightInches;
          
          // Convert editZone coordinates from inches to pixels
          const width = editZone.width * scaleX;
          const height = editZone.height * scaleY;
          
          // If X position is not defined or set to "center", center horizontally relative to canvas width
          let x;
          if (editZone.x === undefined || editZone.x === null || editZone.x === 'center') {
            x = (canvas.width - width) / 2;
          } else {
            x = editZone.x * scaleX;
          }
          
          const y = editZone.y * scaleY;
          
          // Create rectangle overlay for constraint border
          const borderRect = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            fill: 'transparent',
            stroke: '#9CBCED',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            strokeDashArray: [0] // Solid line
          });
          
          // Add to canvas
          canvas.add(borderRect);
          
          // Move border to the beginning of the objects array (bottom of z-index)
          // This ensures it renders behind all other objects
          const objects = canvas.getObjects();
          const borderIndex = objects.indexOf(borderRect);
          if (borderIndex > 0) {
            // Remove from current position
            objects.splice(borderIndex, 1);
            // Insert at the beginning
            objects.unshift(borderRect);
            // Update canvas objects array
            canvas._objects = objects;
          }
          
          constraintOverlay.current = borderRect;
          canvas.renderAll();
        }
      };
      
      // Function to hide constraint border overlay
      const hideConstraintBorder = () => {
        if (constraintOverlay.current && canvas) {
          canvas.remove(constraintOverlay.current);
          constraintOverlay.current = null;
          canvas.renderAll();
        }
      };

      // Object modification event listeners
      canvas.on('object:moving', (e) => {
        const obj = e.target;
        isObjectMoving.current = true;
        constrainObjectInCanvas(obj);
        showConstraintBorder();
      });

      // Use before:transform to intercept scaling before it happens
      canvas.on('before:transform', (e) => {
        // Safety checks
        if (!e || !e.target || !e.transform) {
          return;
        }
        
        const obj = e.target;
        const transform = e.transform;
        
        // Debug logging
        console.log('before:transform fired:', {
          objType: obj?.type,
          hasCustomData: !!obj?.customData,
          customData: obj?.customData,
          transformScaleX: transform?.scaleX
        });
        
        // Check if this artwork has a minWidth constraint
        const customData = obj?.customData || obj?.get?.('customData') || {};
        const minWidthInches = customData?.minWidthInches;
        
        console.log('Checking minWidth constraint:', {
          minWidthInches: minWidthInches,
          objType: obj?.type,
          hasMinWidth: !!minWidthInches
        });
        
        if (minWidthInches && obj && (obj.type === 'group' || obj.type === 'path' || obj.type === 'image')) {
          // Calculate scale for converting inches to pixels
          const realWorldWidth = initialData?.realWorldWidth || 24;
          const canvasWidth = fabricCanvasInstance.current?.width || 800;
          const scale = canvasWidth / realWorldWidth;
          
          // Get object's base width in pixels (before transform)
          const baseWidthPx = obj.width || 0;
          if (!baseWidthPx) {
            console.warn('Cannot enforce minWidth: object has no width', obj);
            return; // Can't enforce if no width
          }
          
          // Get the new scaleX from the transform (this is the new absolute scale)
          const newScaleX = transform?.scaleX;
          if (newScaleX === undefined || newScaleX === null) {
            return; // Can't enforce if no scaleX in transform
          }
          
          const newWidthPx = baseWidthPx * Math.abs(newScaleX);
          
          // Calculate minimum width in pixels
          const minWidthPx = minWidthInches * scale;
          
          console.log('Enforcing minWidth constraint:', {
            artworkId: customData.artworkId,
            minWidthInches: minWidthInches,
            minWidthPx: minWidthPx,
            baseWidthPx: baseWidthPx,
            newScaleX: newScaleX,
            newWidthPx: newWidthPx,
            belowMinimum: newWidthPx < minWidthPx
          });
          
          // If new width would be below minimum, enforce minimum
          if (newWidthPx < minWidthPx) {
            const minScaleX = (minWidthPx / baseWidthPx) * (newScaleX < 0 ? -1 : 1);
            console.log('Enforcing minimum scale:', { minScaleX, minWidthPx, baseWidthPx });
            // Lock aspect ratio by using the same scale for both X and Y
            if (transform) {
              transform.scaleX = minScaleX;
              transform.scaleY = minScaleX;
            }
          } else {
            // Even if above minimum, lock aspect ratio by matching scaleY to scaleX
            if (transform && transform.scaleX !== undefined) {
              transform.scaleY = transform.scaleX;
            }
          }
        }
      });
      
      canvas.on('object:scaling', (e) => {
        const obj = e.target;
        isObjectMoving.current = true;
        
        // Check if this artwork has a minWidth constraint
        const customData = obj?.customData || obj?.get?.('customData') || {};
        const minWidthInches = customData?.minWidthInches;
        
        console.log('object:scaling fired:', {
          objType: obj?.type,
          hasCustomData: !!obj?.customData,
          minWidthInches: minWidthInches,
          currentScaleX: obj?.scaleX,
          currentScaleY: obj?.scaleY
        });
        
        if (minWidthInches && obj && (obj.type === 'group' || obj.type === 'path' || obj.type === 'image')) {
          // Calculate scale for converting inches to pixels
          const realWorldWidth = initialData?.realWorldWidth || 24;
          const canvasWidth = fabricCanvasInstance.current?.width || 800;
          const scale = canvasWidth / realWorldWidth;
          
          // Get object's base width in pixels
          const baseWidthPx = obj.width || 0;
          if (!baseWidthPx) {
            console.warn('Cannot enforce minWidth: object has no width', obj);
            constrainObjectInCanvas(obj);
            showConstraintBorder();
            return;
          }
          
          // Get current scale
          const currentScaleX = Math.abs(obj.scaleX || 1);
          const currentWidthPx = baseWidthPx * currentScaleX;
          
          // Calculate minimum width in pixels
          const minWidthPx = minWidthInches * scale;
          
          console.log('Checking minWidth during scaling:', {
            artworkId: customData.artworkId,
            minWidthInches: minWidthInches,
            minWidthPx: minWidthPx,
            baseWidthPx: baseWidthPx,
            currentScaleX: currentScaleX,
            currentWidthPx: currentWidthPx,
            belowMinimum: currentWidthPx < minWidthPx
          });
          
          // If current width is below minimum, enforce minimum
          if (currentWidthPx < minWidthPx) {
            const minScaleX = minWidthPx / baseWidthPx;
            const preserveFlipX = obj.scaleX < 0;
            const preserveFlipY = obj.scaleY < 0;
            
            console.log('Enforcing minimum scale:', {
              minScaleX: minScaleX,
              preserveFlipX: preserveFlipX,
              preserveFlipY: preserveFlipY
            });
            
            // Lock aspect ratio by using the same scale for both X and Y
            obj.set({
              scaleX: preserveFlipX ? -minScaleX : minScaleX,
              scaleY: preserveFlipY ? -minScaleX : minScaleX,
              lockUniScaling: true
            });
            obj.setCoords();
          } else {
            // Even if above minimum, lock aspect ratio by matching scaleY to scaleX
            const currentScale = Math.abs(obj.scaleX || 1);
            const preserveFlipX = obj.scaleX < 0;
            const preserveFlipY = obj.scaleY < 0;
            
            obj.set({
              scaleY: preserveFlipY ? -currentScale : currentScale,
              lockUniScaling: true
            });
            obj.setCoords();
          }
        }
        
        constrainObjectInCanvas(obj);
        showConstraintBorder();
      });

      canvas.on('object:rotating', (e) => {
        const obj = e.target;
        console.log('Object rotating:', obj);
      });

      // Object modification completion
      canvas.on('object:modified', (e) => {
        const obj = e.target;
        isObjectMoving.current = false;
        hideConstraintBorder();
        console.log('Object modified:', obj);
      });
      
      // Also hide border when mouse is released (in case object:modified doesn't fire)
      canvas.on('mouse:up', () => {
        if (isObjectMoving.current) {
          isObjectMoving.current = false;
          hideConstraintBorder();
        }
      });
    }

    // Cleanup
    return () => {
      // Don't dispose canvas on resize - just let the effect handle canvas updates
    };
    // eslint-disable-next-line
  }, [fabricCanvasRef, initialData, canvasSize]); // Re-run when canvasSize changes

  /**
   * Load all views onto canvas with viewId property, then toggle visibility for view switching
   * This is more efficient than clearing/reloading on each view switch
   */
  const viewsLoadedRef = useRef(false);
  const prevCurrentViewRef = useRef(null);
  const isLoadingRef = useRef(false); // Guard to prevent multiple simultaneous loads
  
  useEffect(() => {
    const canvas = fabricCanvasInstance.current;
    if (!canvas || !canvas.listening || !initialData) return; // Only run after canvas is initialized
    
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⚠ Load already in progress, skipping duplicate load');
      return;
    }
    
      // Use currentView from props, but always default to 'front' on initial load
      // This ensures we always start with the front view, regardless of what was saved
      const availableViews = initialData.availableViews || ['front'];
      // On initial load (when viewsLoadedRef.current is false), always default to 'front'
      // After initial load, use the currentView from props
      const activeView = !viewsLoadedRef.current 
        ? (availableViews.includes('front') ? 'front' : (availableViews[0] || 'front'))
        : (currentView || (availableViews.includes('front') ? 'front' : (availableViews[0] || 'front')));
    
    // Get all design elements for all views
    let allDesignElements = {};
    if (initialData.designElements) {
      if (Array.isArray(initialData.designElements)) {
        // Old format: array - convert to new format with front view
        allDesignElements = { front: initialData.designElements };
      } else if (typeof initialData.designElements === 'object') {
        // New format: object with view keys - use as-is
        allDesignElements = { ...initialData.designElements };
      }
    }
    
    // On initial load, load ALL views onto canvas with viewId property
    if (!viewsLoadedRef.current) {
      // Set loading guard immediately to prevent duplicate loads
      isLoadingRef.current = true;
      
      console.log('Initial load - loading all views onto canvas:', Object.keys(allDesignElements));
      console.log('Initial load - allDesignElements content:', JSON.stringify(allDesignElements, null, 2));
      console.log('Initial load - activeView will be:', activeView, '(currentView prop:', currentView, ')');
      
      // Calculate total assets across ALL views for progress tracking
      let totalAssetsAcrossAllViews = 0;
      for (const [viewId, elements] of Object.entries(allDesignElements)) {
        console.log(`Checking view "${viewId}":`, {
          elements,
          isArray: Array.isArray(elements),
          length: elements?.length,
          hasElements: elements && elements.length > 0
        });
        if (elements && Array.isArray(elements) && elements.length > 0) {
          const assetsToLoad = elements.filter(el => 
            el.type === 'image' || 
            el.type === 'artwork' || 
            (el.type === 'group' && (el.imageUrl || el.artworkId))
          );
          totalAssetsAcrossAllViews += assetsToLoad.length;
        }
      }
      
      // Initialize loading state with total across all views
      if (totalAssetsAcrossAllViews > 0 && onLoadingStateChange) {
        updateLoadingState({ 
          isLoading: true, 
          loaded: 0, 
          total: totalAssetsAcrossAllViews, 
          message: 'Loading project...' 
        });
      }
      
      // Load all views' elements onto canvas with unified progress tracking
      const loadPromises = [];
      let globalLoadedAssets = 0;
      
      // Create progress callback that updates global progress
      const progressCallback = (increment) => {
        globalLoadedAssets += increment;
        if (onLoadingStateChange) {
          updateLoadingState({ 
            loaded: globalLoadedAssets, 
            total: totalAssetsAcrossAllViews,
            message: `Loading project... (${globalLoadedAssets}/${totalAssetsAcrossAllViews})`
          });
        }
      };
      
      for (const [viewId, elements] of Object.entries(allDesignElements)) {
        if (Array.isArray(elements) && elements.length > 0) {
          console.log(`Loading view "${viewId}" with ${elements.length} elements`);
          // Pass progress callback to track progress across all views
          // skipLoadingState = true because we're managing it globally
          loadPromises.push(
            populateCanvasFromData(canvas, elements, initialData.canvasDimensions, true, viewId, progressCallback)
              .then(() => {
                console.log(`Successfully loaded view "${viewId}"`);
              })
              .catch(err => {
                console.error(`Error loading view ${viewId}:`, err);
              })
          );
        } else {
          console.log(`Skipping view "${viewId}" - no elements or not an array`);
        }
      }
      
      // If no views have elements, still mark as loaded
      if (loadPromises.length === 0) {
        isLoadingRef.current = false; // Clear loading guard
        viewsLoadedRef.current = true;
        prevCurrentViewRef.current = activeView;
        if (onLoadingStateChange) {
          updateLoadingState({ isLoading: false, loaded: 0, total: 0, message: '' });
        }
        return;
      }
      
      // Wait for all views to load, then set visibility and reorder by z-index
      Promise.all(loadPromises)
        .then(() => {
          // Clear loading guard after all loads complete
          isLoadingRef.current = false;
          
          // Get all objects and reorder them by z-index to maintain proper layer order
          // This ensures objects are rendered in the correct order regardless of which view loaded first
          const allObjects = canvas.getObjects();
        
        // Filter out constraint overlay (keep it at bottom)
        const constraintOverlayObj = allObjects.find(obj => obj.excludeFromExport === true);
        const designObjects = allObjects.filter(obj => obj.excludeFromExport !== true);
        
        // Sort design objects by zIndex (ascending: lower zIndex = bottom layer, higher zIndex = top layer)
        // Objects with same zIndex maintain their relative order
        designObjects.sort((a, b) => {
          const zIndexA = a.zIndex !== undefined ? a.zIndex : (a.elementId ? parseInt(a.elementId.split('-').pop()) || 0 : 0);
          const zIndexB = b.zIndex !== undefined ? b.zIndex : (b.elementId ? parseInt(b.elementId.split('-').pop()) || 0 : 0);
          return zIndexA - zIndexB;
        });
        
        // Remove all objects from canvas
        canvas.remove(...allObjects);
        
        // Re-add objects in correct z-index order
        // First add constraint overlay (if exists) at bottom
        if (constraintOverlayObj) {
          canvas.add(constraintOverlayObj);
        }
        
        // Then add design objects in z-index order
        designObjects.forEach(obj => {
          canvas.add(obj);
        });
        
        // Recursive function to set visibility on object and all its children
        const setVisibilityRecursive = (targetObj, visible) => {
          // Explicitly set visibility to boolean (not undefined)
          const visibilityValue = visible === true;
          
          // Store original opacity if we haven't already (for restoring later)
          // Store it regardless of visibility so we can restore it later
          // Check both _originalOpacity (old format) and originalOpacity (new format) for backward compatibility
          const existingOriginalOpacity = targetObj.originalOpacity !== undefined ? targetObj.originalOpacity : targetObj._originalOpacity;
          
          if (existingOriginalOpacity === undefined) {
            // Store the current opacity as original (before any visibility changes)
            // If opacity is 0, it might be from hiding, so default to 1
            const currentOpacity = targetObj.opacity !== undefined && targetObj.opacity > 0 ? targetObj.opacity : 1;
            targetObj.originalOpacity = currentOpacity;
            // Also set _originalOpacity for backward compatibility
            targetObj._originalOpacity = currentOpacity;
          }
          
          // Determine opacity: if visible, restore originalOpacity, otherwise set to 0
          let opacityToSet;
          if (visibilityValue) {
            // Restore original opacity if available (check both property names)
            const originalOpacity = targetObj.originalOpacity !== undefined ? targetObj.originalOpacity : targetObj._originalOpacity;
            if (originalOpacity !== undefined) {
              opacityToSet = originalOpacity;
            } else if (targetObj.opacity !== undefined && targetObj.opacity > 0) {
              opacityToSet = targetObj.opacity;
            } else {
              opacityToSet = 1;
            }
          } else {
            // Hide: set opacity to 0
            opacityToSet = 0;
          }
          
          // Set visibility on the object itself - use explicit boolean
          // Also set opacity to 0 for hidden objects as a backup (Fabric.js sometimes ignores visible)
          targetObj.set({
            visible: visibilityValue,
            selectable: visibilityValue,
            evented: visibilityValue,
            opacity: opacityToSet
          });
          
          // Recursively set visibility on all children (for groups)
          if (targetObj.type === 'group' && targetObj._objects && Array.isArray(targetObj._objects)) {
            targetObj._objects.forEach(child => {
              setVisibilityRecursive(child, visible);
            });
          }
          
          // Force update coordinates to ensure visibility takes effect
          if (targetObj.setCoords) {
            targetObj.setCoords();
          }
        };
        
        // Set visibility based on current view
        const finalObjects = canvas.getObjects();
        let visibleCount = 0;
        let hiddenCount = 0;
        const viewCounts = {}; // Track counts by view
        
        finalObjects.forEach(obj => {
          // Skip constraint overlay - it's always visible
          if (obj.excludeFromExport) {
            return;
          }
          
          // Get viewId from object (check both direct property and get method)
          const objViewId = obj.viewId || obj.get?.('viewId');
          
          if (objViewId) {
            // Ensure viewId is a string for comparison
            const normalizedViewId = String(objViewId).toLowerCase().trim();
            const normalizedActiveView = String(activeView).toLowerCase().trim();
            const shouldBeVisible = normalizedViewId === normalizedActiveView;
            
            // Use recursive function to set visibility on object and all children
            setVisibilityRecursive(obj, shouldBeVisible);
            
            // Track counts by view
            if (!viewCounts[objViewId]) {
              viewCounts[objViewId] = { total: 0, visible: 0, hidden: 0 };
            }
            viewCounts[objViewId].total++;
            
            if (shouldBeVisible) {
              visibleCount++;
              viewCounts[objViewId].visible++;
            } else {
              hiddenCount++;
              viewCounts[objViewId].hidden++;
            }
          } else {
            // Objects without viewId should be hidden (they shouldn't exist in multi-view mode)
            // But log a warning so we can identify any missing viewIds
            console.warn('Object without viewId found during initial load - hiding it:', {
              elementId: obj.elementId,
              type: obj.type,
              currentView: activeView
            });
            // Use recursive function to hide object and all children
            setVisibilityRecursive(obj, false);
            hiddenCount++;
          }
        });
        
        console.log(`Initial load visibility set: ${visibleCount} visible, ${hiddenCount} hidden for view: ${activeView}`);
        console.log('View breakdown:', viewCounts);
        
        // Force update all groups to ensure visibility changes propagate
        finalObjects.forEach(obj => {
          if (obj.type === 'group' && obj.setCoords) {
            obj.setCoords();
          }
        });
        
        canvas.renderAll();
        
        // Double render to ensure Fabric.js processes all visibility changes
        requestAnimationFrame(() => {
          canvas.renderAll();
        });
        
        viewsLoadedRef.current = true;
        prevCurrentViewRef.current = activeView;
        console.log('All views loaded, objects reordered by z-index, visibility set for view:', activeView);
        
        // Ensure loading state is cleared after all views are loaded
        if (onLoadingStateChange) {
          updateLoadingState({ isLoading: false, loaded: totalAssetsAcrossAllViews, total: totalAssetsAcrossAllViews, message: '' });
        }
      })
      .catch((error) => {
        // Clear loading guard even on error
        isLoadingRef.current = false;
        console.error('Error loading views:', error);
        if (onLoadingStateChange) {
          updateLoadingState({ isLoading: false, loaded: 0, total: 0, message: 'Error loading project' });
        }
      });
      
      return;
    }
    
    // On view switch, just toggle visibility (no reloading)
    if (prevCurrentViewRef.current !== activeView) {
      console.log('View switch - toggling visibility from', prevCurrentViewRef.current, 'to', activeView);
      
      // Recursive function to set visibility on object and all its children
      const setVisibilityRecursive = (targetObj, visible) => {
        // Explicitly set visibility to boolean (not undefined)
        const visibilityValue = visible === true;
        
        // Determine opacity: if visible, restore originalOpacity, otherwise set to 0
        let opacityToSet;
        if (visibilityValue) {
          // Restore original opacity if available, otherwise use current opacity (if > 0) or default to 1
          if (targetObj.originalOpacity !== undefined) {
            opacityToSet = targetObj.originalOpacity;
          } else if (targetObj.opacity !== undefined && targetObj.opacity > 0) {
            opacityToSet = targetObj.opacity;
          } else {
            opacityToSet = 1;
          }
        } else {
          // Hide: set opacity to 0
          opacityToSet = 0;
        }
        
        // Set visibility on the object itself - use explicit boolean
        // Use individual set() calls to ensure each property is applied
        targetObj.set('visible', visibilityValue);
        targetObj.set('selectable', visibilityValue);
        targetObj.set('evented', visibilityValue);
        targetObj.set('opacity', opacityToSet);
        
        // Mark object as dirty to force Fabric.js to re-render it
        targetObj.dirty = true;
        
        // Recursively set visibility on all children (for groups) BEFORE setting coords
        if (targetObj.type === 'group' && targetObj._objects && Array.isArray(targetObj._objects)) {
          targetObj._objects.forEach(child => {
            setVisibilityRecursive(child, visible);
          });
        }
        
        // Force update coordinates to ensure visibility takes effect
        if (targetObj.setCoords) {
          targetObj.setCoords();
        }
        
        // For groups, also mark the group as needing a render update
        if (targetObj.type === 'group') {
          targetObj.dirty = true;
          if (targetObj._setObjectCoords) {
            targetObj._setObjectCoords();
          }
        }
      };
      
      const allObjects = canvas.getObjects();
      let visibleCount = 0;
      let hiddenCount = 0;
      const viewCounts = {}; // Track counts by view
      
      allObjects.forEach(obj => {
        // Skip constraint overlay - it's always visible
        if (obj.excludeFromExport) {
          return;
        }
        
        // Get viewId from object (check both direct property and get method)
        const objViewId = obj.viewId || obj.get?.('viewId');
        
        if (objViewId) {
          // Ensure viewId is a string for comparison
          const normalizedViewId = String(objViewId).toLowerCase().trim();
          const normalizedActiveView = String(activeView).toLowerCase().trim();
          const shouldBeVisible = normalizedViewId === normalizedActiveView;
          
          // Debug log for first few objects to see what's happening
          if (visibleCount + hiddenCount < 3) {
            console.log(`Setting visibility for object:`, {
              elementId: obj.elementId,
              type: obj.type,
              objViewId: objViewId,
              normalizedViewId: normalizedViewId,
              normalizedActiveView: normalizedActiveView,
              shouldBeVisible: shouldBeVisible,
              currentVisible: obj.visible,
              currentOpacity: obj.opacity
            });
          }
          
          // Use recursive function to set visibility on object and all children
          setVisibilityRecursive(obj, shouldBeVisible);
          
          // Track counts by view
          if (!viewCounts[objViewId]) {
            viewCounts[objViewId] = { total: 0, visible: 0, hidden: 0 };
          }
          viewCounts[objViewId].total++;
          
          if (shouldBeVisible) {
            visibleCount++;
            viewCounts[objViewId].visible++;
          } else {
            hiddenCount++;
            viewCounts[objViewId].hidden++;
          }
        } else {
          // Objects without viewId should be hidden (they shouldn't exist in multi-view mode)
          // But log a warning so we can identify any missing viewIds
          console.warn('Object without viewId found during view switch - hiding it:', {
            elementId: obj.elementId,
            type: obj.type,
            currentView: activeView
          });
          // Use recursive function to hide object and all children
          setVisibilityRecursive(obj, false);
          hiddenCount++;
        }
      });
      
      // Clear selection when switching views (hidden elements can't be selected)
      canvas.discardActiveObject();
      
      // Force update all groups to ensure visibility changes propagate
      allObjects.forEach(obj => {
        if (obj.type === 'group' && obj.setCoords) {
          obj.setCoords();
        }
      });
      
      // Force a full render to ensure visibility changes take effect
      canvas.renderAll();
      
      // Double-check and fix any objects that didn't get their visibility set correctly
      const objectsToFixAfterSet = [];
      allObjects.forEach(obj => {
        if (obj.excludeFromExport) return;
        
        const objViewId = obj.viewId || obj.get?.('viewId');
        if (objViewId) {
          const normalizedViewId = String(objViewId).toLowerCase().trim();
          const normalizedActiveView = String(activeView).toLowerCase().trim();
          const shouldBeVisible = normalizedViewId === normalizedActiveView;
          
          // Check if visibility is incorrect
          if (shouldBeVisible && obj.visible !== true) {
            objectsToFixAfterSet.push({ obj, shouldBeVisible: true });
          } else if (!shouldBeVisible && obj.visible !== false) {
            objectsToFixAfterSet.push({ obj, shouldBeVisible: false });
          }
          
          // Also check group children
          if (obj.type === 'group' && obj._objects) {
            obj._objects.forEach(child => {
              if (shouldBeVisible && child.visible !== true) {
                objectsToFixAfterSet.push({ obj: child, shouldBeVisible: true });
              } else if (!shouldBeVisible && child.visible !== false) {
                objectsToFixAfterSet.push({ obj: child, shouldBeVisible: false });
              }
            });
          }
        }
      });
      
      // Fix any objects with incorrect visibility
      if (objectsToFixAfterSet.length > 0) {
        console.log(`Fixing ${objectsToFixAfterSet.length} objects with incorrect visibility after initial set...`);
        objectsToFixAfterSet.forEach(({ obj, shouldBeVisible }) => {
          obj.set('visible', shouldBeVisible);
          obj.set('selectable', shouldBeVisible);
          obj.set('evented', shouldBeVisible);
          obj.set('opacity', shouldBeVisible ? (obj.originalOpacity || obj._originalOpacity || 1) : 0);
          obj.dirty = true;
          if (obj.setCoords) obj.setCoords();
        });
        canvas.renderAll();
      }
      
      // Double render to ensure Fabric.js processes all visibility changes
      requestAnimationFrame(() => {
        canvas.renderAll();
        
        // Triple render with a small delay to ensure all updates are processed
        setTimeout(() => {
          canvas.renderAll();
        }, 50);
      });
      
      // Double-check visibility by querying all objects
      const verifyObjects = canvas.getObjects().filter(obj => !obj.excludeFromExport);
      const actuallyVisible = verifyObjects.filter(obj => obj.visible === true).length;
      const actuallyHidden = verifyObjects.filter(obj => obj.visible === false).length;
      const actuallyUndefined = verifyObjects.filter(obj => obj.visible === undefined).length;
      console.log(`View switched: ${visibleCount} visible, ${hiddenCount} hidden (verified: ${actuallyVisible} visible, ${actuallyHidden} hidden, ${actuallyUndefined} undefined)`);
      console.log('View breakdown:', viewCounts);
      
      // Log detailed visibility state for each object and fix any that are wrong
      const visibilityDetails = {};
      const objectsToFixAfterVerification = [];
      
      verifyObjects.forEach(obj => {
        const objViewId = obj.viewId || obj.get?.('viewId');
        const key = `${obj.type}-${obj.elementId || 'no-id'}`;
        const normalizedViewId = objViewId ? String(objViewId).toLowerCase().trim() : null;
        const normalizedActiveView = String(activeView).toLowerCase().trim();
        const shouldBeVisible = normalizedViewId === normalizedActiveView;
        
        visibilityDetails[key] = {
          viewId: objViewId,
          visible: obj.visible,
          opacity: obj.opacity,
          selectable: obj.selectable,
          evented: obj.evented,
          shouldBeVisible: shouldBeVisible
        };
        
        // Check if visibility is incorrect and fix it
        if (objViewId) {
          if (shouldBeVisible && obj.visible !== true) {
            console.warn('⚠️ Object should be visible but visibility is not true - fixing:', {
              elementId: obj.elementId,
              viewId: objViewId,
              activeView: activeView,
              currentVisible: obj.visible,
              currentOpacity: obj.opacity
            });
            objectsToFixAfterVerification.push({ obj, shouldBeVisible: true });
          } else if (!shouldBeVisible && obj.visible !== false) {
            console.warn('⚠️ Object should be hidden but visibility is not false - fixing:', {
              elementId: obj.elementId,
              viewId: objViewId,
              activeView: activeView,
              currentVisible: obj.visible,
              currentOpacity: obj.opacity
            });
            objectsToFixAfterVerification.push({ obj, shouldBeVisible: false });
          }
          
          // Also check groups recursively
          if (obj.type === 'group' && obj._objects) {
            obj._objects.forEach((child, idx) => {
              if (shouldBeVisible && child.visible !== true) {
                console.warn(`⚠️ Group child ${idx} should be visible but visibility is not true - fixing:`, {
                  parentElementId: obj.elementId,
                  childType: child.type,
                  childVisible: child.visible
                });
                objectsToFixAfterVerification.push({ obj: child, shouldBeVisible: true });
              } else if (!shouldBeVisible && child.visible !== false) {
                console.warn(`⚠️ Group child ${idx} should be hidden but visibility is not false - fixing:`, {
                  parentElementId: obj.elementId,
                  childType: child.type,
                  childVisible: child.visible
                });
                objectsToFixAfterVerification.push({ obj: child, shouldBeVisible: false });
              }
            });
          }
        }
      });
      
      // Fix any objects with incorrect visibility
      if (objectsToFixAfterVerification.length > 0) {
        console.log(`Fixing ${objectsToFixAfterVerification.length} objects with incorrect visibility...`);
        objectsToFixAfterVerification.forEach(({ obj, shouldBeVisible }) => {
          setVisibilityRecursive(obj, shouldBeVisible);
        });
        // Re-render after fixes
        canvas.renderAll();
      }
      
      console.log('Detailed visibility state:', visibilityDetails);
      
      prevCurrentViewRef.current = activeView;
    }
  }, [initialData, populateCanvasFromData, currentView]); // Depend on currentView for view switching

  /**
   * Redraw product canvas when activeMaterial changes
   */
  useEffect(() => {
    if (scale.current > 0 && fabricCanvasInstance.current) {
      drawProductCanvas();
    }
  }, [activeMaterial, drawProductCanvas]);

  // Expose canvas instance for E2E testing
  if (typeof window !== 'undefined') {
    window.__fabricCanvasInstance = fabricCanvasInstance.current;
  }
  
  return fabricCanvasInstance.current;
};

export default useFabricCanvas;
