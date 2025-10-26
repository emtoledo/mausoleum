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
 * @param {string} materialTexture - URL to the material texture image
 * 
 * @returns {Object} Canvas state and methods
 */
export const useFabricCanvas = (fabricCanvasRef, productCanvasRef, zoneCanvasRef, initialData, materialTexture) => {
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
   * Draw the product canvas with material texture
   */
  const drawProductCanvas = useCallback(() => {
    if (!productCanvasRef.current || !initialData || !materialTexture) return;

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

    // Draw material texture as background
    const textureImg = new Image();
    textureImg.onload = () => {
      ctx.drawImage(textureImg, 0, 0, canvas.width, canvas.height);
    };
    textureImg.src = materialTexture;

  }, [productCanvasRef, initialData, materialTexture, scale]);

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

    const container = fabricCanvasRef.current;
    
    // Calculate scale based on real-world dimensions
    const realWorldWidth = initialData.realWorldWidth || 24;
    const realWorldHeight = initialData.realWorldHeight || 18;
    const canvasWidth = 1200; // Default canvas width in pixels
    const canvasHeight = (canvasWidth / realWorldWidth) * realWorldHeight;

    scale.current = calculateScale(realWorldWidth, canvasWidth);

    // Create Fabric.js canvas
    const canvas = new fabric.Canvas(container, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true
    });

    fabricCanvasInstance.current = canvas;

    // Draw product and zone canvases
    drawProductCanvas();
    drawZoneCanvas();

    // Populate canvas with design elements
    if (initialData.designElements && initialData.designElements.length > 0) {
      populateCanvasFromData(canvas, initialData.designElements);
    }

    // Selection event listeners
    canvas.on('selection:created', (e) => {
      const activeObject = canvas.getActiveObject();
      selectedObject.current = activeObject;
      console.log('Object selected:', activeObject);
    });

    canvas.on('selection:cleared', () => {
      selectedObject.current = null;
      console.log('Selection cleared');
    });

    canvas.on('selection:updated', (e) => {
      const activeObject = canvas.getActiveObject();
      selectedObject.current = activeObject;
      console.log('Selection updated:', activeObject);
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

    // Cleanup
    return () => {
      canvas.off('selection:created');
      canvas.off('selection:cleared');
      canvas.off('selection:updated');
      canvas.off('object:moving');
      canvas.off('object:scaling');
      canvas.off('object:rotating');
      canvas.off('object:modified');
      canvas.dispose();
      fabricCanvasInstance.current = null;
    };
  }, [fabricCanvasRef, initialData, drawProductCanvas, drawZoneCanvas, populateCanvasFromData, constrainObjectInZone, getEditZoneForObject]);

  /**
   * Update canvases when material texture changes
   */
  useEffect(() => {
    if (!fabricCanvasInstance.current) return;
    drawProductCanvas();
    drawZoneCanvas();
  }, [materialTexture, drawProductCanvas, drawZoneCanvas]);

  return {
    canvas: fabricCanvasInstance.current,
    selectedObject: selectedObject.current
  };
};

export default useFabricCanvas;
