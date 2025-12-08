/**
 * useFabricCanvas Hook
 * 
 * Core engine for the memorial design studio. Manages Fabric.js canvas lifecycle,
 * handles object creation, constrains objects within edit zones, and manages
 * selection and modification events.
 */

import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import * as makerjs from 'makerjs';
import { calculateScale, inchesToPixels } from '../utils/unitConverter';
import { importDxfToFabric } from '../../../utils/dxfImporter';
import { artwork } from '../../../data/ArtworkData';

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
export const useFabricCanvas = (fabricCanvasRef, productCanvasRef, initialData, onElementSelect, canvasSize, onCanvasReady, activeMaterial, materials = [], onLoadingStateChange = null, currentView = 'front') => {
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
      const realWorldHeight = initialData.realWorldHeight || 18;
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / realWorldHeight;
      
      // Convert editZone coordinates from inches to pixels
      constraintLeft = editZone.x * scaleX;
      constraintTop = editZone.y * scaleY;
      constraintRight = constraintLeft + (editZone.width * scaleX);
      constraintBottom = constraintTop + (editZone.height * scaleY);
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

    // Helper function to draw floral images (at highest layer)
    const drawFloral = () => {
      if (!initialData || !initialData.floral || !Array.isArray(initialData.floral)) {
        return;
      }
      
      // Draw each floral image
      initialData.floral.forEach((floralItem) => {
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
    const templateWidthInches = initialData.realWorldWidth || 24;
    const templateHeightInches = initialData.realWorldHeight || 18;
    const templateWidth = inchesToPixels(templateWidthInches, scale.current);
    const templateHeight = inchesToPixels(templateHeightInches, scale.current);
    
    templateImg.onload = () => {
      // Helper function to draw overlay after base template/material is drawn
      // Returns a Promise that resolves when overlay is drawn (or immediately if no overlay)
      const drawOverlay = () => {
        return new Promise((resolve) => {
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
              resolve(); // Resolve after overlay is drawn
            };
            
            overlayImg.onerror = () => {
              console.warn('Failed to load overlay image:', initialData.overlayUrl);
              resolve(); // Resolve even on error so floral can still be drawn
            };
            
            overlayImg.src = initialData.overlayUrl;
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

    // Count assets that need to be loaded (images, DXF files, etc.)
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
        // For groups, default to 'center', for other objects default to 'left'/'top'
        const savedOriginX = element.originX !== undefined 
          ? element.originX 
          : (element.type === 'group' || element.type === 'artwork' ? 'center' : 'left');
        const savedOriginY = element.originY !== undefined 
          ? element.originY 
          : (element.type === 'group' || element.type === 'artwork' ? 'center' : 'top');
        
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
          savedRotation: element.rotation
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
          const imageSrc = element.content || element.imageUrl || '';
          
          console.log('Loading image element:', {
            elementId: element.id,
            elementType: element.type,
            imageSrc: imageSrc,
            hasImageSrc: !!imageSrc,
            isSvg: imageSrc.toLowerCase().endsWith('.svg'),
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
                viewId: viewId || null // Tag with view ID for show/hide management
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
                  img.viewId = viewId; // Tag with view ID for show/hide management
                  img.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                  
                  // Store original opacity for visibility toggling
                  if (img.originalOpacity === undefined) {
                    img.originalOpacity = img.opacity !== undefined ? img.opacity : 1;
                  }
              
              // Store artwork metadata if available
              if (element.artworkId) {
                img.artworkId = element.artworkId;
              }
              if (element.category) {
                img.category = element.category;
              }
              
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
                        originalSource: imageSrc,
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
              if (element.fill) {
                img.set('customData', {
                  originalSource: imageSrc,
                  currentColor: element.fill,
                  currentColorId: element.colorId,
                  currentOpacity: element.opacity
                });
              }
              
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
          // Handle groups (DXF artwork with textures)
          let imageUrl = element.imageUrl || element.content;
          let textureUrl = element.textureUrl;
          
          // Normalize empty strings to null/undefined for easier checking
          if (imageUrl && imageUrl.trim() === '') imageUrl = null;
          if (textureUrl && textureUrl.trim() === '') textureUrl = null;
          
          // Fallback: If imageUrl or textureUrl is missing but we have artworkId, look it up from artwork data
          // Also check if we can infer artworkId from category or other properties
          let artworkId = element.artworkId;
          
          // If artworkId is missing but we have textureUrl, try to find matching artwork
          // First try with category if available, then fall back to textureUrl only
          if (!artworkId && textureUrl) {
            let foundArtwork = null;
            
            // Try with category first if available
            if (element.category) {
              foundArtwork = artwork.find(a => a.category === element.category && a.textureUrl === textureUrl);
            }
            
            // If not found with category, try textureUrl only
            if (!foundArtwork) {
              foundArtwork = artwork.find(a => a.textureUrl === textureUrl);
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
          
          if (artworkId) {
            const artworkItem = artwork.find(a => a.id === artworkId);
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
            } else {
              console.warn('Artwork not found in ArtworkData for artworkId:', artworkId);
            }
          }
          
          console.log('Loading artwork/group element:', {
            elementId: element.id,
            elementType: element.type,
            imageUrl: imageUrl,
            textureUrl: textureUrl,
            artworkId: element.artworkId,
            hasImageUrl: !!imageUrl,
            isDxfFile: imageUrl && (imageUrl.endsWith('.dxf') || imageUrl.endsWith('.DXF')),
            elementKeys: Object.keys(element)
          });
          
          // Final check: if we still don't have imageUrl but have textureUrl, try one more lookup
          // Try with category first if available, then fall back to textureUrl only
          if ((!imageUrl || !imageUrl.trim()) && textureUrl) {
            let foundArtwork = null;
            
            // Try with category first if available
            if (element.category) {
              foundArtwork = artwork.find(a => a.category === element.category && a.textureUrl === textureUrl && a.imageUrl);
            }
            
            // If not found with category, try textureUrl only
            if (!foundArtwork) {
              foundArtwork = artwork.find(a => a.textureUrl === textureUrl && a.imageUrl);
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
          
          if (imageUrl && imageUrl.trim() && (imageUrl.endsWith('.dxf') || imageUrl.endsWith('.DXF'))) {
            console.log('Detected DXF file, starting import...');
            // This is a DXF file - re-import it
            try {
              const response = await fetch(imageUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch DXF file: ${response.statusText}`);
              }
              const dxfString = await response.text();
              
              // Import DXF to Fabric.js group
              // NOTE: importDxfToFabric adds the group to the canvas automatically
              // We need to remove it first, modify it, then add it back
              const group = await importDxfToFabric({
                dxfString,
                fabricCanvas: canvas,
                importUnit: makerjs.unitType.Inches,
                textureUrl: textureUrl || null
              });
              
              if (group) {
                // Remove group from canvas temporarily so we can modify it without breaking structure
                // IMPORTANT: Check if group is actually on canvas before removing
                const objectsBeforeRemove = canvas.getObjects();
                const groupOnCanvas = objectsBeforeRemove.includes(group);
                
                if (groupOnCanvas) {
                  canvas.remove(group);
                  console.log('Removed group from canvas for modification');
                } else {
                  console.log('Group not on canvas, skipping remove');
                }
                
                // Verify group structure before modifications
                const groupStructureAfterImport = {
                  type: group.type,
                  childrenCount: group._objects?.length,
                  childrenTypes: group._objects?.map(obj => obj.type),
                  hasTextureLayer: group._objects?.length === 2 && 
                    group._objects[0]?.fill && 
                    typeof group._objects[0].fill === 'object' && 
                    group._objects[0].fill.type === 'pattern',
                  // Check if children are still part of the group
                  childrenStillInGroup: group._objects?.every(child => {
                    // In Fabric.js, children of a group should not have a canvas reference when group is removed
                    return child && child.type;
                  })
                };
                
                console.log('Group structure after import:', groupStructureAfterImport);
                
                // If group structure is broken, log error
                if (group.type !== 'group' || !group._objects || group._objects.length === 0) {
                  console.error('CRITICAL: Group structure is broken after import!', group);
                  continue; // Skip this element
                }
                // Apply saved properties to the group
                const savedWidth = element.width || 0;
                const savedHeight = element.height || 0;
                
                // Get actual group dimensions (before rotation/scale)
                // These are the base dimensions of the group object itself
                const baseGroupWidth = group.width || 0;
                const baseGroupHeight = group.height || 0;
                
                // LOAD DIMENSIONS FROM PIXELS DIRECTLY (preferred) or fall back to inches conversion
                // These saved dimensions are the actual object size (width * scaleX, height * scaleY) BEFORE rotation
                let targetWidthPx, targetHeightPx;
                if (element.widthPx !== undefined && element.heightPx !== undefined) {
                  // New format: Use pixel values directly
                  // These represent the actual object dimensions (width * scaleX, height * scaleY) before rotation
                  targetWidthPx = element.widthPx;
                  targetHeightPx = element.heightPx;
                  console.log(`✓ Using group dimensions from pixels:`, { widthPx: targetWidthPx, heightPx: targetHeightPx });
                } else if (savedWidth > 0 && savedHeight > 0) {
                  // Backward compatibility: Convert from inches
                  targetWidthPx = inchesToPixels(savedWidth, scale.current);
                  targetHeightPx = inchesToPixels(savedHeight, scale.current);
                  console.log(`⚠ Converting group dimensions from inches:`, { 
                    width: savedWidth, 
                    height: savedHeight,
                    scale: scale.current,
                    converted: { widthPx: targetWidthPx, heightPx: targetHeightPx }
                  });
                }
                
                console.log('Group loading (comparing actual dimensions, not bounding box):', {
                  baseGroupWidth,
                  baseGroupHeight,
                  targetWidthPx,
                  targetHeightPx,
                  groupScaleX: group.scaleX,
                  groupScaleY: group.scaleY,
                  savedScaleX: element.scaleX,
                  savedScaleY: element.scaleY,
                  savedAngle: element.rotation || element.angle
                });
                
                if (targetWidthPx > 0 && targetHeightPx > 0 && baseGroupWidth > 0 && baseGroupHeight > 0) {
                  // Calculate scale magnitude based on actual dimensions (not bounding box)
                  // targetWidthPx = baseGroupWidth * scaleX, so scaleX = targetWidthPx / baseGroupWidth
                  const scaleMagnitudeX = targetWidthPx / baseGroupWidth;
                  const scaleMagnitudeY = targetHeightPx / baseGroupHeight;
                  
                  // IMPORTANT: Preserve flip state (sign) from saved scaleX/scaleY
                  // If saved scaleX/scaleY is negative, the artwork was flipped
                  const savedScaleX = element.scaleX || 1;
                  const savedScaleY = element.scaleY || element.scaleX || 1;
                  
                  // Apply the sign (positive or negative) from saved scale to the calculated magnitude
                  baseProps.scaleX = Math.sign(savedScaleX) * Math.abs(scaleMagnitudeX);
                  baseProps.scaleY = Math.sign(savedScaleY) * Math.abs(scaleMagnitudeY);
                  
                  console.log('Calculated group scale (preserving flip state):', { 
                    scaleX: baseProps.scaleX, 
                    scaleY: baseProps.scaleY,
                    savedScaleX,
                    savedScaleY,
                    scaleMagnitudeX,
                    scaleMagnitudeY
                  });
                } else {
                  // Use saved scaleX/scaleY directly (preserves flip state - use !== undefined to allow negative values)
                  baseProps.scaleX = element.scaleX !== undefined ? element.scaleX : 1;
                  baseProps.scaleY = element.scaleY !== undefined ? element.scaleY : (element.scaleX !== undefined ? element.scaleX : 1);
                  console.log('Using saved scaleX/scaleY (preserving flip state):', { 
                    scaleX: baseProps.scaleX, 
                    scaleY: baseProps.scaleY,
                    savedScaleX: element.scaleX,
                    savedScaleY: element.scaleY
                  });
                }
                
                console.log('Group final properties (before set):', {
                  left: baseLeft,
                  top: baseTop,
                  scaleX: baseProps.scaleX,
                  scaleY: baseProps.scaleY,
                  rotation: baseProps.angle,
                  savedScaleX: element.scaleX,
                  savedScaleY: element.scaleY,
                  savedRotation: element.rotation
                });
                
                // Check if flip state was saved (negative scaleX/scaleY indicates flip)
                const savedFlipX = baseProps.scaleX < 0;
                const savedFlipY = baseProps.scaleY < 0;
                
                // IMPORTANT: For rotated groups, property order matters!
                // Set origin point FIRST, then position, then rotation, then scale/flip
                // This ensures Fabric.js calculates coordinates correctly for rotated objects
                
                // Step 1: Set origin point first (critical for rotated groups)
                group.set({
                  originX: baseProps.originX,
                  originY: baseProps.originY
                });
                
                // Step 2: Set position, rotation, scale, and flip in one operation
                group.set({
                  left: baseProps.left,
                  top: baseProps.top,
                  angle: baseProps.angle, // Rotation (already set in baseProps from element.rotation)
                  // Use absolute values for scale (Fabric.js normalizes negative values)
                  scaleX: Math.abs(baseProps.scaleX),
                  scaleY: Math.abs(baseProps.scaleY),
                  // Apply flip using Fabric.js flipX/flipY properties (proper way to handle flips)
                  flipX: savedFlipX,
                  flipY: savedFlipY,
                  opacity: baseProps.opacity,
                  fill: baseProps.fill
                });
                
                // Step 3: Force recalculation of coordinates after setting all properties
                // This is especially important for rotated groups
                group.setCoords();
                group.elementId = element.id;
                group.zIndex = element.zIndex !== undefined ? element.zIndex : 0;
                group.viewId = viewId; // Tag with view ID for show/hide management
                
                // Store original opacity for visibility toggling (preserve existing opacity or default to 1)
                if (group.originalOpacity === undefined) {
                  group.originalOpacity = group.opacity !== undefined ? group.opacity : 1;
                }
                
                // Also tag all children with the same viewId for proper visibility management
                if (group._objects && Array.isArray(group._objects)) {
                  group._objects.forEach(child => {
                    child.viewId = viewId;
                    // Store original opacity for children too
                    if (child.originalOpacity === undefined) {
                      child.originalOpacity = child.opacity !== undefined ? child.opacity : 1;
                    }
                  });
                }
                
                // CRITICAL: Preserve artwork metadata on the group object for saving
                // These properties are needed when saving to identify the artwork source
                if (artworkId) {
                  group.artworkId = artworkId;
                }
                if (imageUrl) {
                  group.imageUrl = imageUrl;
                }
                if (textureUrl) {
                  group.textureUrl = textureUrl;
                }
                if (element.category) {
                  group.category = element.category;
                }
                
                // Also ensure customData has the metadata
                const existingCustomData = group.customData || group.get?.('customData') || {};
                group.set('customData', {
                  ...existingCustomData,
                  type: 'artwork',
                  artworkId: artworkId || existingCustomData.artworkId,
                  artworkName: element.content || existingCustomData.artworkName,
                  imageUrl: imageUrl || existingCustomData.imageUrl,
                  originalSource: imageUrl || existingCustomData.originalSource,
                  textureUrl: textureUrl || existingCustomData.textureUrl,
                  category: element.category || existingCustomData.category,
                  defaultWidthInches: element.defaultWidthInches || existingCustomData.defaultWidthInches,
                  isDxf: true
                });
                
                console.log('Group loaded with metadata:', {
                  elementId: group.elementId,
                  artworkId: group.artworkId,
                  imageUrl: group.imageUrl,
                  textureUrl: group.textureUrl,
                  category: group.category
                });
                
                console.log('Group loaded with rotation:', {
                  left: group.left,
                  top: group.top,
                  angle: group.angle,
                  originX: group.originX,
                  originY: group.originY,
                  scaleX: group.scaleX,
                  scaleY: group.scaleY,
                  flipX: group.flipX,
                  flipY: group.flipY
                });
                
                console.log('Group properties after set:', {
                  left: group.left,
                  top: group.top,
                  scaleX: group.scaleX,
                  scaleY: group.scaleY,
                  angle: group.angle
                });
                
                // Check if this is a texture layer group (has 2 children: texture + artwork)
                const isTextureLayerGroup = group._objects && group._objects.length === 2;
                let textureLayer = null;
                let artworkGroup = group;
                
                if (isTextureLayerGroup) {
                  const firstChild = group._objects[0];
                  const hasPatternFill = firstChild.fill && typeof firstChild.fill === 'object' && firstChild.fill.type === 'pattern';
                  if (hasPatternFill) {
                    textureLayer = firstChild;
                    artworkGroup = group._objects[1];
                    console.log('Detected texture layer group:', {
                      textureLayerType: textureLayer.type,
                      artworkGroupType: artworkGroup.type,
                      textureHasPattern: !!textureLayer.fill
                    });
                  }
                }
                
                // Apply color to artwork group if it was saved
                // Always apply fill if it exists (even if black), or look up by colorId
                if ((element.fill || element.colorId) && artworkGroup) {
                  let finalColor = element.fill;
                  
                  // If we have a colorId but no fill (or fill is default black), look it up from colorData
                  if ((!finalColor || finalColor === '#000000') && element.colorId) {
                    try {
                      const { colorData } = require('../../../data/ColorData');
                      const colorObj = colorData.find(c => c.id === element.colorId);
                      if (colorObj) {
                        finalColor = colorObj.hex || colorObj.color || finalColor;
                      }
                    } catch (e) {
                      console.warn('Could not load colorData for colorId lookup:', e);
                    }
                  }
                  
                  // Apply color if we have one (including black if it was explicitly set)
                  if (finalColor) {
                    // Recursively apply color to all path objects in the artwork group
                    const applyColorToPaths = (obj) => {
                      if (obj.type === 'group' && obj._objects) {
                        obj._objects.forEach(child => applyColorToPaths(child));
                      } else if (obj.type === 'path') {
                        obj.set({
                          fill: finalColor,
                          stroke: element.stroke || finalColor,
                          strokeWidth: baseProps.strokeWidth !== undefined ? baseProps.strokeWidth : 0,
                          opacity: baseProps.opacity !== undefined ? baseProps.opacity : 1
                        });
                      }
                    };
                    
                    applyColorToPaths(artworkGroup);
                    console.log('Applied color to artwork group:', { colorId: element.colorId, fill: finalColor, elementId: element.id });
                  } else {
                    console.warn('No color to apply to artwork group:', { elementId: element.id, hasFill: !!element.fill, colorId: element.colorId });
                  }
                }
                
                // Ensure texture layer pattern is preserved and refreshed after transforms
                if (textureLayer && textureUrl) {
                  console.log('Refreshing texture layer pattern after transforms...');
                  
                  // Recursively refresh pattern fills in texture layer
                  const refreshTexturePattern = async (obj) => {
                    if (obj.type === 'group' && obj._objects) {
                      for (const child of obj._objects) {
                        await refreshTexturePattern(child);
                      }
                    } else if (obj.type === 'path' && obj.fill && typeof obj.fill === 'object' && obj.fill.type === 'pattern') {
                      // Pattern exists, but might need refresh after transforms
                      // Mark as dirty to force re-render
                      obj.dirty = true;
                      obj.setCoords();
                      
                      // If pattern source is lost, reload it
                      if (!obj.fill.source) {
                        try {
                          const textureImage = await new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = () => reject(new Error('Failed to load texture image'));
                            img.src = textureUrl;
                          });
                          
                          let pattern;
                          try {
                            pattern = new fabric.Pattern({
                              source: textureImage,
                              repeat: 'repeat'
                            });
                            if (pattern && typeof pattern.initialize === 'function') {
                              pattern.initialize(textureImage);
                            }
                          } catch (patternError) {
                            // Fallback: try fromURL
                            pattern = await fabric.Pattern.fromURL(textureUrl, {
                              repeat: 'repeat'
                            });
                          }
                          
                          obj.set('fill', pattern);
                          obj.dirty = true;
                        } catch (error) {
                          console.error('Failed to refresh texture pattern:', error);
                        }
                      }
                    }
                  };
                  
                  await refreshTexturePattern(textureLayer);
                  
                  // Force canvas to re-render after pattern refresh
                  canvas.renderAll();
                }
                
                // Verify group structure is still intact before adding
                const groupStructure = {
                  type: group.type,
                  childrenCount: group._objects?.length,
                  childrenTypes: group._objects?.map(obj => obj.type),
                  isGroup: group.type === 'group',
                  hasTextureLayer: group._objects?.length === 2,
                  textureLayerHasPattern: group._objects?.[0]?.fill && 
                    typeof group._objects[0].fill === 'object' && 
                    group._objects[0].fill.type === 'pattern'
                };
                
                console.log('Group structure before adding to canvas:', groupStructure);
                
                // Ensure group structure is preserved - must be a group with children
                if (group.type === 'group' && group._objects && group._objects.length > 0) {
                  // Double-check that children are still part of the group (not orphaned)
                  const allChildrenValid = group._objects.every(child => {
                    // Check if child has a parent reference (if available in Fabric.js version)
                    return child && (child.type === 'group' || child.type === 'path');
                  });
                  
                  if (allChildrenValid) {
                    // Group structure is intact, add it
                    // Make sure group is not already on canvas (shouldn't be after remove, but double-check)
                    const existingObjects = canvas.getObjects();
                    const alreadyOnCanvas = existingObjects.includes(group);
                    
                    if (!alreadyOnCanvas) {
                      canvas.add(group);
                      canvas.renderAll();
                      console.log('Group successfully added to canvas');
                      
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
                    } else {
                      console.warn('Group already on canvas, skipping add');
                      canvas.renderAll();
                    }
                  } else {
                    console.error('Group children invalid, cannot add to canvas:', {
                      children: group._objects.map((child, idx) => ({
                        index: idx,
                        type: child?.type,
                        valid: !!child
                      }))
                    });
                  }
                } else {
                  console.error('Group structure broken, cannot add to canvas:', {
                    type: group.type,
                    hasObjects: !!group._objects,
                    objectsLength: group._objects?.length
                  });
                }
              } else {
                console.error('Failed to import DXF group - group is null/undefined:', {
                  elementId: element.id,
                  imageUrl: imageUrl,
                  textureUrl: textureUrl,
                  element: element
                });
              }
            } catch (err) {
              console.error('Error re-importing DXF group:', err);
              console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                elementId: element.id,
                imageUrl: imageUrl,
                textureUrl: textureUrl
              });
            }
            continue;
          } else if (imageUrl && imageUrl.trim()) {
            // Try loading as regular image (including SVG files)
            console.log('Loading artwork image (SVG or regular image):', {
              imageUrl: imageUrl,
              isSvg: imageUrl.toLowerCase().endsWith('.svg'),
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
                          originalSource: imageSrc,
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
          // Path objects - treat similar to groups
          console.warn('Path objects restoration not fully implemented:', element);
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
          const realWorldHeight = initialData.realWorldHeight || 18;
          
          // Calculate scale for converting inches to pixels
          const scaleX = canvas.width / realWorldWidth;
          const scaleY = canvas.height / realWorldHeight;
          
          // Convert editZone coordinates from inches to pixels
          const x = editZone.x * scaleX;
          const y = editZone.y * scaleY;
          const width = editZone.width * scaleX;
          const height = editZone.height * scaleY;
          
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

      canvas.on('object:scaling', (e) => {
        const obj = e.target;
        isObjectMoving.current = true;
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
  
  useEffect(() => {
    const canvas = fabricCanvasInstance.current;
    if (!canvas || !canvas.listening || !initialData) return; // Only run after canvas is initialized
    
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
        viewsLoadedRef.current = true;
        prevCurrentViewRef.current = activeView;
        if (onLoadingStateChange) {
          updateLoadingState({ isLoading: false, loaded: 0, total: 0, message: '' });
        }
        return;
      }
      
      // Wait for all views to load, then set visibility and reorder by z-index
      Promise.all(loadPromises).then(() => {
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
