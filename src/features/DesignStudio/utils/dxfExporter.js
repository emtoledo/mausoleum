/**
 * DXF Exporter Utility
 * 
 * Converts all canvas objects (from both product-canvas and fabric-canvas) into
 * a single unified DXF file with proper coordinate system conversion.
 */

import opentype from 'opentype.js';
import * as maker from 'makerjs';
import * as fabric from 'fabric';

// Module-level cache to store loaded fonts
const fontCache = new Map();

/**
 * Recursively calculates the bounding box of all paths within a Maker.js model
 * 
 * @param {Object} model - Maker.js model
 * @param {Object} bounds - Bounds object to accumulate results (optional)
 * @returns {Object} - Bounds object with {minX, minY, maxX, maxY}
 */
function getModelBounds(model, bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }) {
  if (model.paths) {
    Object.keys(model.paths).forEach(pathKey => {
      const path = model.paths[pathKey];
      
      if (path.origin && Array.isArray(path.origin)) {
        bounds.minX = Math.min(bounds.minX, path.origin[0]);
        bounds.minY = Math.min(bounds.minY, path.origin[1]);
        bounds.maxX = Math.max(bounds.maxX, path.origin[0]);
        bounds.maxY = Math.max(bounds.maxY, path.origin[1]);
      }
      if (path.end && Array.isArray(path.end)) {
        bounds.minX = Math.min(bounds.minX, path.end[0]);
        bounds.minY = Math.min(bounds.minY, path.end[1]);
        bounds.maxX = Math.max(bounds.maxX, path.end[0]);
        bounds.maxY = Math.max(bounds.maxY, path.end[1]);
      }
      if (path.center && Array.isArray(path.center)) {
        if (path.radius !== undefined) {
          const r = path.radius;
          bounds.minX = Math.min(bounds.minX, path.center[0] - r);
          bounds.minY = Math.min(bounds.minY, path.center[1] - r);
          bounds.maxX = Math.max(bounds.maxX, path.center[0] + r);
          bounds.maxY = Math.max(bounds.maxY, path.center[1] + r);
        } else {
          bounds.minX = Math.min(bounds.minX, path.center[0]);
          bounds.minY = Math.min(bounds.minY, path.center[1]);
          bounds.maxX = Math.max(bounds.maxX, path.center[0]);
          bounds.maxY = Math.max(bounds.maxY, path.center[1]);
        }
      }
    });
  }
  
  if (model.models) {
    Object.keys(model.models).forEach(modelKey => {
      getModelBounds(model.models[modelKey], bounds);
    });
  }
  
  return bounds;
}

/**
 * Converts an SVG file to maker.js models
 * 
 * @param {string} svgUrl - URL of the SVG file
 * @param {number} widthInches - Width in inches
 * @param {number} heightInches - Height in inches
 * @returns {Promise<Object>} - Maker.js model object
 */
async function svgToMakerModel(svgUrl, widthInches, heightInches) {
  try {
    // Fetch the SVG
    const response = await fetch(svgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    }
    
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // Read the SVG's coordinate system from viewBox or width/height
    let svgCoordWidth = null;
    let svgCoordHeight = null;
    
    // Try viewBox first (most reliable)
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const viewBoxValues = viewBox.split(/\s+|,/).filter(v => v);
      if (viewBoxValues.length >= 4) {
        svgCoordWidth = parseFloat(viewBoxValues[2]);
        svgCoordHeight = parseFloat(viewBoxValues[3]);
        console.log(`SVG viewBox found: ${viewBox} → coordinate system: ${svgCoordWidth} x ${svgCoordHeight}`);
      }
    }
    
    // Fallback to width/height attributes
    if (!svgCoordWidth || !svgCoordHeight) {
      svgCoordWidth = parseFloat(svgElement.getAttribute('width')) || null;
      svgCoordHeight = parseFloat(svgElement.getAttribute('height')) || null;
      if (svgCoordWidth && svgCoordHeight) {
        console.log(`SVG width/height found: ${svgCoordWidth} x ${svgCoordHeight}`);
      }
    }
    
    console.log(`Converting SVG to Maker.js model`);
    console.log(`SVG coordinate system: ${svgCoordWidth} x ${svgCoordHeight}`);
    console.log(`Target template dimensions: ${widthInches}" x ${heightInches}"`);
    
    // Convert all SVG elements to Maker.js models at their natural coordinates
    const paths = svgElement.querySelectorAll('path');
    const models = {};
    let modelIndex = 0;
    
    // Convert path elements (no transformation - use coordinates as-is)
    paths.forEach((path) => {
      const pathData = path.getAttribute('d');
      if (pathData) {
        try {
          const pathModel = maker.importer.fromSVGPathData(pathData);
          if (pathModel && pathModel.paths) {
            models[`path-${modelIndex++}`] = pathModel;
          }
        } catch (err) {
          console.warn(`Failed to convert SVG path ${modelIndex}:`, err);
        }
      }
    });
    
    // Convert rectangle elements (no transformation)
    const rects = svgElement.querySelectorAll('rect');
    rects.forEach((rect) => {
      try {
        const x = parseFloat(rect.getAttribute('x')) || 0;
        const y = parseFloat(rect.getAttribute('y')) || 0;
        const w = parseFloat(rect.getAttribute('width')) || 0;
        const h = parseFloat(rect.getAttribute('height')) || 0;
        if (w > 0 && h > 0) {
          const rectModel = new maker.models.Rectangle(w, h);
          maker.model.move(rectModel, [x, y]);
          models[`rect-${modelIndex++}`] = rectModel;
        }
      } catch (err) {
        console.warn(`Failed to convert SVG rect ${modelIndex}:`, err);
      }
    });
    
    // Convert circle elements
    const circles = svgElement.querySelectorAll('circle');
    circles.forEach((circle) => {
      try {
        const cx = parseFloat(circle.getAttribute('cx')) || 0;
        const cy = parseFloat(circle.getAttribute('cy')) || 0;
        const r = parseFloat(circle.getAttribute('r')) || 0;
        if (r > 0) {
          const pathData = `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`;
          const pathModel = maker.importer.fromSVGPathData(pathData);
          if (pathModel && pathModel.paths) {
            models[`circle-${modelIndex++}`] = pathModel;
          }
        }
      } catch (err) {
        console.warn(`Failed to convert SVG circle ${modelIndex}:`, err);
      }
    });
    
    // Convert ellipse elements
    const ellipses = svgElement.querySelectorAll('ellipse');
    ellipses.forEach((ellipse) => {
      try {
        const cx = parseFloat(ellipse.getAttribute('cx')) || 0;
        const cy = parseFloat(ellipse.getAttribute('cy')) || 0;
        const rx = parseFloat(ellipse.getAttribute('rx')) || 0;
        const ry = parseFloat(ellipse.getAttribute('ry')) || 0;
        if (rx > 0 && ry > 0) {
          const pathData = `M ${cx - rx},${cy} A ${rx},${ry} 0 1,1 ${cx + rx},${cy} A ${rx},${ry} 0 1,1 ${cx - rx},${cy}`;
          const pathModel = maker.importer.fromSVGPathData(pathData);
          if (pathModel && pathModel.paths) {
            models[`ellipse-${modelIndex++}`] = pathModel;
          }
        }
      } catch (err) {
        console.warn(`Failed to convert SVG ellipse ${modelIndex}:`, err);
      }
    });
    
    // Convert line elements
    const lines = svgElement.querySelectorAll('line');
    lines.forEach((line) => {
      try {
        const x1 = parseFloat(line.getAttribute('x1')) || 0;
        const y1 = parseFloat(line.getAttribute('y1')) || 0;
        const x2 = parseFloat(line.getAttribute('x2')) || 0;
        const y2 = parseFloat(line.getAttribute('y2')) || 0;
        const lineModel = {
          paths: {
            line: new maker.paths.Line([x1, y1], [x2, y2])
          }
        };
        models[`line-${modelIndex++}`] = lineModel;
      } catch (err) {
        console.warn(`Failed to convert SVG line ${modelIndex}:`, err);
      }
    });
    
    // If no elements found, create a rectangle as fallback
    if (Object.keys(models).length === 0) {
      return new maker.models.Rectangle(widthInches, heightInches);
    }
    
    // Combine all elements into a single model
    let combinedModel;
    if (Object.keys(models).length === 1) {
      combinedModel = Object.values(models)[0];
    } else {
      combinedModel = { models };
    }
    
    // Get bounds to verify and optionally normalize
    const actualBounds = getModelBounds(combinedModel);
    
    if (isFinite(actualBounds.minX) && isFinite(actualBounds.minY) && 
        isFinite(actualBounds.maxX) && isFinite(actualBounds.maxY)) {
      
      const actualWidth = actualBounds.maxX - actualBounds.minX;
      const actualHeight = actualBounds.maxY - actualBounds.minY;
      
      console.log(`SVG path bounds (original): [${actualBounds.minX}, ${actualBounds.minY}] to [${actualBounds.maxX}, ${actualBounds.maxY}]`);
      console.log(`SVG path dimensions (original): ${actualWidth} x ${actualHeight}`);
      
      // Normalize to [0,0] first
      maker.model.move(combinedModel, [-actualBounds.minX, -actualBounds.minY]);
      console.log(`Normalized to origin [0, 0]`);
      
      // Scale based on SVG coordinate system if available, otherwise use path bounds
      if (svgCoordWidth && svgCoordHeight && svgCoordWidth > 0 && svgCoordHeight > 0) {
        // Use SVG coordinate system as reference
        const scaleX = widthInches / svgCoordWidth;
        const scaleY = heightInches / svgCoordHeight;
        console.log(`Scaling from SVG coordinate system (${svgCoordWidth} x ${svgCoordHeight}) to template (${widthInches}" x ${heightInches}"): scaleX=${scaleX}, scaleY=${scaleY}`);
        maker.model.scale(combinedModel, scaleX, scaleY);
      } else if (actualWidth > 0 && actualHeight > 0) {
        // Fallback: use path bounds
        const scaleX = widthInches / actualWidth;
        const scaleY = heightInches / actualHeight;
        console.log(`Scaling from path bounds (${actualWidth} x ${actualHeight}) to template (${widthInches}" x ${heightInches}"): scaleX=${scaleX}, scaleY=${scaleY}`);
        maker.model.scale(combinedModel, scaleX, scaleY);
      } else {
        console.warn('Invalid dimensions, cannot scale');
        return new maker.models.Rectangle(widthInches, heightInches);
      }
      
      // Verify final bounds after scaling
      const finalBounds = getModelBounds(combinedModel);
      const finalWidth = finalBounds.maxX - finalBounds.minX;
      const finalHeight = finalBounds.maxY - finalBounds.minY;
      console.log(`SVG path bounds (after scaling): [${finalBounds.minX}, ${finalBounds.minY}] to [${finalBounds.maxX}, ${finalBounds.maxY}]`);
      console.log(`SVG path dimensions (after scaling): ${finalWidth}" x ${finalHeight}"`);
      console.log(`Expected template dimensions: ${widthInches}" x ${heightInches}"`);
      
      if (Math.abs(finalWidth - widthInches) > 0.1 || Math.abs(finalHeight - heightInches) > 0.1) {
        console.warn(`WARNING: Final dimensions don't match template! Expected ${widthInches}" x ${heightInches}", got ${finalWidth}" x ${finalHeight}"`);
      }
    } else {
      console.warn('Could not determine path bounds, using fallback rectangle');
      return new maker.models.Rectangle(widthInches, heightInches);
    }
    
    return combinedModel;
  } catch (error) {
    console.warn(`Failed to convert SVG to maker model: ${svgUrl}`, error);
    return new maker.models.Rectangle(widthInches, heightInches);
  }
}

/**
 * Font mapping for opentype.js
 */
const fontMap = {
  'Arial': 'Arial.ttf',
  'Times New Roman': 'Times New Roman.ttf',
  'Helvetica': 'Helvetica.ttc',
  'Georgia': 'Georgia.ttf',
  'Courier New': 'CourierNew.ttf',
  'Verdana': 'Verdana.ttf',
  'New York': 'NewYork.ttf'
};

/**
 * Loads a font from /public/fonts/ directory
 */
async function getFont(fontFamily) {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily);
  }

  let fontFilename = fontMap[fontFamily];
  if (!fontFilename) {
    fontFilename = `${fontFamily}.ttf`;
  }
  
  const encodedFilename = encodeURIComponent(fontFilename);
  const fontUrl = `/fonts/${encodedFilename}`;
  
  try {
    const font = await opentype.load(fontUrl);
    fontCache.set(fontFamily, font);
    return font;
  } catch (err) {
    console.error(`Failed to load font: ${fontUrl}`, err);
    fontCache.set(fontFamily, null);
    return null;
  }
}

/**
 * Helper function to trigger a browser download
 */
function triggerDownload(filename, data) {
  const blob = new Blob([data], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper function to create an offset for a Maker.js model
 * to match the Fabric.js object's originX/originY.
 * Maker.js models are always built from bottom-left (0,0),
 * so we need to compensate for Fabric's origin point.
 * 
 * @param {fabric.Object} obj - Fabric.js object
 * @param {number} width - Object width in inches
 * @param {number} height - Object height in inches
 * @returns {Object} - Offset {x, y} to apply to Maker.js model
 */
function getMakerOriginOffset(obj, width, height) {
  let x = 0;
  let y = 0; // Maker.js default origin is bottom-left
  
  // Handle originX
  if (obj.originX === 'center') {
    x = -width / 2;
  } else if (obj.originX === 'right') {
    x = -width;
  }
  // else 'left' - no adjustment needed (Maker.js default)
  
  // Handle originY
  if (obj.originY === 'center') {
    y = -height / 2;
  } else if (obj.originY === 'top') {
    // This is the most common mismatch
    // Fabric 'top' means top-left, Maker.js default is bottom-left
    y = -height;
  }
  // else 'bottom' - no adjustment needed (Maker.js default)
  
  return { x, y };
}

/**
 * Converts a Fabric.js object to a Maker.js model,
 * handling coordinate system and origin transformations.
 * 
 * @param {fabric.Object} obj - Fabric.js object
 * @param {Object} decomposed - Decomposed transform matrix from qrDecompose
 * @param {number} canvasHeightInches - Canvas height in inches (for Y-flip)
 * @param {number} scale - Scale factor (pixels to inches)
 * @returns {Object|null} - Maker.js model or null if unsupported
 */
function convertFabricToMaker(obj, decomposed, canvasHeightInches, scale) {
  const { translateX, translateY, angle, scaleX, scaleY } = decomposed;
  
  // Convert translateX/Y from pixels to inches
  const translateXInches = translateX / scale;
  const translateYInches = translateY / scale;
  
  let baseModel = null;
  
  // --- A. Create the base Maker.js model at (0,0) ---
  
  if (obj.type === 'text') {
    // Text objects are handled separately with opentype.js
    // This function is mainly for shapes
    return null;
  } else if (obj.type === 'rect' || obj.type === 'image' || obj.type === 'imagebox') {
    // For rectangles and images, get dimensions
    const widthPx = obj.get('width') || obj.width || 0;
    const heightPx = obj.get('height') || obj.height || 0;
    const w = (widthPx * scaleX) / scale;
    const h = (heightPx * scaleY) / scale;
    
    // Create rectangle model
    baseModel = new maker.models.Rectangle(w, h);
    
    // Apply origin offset to compensate for Fabric's origin
    const originOffset = getMakerOriginOffset(obj, w, h);
    maker.model.move(baseModel, [originOffset.x, originOffset.y]);
    
  } else if (obj.type === 'circle') {
    // Assumes uniform scale. If not, it's an ellipse.
    const radiusPx = obj.get('radius') || obj.radius || 0;
    const r = (radiusPx * scaleX) / scale;
    
    baseModel = new maker.models.Circle(r);
    // No origin offset needed. Fabric 'center' and Maker 'center' are both (0,0)
    
  } else if (obj.type === 'path') {
    // Paths: The path data is already relative to (0,0)
    // fabric.util.joinPath converts the path array to SVG 'd' string
    if (obj.path && Array.isArray(obj.path)) {
      try {
        const svgPathString = fabric.util.joinPath(obj.path);
        baseModel = maker.importer.fromSVGPathData(svgPathString);
        
        // Apply path-specific scaling
        if (scaleX > 0 && scaleY > 0) {
          maker.model.scale(baseModel, scaleX, scaleY);
        }
      } catch (pathErr) {
        console.warn('Failed to convert path to SVG:', pathErr);
        return null;
      }
    } else {
      console.warn('Path object has no path data');
      return null;
    }
  } else {
    console.warn(`Unsupported object type for DXF export: ${obj.type}`);
    return null;
  }
  
  if (!baseModel) {
    return null;
  }
  
  // --- B. Apply Global Transforms (Rotate, then Move) ---
  
  // 1. Rotate the model around its (now corrected) origin
  if (angle !== 0) {
    maker.model.rotate(baseModel, -angle, [0, 0]); // Negative because Fabric uses clockwise, Maker.js uses counter-clockwise
  }
  
  // 2. Move the model to its final global position,
  //    applying the Y-FLIP
  const finalX = translateXInches;
  const finalY = canvasHeightInches - translateYInches; // The Y-Flip
  
  maker.model.move(baseModel, [finalX, finalY]);
  
  return baseModel;
}

/**
 * Converts Y coordinate from Y-down (Fabric.js/web) to Y-up (DXF/Cartesian)
 * 
 * @param {number} yDown - Y coordinate in Y-down system
 * @param {number} canvasHeightInches - Canvas height in inches
 * @returns {number} - Y coordinate in Y-up system
 */
function convertYDownToYUp(yDown, canvasHeightInches) {
  return canvasHeightInches - yDown;
}

/**
 * Main export function - Unified approach
 * Collects all objects from both canvases and creates a single DXF model
 */
export async function exportToDxf({ fabricCanvas, productData, unitConverter }) {
  try {
    console.log('Starting unified DXF export...', { productData, fabricCanvas });
    
    // Step 1: Calculate scale and canvas dimensions
    const scale = unitConverter.calculateScale(
      productData.realWorldWidth,
      fabricCanvas.width
    );
    
    const canvasWidthInches = (productData.canvas && productData.canvas.width) 
      ? productData.canvas.width 
      : (productData.realWorldWidth || 24);
    const canvasHeightInches = (productData.canvas && productData.canvas.height) 
      ? productData.canvas.height 
      : (productData.realWorldHeight || 18);
    
    console.log(`Canvas dimensions: ${canvasWidthInches}" x ${canvasHeightInches}", scale: ${scale}`);
    
    // Step 2: Initialize single consolidated Maker.js model
    // This will be the parent model containing all objects
    const mainMakerModel = { models: {} };
    
    // UNIVERSAL COORDINATE SYSTEM: Canvas dimensions (canvasWidthInches x canvasHeightInches)
    // All objects are positioned relative to this coordinate system
    // Origin [0, 0] is at top-left in Y-down system, bottom-left in Y-up (DXF) system
    
    console.log(`\n=== UNIVERSAL COORDINATE SYSTEM ===`);
    console.log(`Canvas: ${canvasWidthInches}" x ${canvasHeightInches}"`);
    console.log(`Scale (pixels to inches): ${scale}`);
    console.log(`=====================================\n`);
    
    // Step 3: Collect all objects from both canvases into unified list
    // Both canvases are aligned at (0,0) via CSS, so we treat them as a single coordinate system
    const allObjects = [];
    
    // 3a. Product Canvas Objects (from productData)
    // These are drawn on the product-canvas (HTML5 Canvas), not Fabric.js
    // We need to create transform matrices for these objects just like Fabric.js objects
    
    // Template SVG - create absolute transform matrix
    if (productData.imageUrl) {
      const templateWidth = productData.realWorldWidth || 24;
      const templateHeight = productData.realWorldHeight || 18;
      
      // Template is drawn at [0, 0] in pixels on product canvas
      // Convert to inches using the scale
      // Since both canvases are aligned, pixel [0,0] = inch [0,0]
      const templateXInches = 0;
      const templateYInches = 0;
      
      // Create a transform matrix for the template
      // Template has: position [0, 0], size [templateWidth, templateHeight], rotation 0
      // This is equivalent to: translate(0, 0), scale(1, 1), rotate(0)
      const templateMatrix = [
        1, 0, 0,  // scaleX, skewY, 0
        0, 1, 0,  // skewX, scaleY, 0
        templateXInches * scale, templateYInches * scale, 1  // translateX, translateY, 1 (in pixels)
      ];
      
      const templateDecomposed = fabric.util.qrDecompose(templateMatrix);
      
      allObjects.push({
        type: 'template',
        source: productData.imageUrl,
        width: templateWidth,
        height: templateHeight,
        decomposed: templateDecomposed, // Store decomposed transform matrix
        x: templateXInches, // For reference
        y: templateYInches,  // For reference
        angle: 0
      });
    }
    
    // Overlay SVG - create absolute transform matrix
    if (productData.overlayUrl) {
      const overlayWidth = productData.realWorldWidth || 24;
      const overlayHeight = productData.realWorldHeight || 18;
      const overlayXInches = 0;
      const overlayYInches = 0;
      
      const overlayMatrix = [
        1, 0, 0,
        0, 1, 0,
        overlayXInches * scale, overlayYInches * scale, 1
      ];
      
      const overlayDecomposed = fabric.util.qrDecompose(overlayMatrix);
      
      allObjects.push({
        type: 'overlay',
        source: productData.overlayUrl,
        width: overlayWidth,
        height: overlayHeight,
        decomposed: overlayDecomposed,
        x: overlayXInches,
        y: overlayYInches,
        angle: 0
      });
    }
    
    // ProductBase rectangles - create absolute transform matrices
    if (productData.productBase && Array.isArray(productData.productBase)) {
      productData.productBase.forEach((base, index) => {
        if (base.x !== undefined && base.y !== undefined && base.width && base.height) {
          // ProductBase uses top-left origin in Y-down coordinates
          const baseXInches = base.x;
          const baseYInches = base.y;
          
          const baseMatrix = [
            1, 0, 0,
            0, 1, 0,
            baseXInches * scale, baseYInches * scale, 1
          ];
          
          const baseDecomposed = fabric.util.qrDecompose(baseMatrix);
          
          allObjects.push({
            type: 'productBase',
            id: base.id || `base-${index}`,
            width: base.width,
            height: base.height,
            decomposed: baseDecomposed,
            x: baseXInches,
            y: baseYInches,
            angle: 0
          });
        }
      });
    }
    
    // 3b. Fabric Canvas Objects (from fabricCanvas)
    // These are Fabric.js objects with complex transforms
    // Filter to only visible objects (current view)
    const allFabricObjects = fabricCanvas.getObjects();
    const fabricObjects = allFabricObjects.filter(obj => obj.visible !== false);
    console.log(`Found ${allFabricObjects.length} Fabric.js objects (${fabricObjects.length} visible)`);
    
    fabricObjects.forEach((obj, index) => {
      // Get the final, calculated transformation matrix
      // This accounts for groups, viewport transforms, etc.
      const absoluteMatrix = obj.calcTransformMatrix();
      
      // Decompose the matrix to get absolute transform values
      const decomposed = fabric.util.qrDecompose(absoluteMatrix);
      
      allObjects.push({
        type: obj.type || 'unknown',
        fabricObj: obj,
        decomposed, // Store the decomposed matrix for convertFabricToMaker
        elementId: obj.elementId || obj.id || `fabric-${index}`
      });
    });
    
    console.log(`Total objects to export: ${allObjects.length}`);
    
    // Step 4: Load all required fonts
    const uniqueFonts = [
      ...new Set(
        allObjects
          .filter(obj => obj.type === 'text' && obj.fabricObj)
          .map(obj => obj.fabricObj.fontFamily || 'Arial')
      )
    ];
    
    await Promise.all(uniqueFonts.map(getFont));
    
    // Step 5: Convert each object to Maker.js model and add to unified document
    for (const obj of allObjects) {
      let makerModel = null;
      
      try {
        if (obj.type === 'template' || obj.type === 'overlay') {
          console.log(`\n=== Processing ${obj.type.toUpperCase()} ===`);
          console.log(`Source: ${obj.source}`);
          console.log(`Dimensions: ${obj.width}" x ${obj.height}"`);
          console.log(`Absolute transform:`, obj.decomposed);
          
          // Convert SVG to maker.js model
          // The SVG should be converted at its natural size, then we'll apply the transform
          // For now, convert it to fit the template dimensions
          console.log(`Converting SVG to Maker.js model...`);
          makerModel = await svgToMakerModel(obj.source, obj.width, obj.height);
          
          if (!makerModel) {
            console.error(`Failed to convert ${obj.type} SVG to model`);
            continue;
          }
          
          // Log model structure
          const modelKeys = Object.keys(makerModel.models || {});
          const pathKeys = Object.keys(makerModel.paths || {});
          console.log(`${obj.type} model created:`, {
            hasModels: !!makerModel.models,
            hasPaths: !!makerModel.paths,
            modelCount: modelKeys.length,
            pathCount: pathKeys.length
          });
          
          // Apply the absolute transform from decomposed matrix
          // This is the same approach we use for Fabric.js objects
          // 1. Apply origin offset (if needed - template uses top-left origin)
          // 2. Apply rotation
          // 3. Apply Y-flip and position
          
          // Template/overlay use top-left origin in Fabric.js (Y-down)
          // In DXF (Y-up), template should be positioned above productBase
          // Template is 23" tall, canvas is 26" tall, productBase is 3" tall at bottom
          // So template should be from Y=3 to Y=26 (bottom-left at Y=3, top at Y=26)
          
          // The model from svgToMakerModel is normalized to [0,0] with top-left at origin
          // After normalization, the template spans from [0, 0] to [width, height] in Y-down coordinates
          // We need to:
          // 1. Apply origin offset to convert from top-left to bottom-left (move down by height)
          // 2. Apply Y-flip to convert from Y-down to Y-up
          // 3. Position at final location
          
          // Get initial bounds for debugging
          const initialBounds = getModelBounds(makerModel);
          console.log(`${obj.type} initial bounds:`, initialBounds);
          
          // Step 1: Apply origin offset - move from top-left to bottom-left
          // Currently at [0, 0] with top-left at origin, move down by height
          maker.model.move(makerModel, [0, -obj.height]);
          
          const boundsAfterOriginOffset = getModelBounds(makerModel);
          console.log(`${obj.type} bounds after origin offset:`, boundsAfterOriginOffset);
          
          // Step 2: Apply rotation (should be 0 for template/overlay)
          if (obj.decomposed.angle !== 0) {
            maker.model.rotate(makerModel, -obj.decomposed.angle, [0, 0]);
            const boundsAfterRotate = getModelBounds(makerModel);
            console.log(`${obj.type} bounds after rotation:`, boundsAfterRotate);
          }
          
          // Step 3: Position using the actual transform from decomposed matrix
          // The decomposed translateX/Y gives us the position of the origin point in pixels
          // Convert to inches and apply Y-flip for DXF coordinate system
          const originXInches = obj.decomposed.translateX / scale;
          const originYInches = obj.decomposed.translateY / scale;
          
          // Convert from Y-down (Fabric) to Y-up (DXF)
          // After origin offset, the template's bottom-left is at [0, 0] in Y-down
          // The origin point (top-left in Fabric) is at [originXInches, originYInches] in Y-down
          // In Y-up: Y-up = canvasHeight - Y-down
          // So origin Y in Y-up = canvasHeight - originYInches
          // But we've already offset by -obj.height, so the bottom-left is at [0, 0] in Y-down
          // The origin (top-left) was at [originXInches, originYInches], so bottom-left was at [originXInches, originYInches + obj.height]
          // After offset, bottom-left is at [0, 0], so we need to move to [originXInches, originYInches + obj.height]
          // Then convert to Y-up: Y = canvasHeight - (originYInches + obj.height)
          const finalX = originXInches;
          const finalYDown = originYInches + obj.height; // Bottom Y in Y-down coordinates
          const finalYUp = canvasHeightInches - finalYDown; // Convert to Y-up
          
          console.log(`${obj.type} origin position (Y-down): [${originXInches}, ${originYInches}]`);
          console.log(`${obj.type} bottom position (Y-down): [${finalX}, ${finalYDown}]`);
          console.log(`${obj.type} bottom position (Y-up): [${finalX}, ${finalYUp}]`);
          
          // Move to position in Y-down coordinates first
          maker.model.move(makerModel, [finalX, finalYDown]);
          
          const boundsAfterPosition = getModelBounds(makerModel);
          console.log(`${obj.type} bounds after positioning:`, boundsAfterPosition);
          
          // Step 4: Flip vertically to convert from Y-down to Y-up
          // After positioning, template is at correct position but still in Y-down orientation
          // We need to flip it around its horizontal centerline
          const boundsBeforeFlip = getModelBounds(makerModel);
          const centerX = (boundsBeforeFlip.minX + boundsBeforeFlip.maxX) / 2;
          const centerY = (boundsBeforeFlip.minY + boundsBeforeFlip.maxY) / 2;
          
          try {
            // Mirror around the center
            maker.model.mirror(makerModel, false, true, [centerX, centerY]);
            const boundsAfterFlip = getModelBounds(makerModel);
            console.log(`${obj.type} bounds after flip:`, boundsAfterFlip);
          } catch (mirrorErr) {
            console.warn(`Failed to mirror ${obj.type}:`, mirrorErr);
          }
          
          // Add to consolidated model
          maker.model.addModel(mainMakerModel, makerModel, obj.type);
          console.log(`${obj.type} positioned at [${finalX}, ${finalYUp}] (after Y-flip)`);
          console.log(`=== End ${obj.type.toUpperCase()} processing ===\n`);
          
        } else if (obj.type === 'productBase') {
          // Create rectangle
          makerModel = new maker.models.Rectangle(obj.width, obj.height);
          
          // Convert Y coordinate: productBase uses top-left origin
          const dxfX = obj.x;
          const dxfY = convertYDownToYUp(obj.y + obj.height, canvasHeightInches);
          
          maker.model.move(makerModel, [dxfX, dxfY]);
          
          // Add to consolidated model
          maker.model.addModel(mainMakerModel, makerModel, obj.id);
          console.log(`ProductBase "${obj.id}" positioned at [${dxfX}, ${dxfY}]`);
          
        } else if (obj.type === 'text' && obj.fabricObj) {
          // Convert text to vector paths using opentype.js
          const fontFamily = obj.fabricObj.fontFamily || 'Arial';
          const font = fontCache.get(fontFamily);
          
          if (!font) {
            console.error(`Font not loaded: ${fontFamily}. Skipping text.`);
            continue;
          }
          
          // Get font size from decomposed scale or object property
          const fontSizePx = obj.fabricObj.fontSize || 12;
          const fontSizeInches = (fontSizePx * obj.decomposed.scaleY) / scale;
          
          const openTypePath = font.getPath(obj.fabricObj.text || 'Text', 0, 0, fontSizeInches);
          
          // Build SVG path data from opentype commands
          const commands = openTypePath.commands || [];
          const pathParts = [];
          let currentX = 0;
          let currentY = 0;
          
          commands.forEach((cmd) => {
            if (cmd.type === 'M' || cmd.type === 'm') {
              if (cmd.type === 'M') {
                currentX = cmd.x;
                currentY = cmd.y;
                pathParts.push(`M ${cmd.x} ${cmd.y}`);
              } else {
                currentX += cmd.x;
                currentY += cmd.y;
                pathParts.push(`M ${currentX} ${currentY}`);
              }
            } else if (cmd.type === 'L' || cmd.type === 'l') {
              if (cmd.type === 'L') {
                currentX = cmd.x;
                currentY = cmd.y;
                pathParts.push(`L ${cmd.x} ${cmd.y}`);
              } else {
                currentX += cmd.x;
                currentY += cmd.y;
                pathParts.push(`L ${currentX} ${currentY}`);
              }
            } else if (cmd.type === 'C' || cmd.type === 'c') {
              if (cmd.type === 'C') {
                pathParts.push(`C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
                currentX = cmd.x;
                currentY = cmd.y;
              } else {
                const x1 = currentX + cmd.x1;
                const y1 = currentY + cmd.y1;
                const x2 = currentX + cmd.x2;
                const y2 = currentY + cmd.y2;
                currentX += cmd.x;
                currentY += cmd.y;
                pathParts.push(`C ${x1} ${y1} ${x2} ${y2} ${currentX} ${currentY}`);
              }
            } else if (cmd.type === 'Q' || cmd.type === 'q') {
              if (cmd.type === 'Q') {
                pathParts.push(`Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
                currentX = cmd.x;
                currentY = cmd.y;
              } else {
                const x1 = currentX + cmd.x1;
                const y1 = currentY + cmd.y1;
                currentX += cmd.x;
                currentY += cmd.y;
                pathParts.push(`Q ${x1} ${y1} ${currentX} ${currentY}`);
              }
            } else if (cmd.type === 'Z' || cmd.type === 'z') {
              pathParts.push('Z');
            }
          });
          
          const svgPathData = pathParts.join(' ');
          if (!svgPathData || svgPathData.trim() === '') {
            console.error('Empty SVG path data for text');
            continue;
          }
          
          makerModel = maker.importer.fromSVGPathData(svgPathData);
          
          if (!makerModel || !makerModel.paths) {
            console.error('Failed to convert text to maker model');
            continue;
          }
          
          // Get text path bounds to determine actual dimensions
          // The text path from opentype.js starts at (0,0) which is the baseline
          const textBounds = getModelBounds(makerModel);
          const textWidth = textBounds.maxX - textBounds.minX;
          const textHeight = textBounds.maxY - textBounds.minY;
          
          // Calculate the center point of the text path
          const textCenterX = textBounds.minX + textWidth / 2;
          const textCenterY = textBounds.minY + textHeight / 2;
          
          // Log original Fabric.js position for debugging
          const fabricLeft = obj.fabricObj.left || 0;
          const fabricTop = obj.fabricObj.top || 0;
          console.log(`Text "${obj.fabricObj.text}" - Fabric position: [${fabricLeft}, ${fabricTop}] (pixels)`);
          console.log(`Text "${obj.fabricObj.text}" - Decomposed translate: [${obj.decomposed.translateX}, ${obj.decomposed.translateY}] (pixels)`);
          console.log(`Text "${obj.fabricObj.text}" - Origin: [${obj.fabricObj.originX}, ${obj.fabricObj.originY}]`);
          console.log(`Text "${obj.fabricObj.text}" - Text path bounds:`, textBounds);
          console.log(`Text "${obj.fabricObj.text}" - Text path center: [${textCenterX}, ${textCenterY}]`);
          
          // Convert Fabric origin position from pixels to inches, then to Y-up coordinate system
          const originXInches = obj.decomposed.translateX / scale;
          const originYInches = obj.decomposed.translateY / scale;
          const finalX = originXInches; // X is the same in both systems
          const finalY = canvasHeightInches - originYInches; // Y-flip: Y-up = canvasHeight - Y-down
          
          console.log(`Text "${obj.fabricObj.text}" - Origin position (Y-down, inches): [${originXInches}, ${originYInches}]`);
          console.log(`Text "${obj.fabricObj.text}" - Final position (Y-up, inches): [${finalX}, ${finalY}]`);
          
          // Calculate where the origin point is relative to the text path
          // The text path from opentype.js is in Y-up coordinates
          // We need to find where the origin point (center/left/right, top/center/bottom) is in the text path
          let originPointX = 0;
          let originPointY = 0;
          
          // For X: where is the origin point relative to text bounds?
          if (obj.fabricObj.originX === 'center') {
            originPointX = textCenterX;
          } else if (obj.fabricObj.originX === 'right') {
            originPointX = textBounds.maxX;
          } else {
            originPointX = textBounds.minX;
          }
          
          // For Y: where is the origin point relative to text bounds?
          // Text path is in Y-up coordinates from opentype.js
          // Fabric's originY in Y-down needs to be mapped to Y-up
          if (obj.fabricObj.originY === 'center') {
            originPointY = textCenterY;
          } else if (obj.fabricObj.originY === 'top') {
            // Fabric 'top' in Y-down = bottom in Y-up, which is minY
            originPointY = textBounds.minY;
          } else {
            // Fabric 'bottom' (baseline) in Y-down = top in Y-up, which is maxY
            originPointY = textBounds.maxY;
          }
          
          // Calculate offset to move the origin point to the final position
          const offsetX = finalX - originPointX;
          const offsetY = finalY - originPointY;
          
          console.log(`Text "${obj.fabricObj.text}" - Origin point in text path: [${originPointX}, ${originPointY}]`);
          console.log(`Text "${obj.fabricObj.text}" - Calculated offset: [${offsetX}, ${offsetY}]`);
          
          // Apply rotation first (around current origin)
          if (obj.decomposed.angle !== 0) {
            maker.model.rotate(makerModel, -obj.decomposed.angle, [0, 0]);
          }
          
          // Wrap the text model in a parent model to ensure move operations work
          // Some Maker.js operations don't work directly on models with only paths
          const wrappedModel = { models: { text: makerModel } };
          
          // Move to final position
          maker.model.move(wrappedModel, [offsetX, offsetY]);
          
          console.log(`Text "${obj.fabricObj.text}" - Final position: [${finalX}, ${finalY}]`);
          
          // Get bounds after positioning to verify
          const boundsAfterFinal = getModelBounds(wrappedModel);
          console.log(`Text "${obj.fabricObj.text}" - Bounds after final positioning:`, boundsAfterFinal);
          
          // Mirror text vertically (opentype.js uses Y-up, but Fabric uses Y-down)
          // Mirror around the origin point which is at (finalX, finalY)
          try {
            maker.model.mirror(wrappedModel, false, true, [finalX, finalY]);
            const boundsAfterMirror = getModelBounds(wrappedModel);
            console.log(`Text "${obj.fabricObj.text}" - Bounds after mirror:`, boundsAfterMirror);
          } catch (mirrorErr) {
            console.warn('Failed to mirror text model:', mirrorErr);
          }
          
          // Get final bounds to verify position
          const finalBounds = getModelBounds(wrappedModel);
          console.log(`Text "${obj.fabricObj.text}" - Final bounds:`, finalBounds);
          
          // Add wrapped model to consolidated model
          maker.model.addModel(mainMakerModel, wrappedModel, obj.elementId);
          console.log(`Text "${obj.fabricObj.text}" positioned at [${finalX}, ${finalY}]`);
          
        } else if ((obj.type === 'image' || obj.type === 'imagebox') && obj.fabricObj) {
          // Get image source
          let imageSrc = null;
          if (obj.fabricObj.customData && obj.fabricObj.customData.originalSource) {
            imageSrc = obj.fabricObj.customData.originalSource;
          } else if (typeof obj.fabricObj.getSrc === 'function') {
            imageSrc = obj.fabricObj.getSrc();
          } else if (obj.fabricObj.src) {
            imageSrc = obj.fabricObj.src;
          }
          
          if (!imageSrc) {
            console.warn('No image source found, skipping');
            continue;
          }
          
          // Get dimensions from decomposed transform
          const widthPx = obj.fabricObj.width || 0;
          const heightPx = obj.fabricObj.height || 0;
          const widthInches = (widthPx * obj.decomposed.scaleX) / scale;
          const heightInches = (heightPx * obj.decomposed.scaleY) / scale;
          
          // Check if SVG
          if (imageSrc.endsWith('.svg') || imageSrc.startsWith('data:image/svg+xml')) {
            // Convert SVG to maker.js model (creates model at 0,0)
            makerModel = await svgToMakerModel(imageSrc, widthInches, heightInches);
            
            // Apply origin offset to compensate for Fabric's origin
            const originOffset = getMakerOriginOffset(obj.fabricObj, widthInches, heightInches);
            maker.model.move(makerModel, [originOffset.x, originOffset.y]);
            
            // Mirror vertically around center to convert from Y-down to Y-up
            // Do this BEFORE rotation so the mirror is around the model's center
            const centerX = widthInches / 2;
            const centerY = heightInches / 2;
            try {
              maker.model.mirror(makerModel, false, true, [centerX, centerY]);
            } catch (mirrorErr) {
              console.warn('Failed to mirror artwork model:', mirrorErr);
            }
            
            // Apply rotation
            if (obj.decomposed.angle !== 0) {
              maker.model.rotate(makerModel, -obj.decomposed.angle, [0, 0]);
            }
            
            // Apply Y-flip and move to final position
            const finalX = obj.decomposed.translateX / scale;
            const finalY = canvasHeightInches - (obj.decomposed.translateY / scale);
            maker.model.move(makerModel, [finalX, finalY]);
          } else {
            // Non-SVG: use convertFabricToMaker for rectangle
            makerModel = convertFabricToMaker(obj.fabricObj, obj.decomposed, canvasHeightInches, scale);
          }
          
          if (makerModel) {
            // Add to consolidated model
            maker.model.addModel(mainMakerModel, makerModel, obj.elementId);
            const finalX = obj.decomposed.translateX / scale;
            const finalY = canvasHeightInches - (obj.decomposed.translateY / scale);
            console.log(`Artwork positioned at [${finalX}, ${finalY}]`);
          } else {
            console.warn('Failed to create artwork model');
          }
        } else if (obj.fabricObj) {
          // Try to use convertFabricToMaker for other object types (rect, circle, path)
          makerModel = convertFabricToMaker(obj.fabricObj, obj.decomposed, canvasHeightInches, scale);
          
          if (makerModel) {
            // Add to consolidated model
            maker.model.addModel(mainMakerModel, makerModel, obj.elementId);
            const finalX = obj.decomposed.translateX / scale;
            const finalY = canvasHeightInches - (obj.decomposed.translateY / scale);
            console.log(`${obj.type} positioned at [${finalX}, ${finalY}]`);
          } else {
            console.warn(`Could not convert ${obj.type} object to Maker.js model`);
          }
        }
      } catch (error) {
        console.error(`Failed to export ${obj.type} object:`, error);
        // Continue with other objects
      }
    }
    
    // Step 6: Export the single, consolidated model
    console.log('Generating DXF from consolidated model with child models:', Object.keys(mainMakerModel.models || {}));
    
    try {
      // Export the single, combined model
      const dxfString = maker.exporter.toDXF(mainMakerModel);
      const filename = (productData.name || productData.id || 'design') + '-export.dxf';
      triggerDownload(filename, dxfString);
      console.log('DXF export successful');
    } catch (dxfError) {
      console.error('Error generating DXF string:', dxfError);
      throw new Error(`Failed to generate DXF: ${dxfError.message}`);
    }
  } catch (error) {
    console.error('Error exporting to DXF:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * UNIFIED DXF EXPORTER (PROTOTYPE)
 * ============================================================================
 * 
 * New approach: Capture entire canvas as unified SVG, then transform once
 * instead of transforming each object individually.
 */

/**
 * Converts a Fabric.js text object to an SVG path element
 * Uses opentype.js to convert text to paths
 * 
 * @param {fabric.Text} textObj - Fabric.js text object
 * @param {opentype.Font} font - Loaded opentype font
 * @returns {Promise<string>} - SVG path element string
 */
async function convertTextToSvgPath(textObj, font) {
  if (!font) {
    console.warn('Font not loaded, skipping text conversion');
    return null;
  }

  const text = textObj.text || '';
  const fontSizePx = textObj.fontSize || 12;
  
  // Get text path from opentype
  const path = font.getPath(text, 0, 0, fontSizePx);
  
  // Convert opentype path commands to SVG path string
  const commands = path.commands || [];
  const pathParts = [];
  let currentX = 0;
  let currentY = 0;

  commands.forEach((cmd) => {
    if (cmd.type === 'M' || cmd.type === 'm') {
      if (cmd.type === 'M') {
        currentX = cmd.x;
        currentY = cmd.y;
        pathParts.push(`M ${cmd.x} ${cmd.y}`);
      } else {
        currentX += cmd.x;
        currentY += cmd.y;
        pathParts.push(`M ${currentX} ${currentY}`);
      }
    } else if (cmd.type === 'L' || cmd.type === 'l') {
      if (cmd.type === 'L') {
        currentX = cmd.x;
        currentY = cmd.y;
        pathParts.push(`L ${cmd.x} ${cmd.y}`);
      } else {
        currentX += cmd.x;
        currentY += cmd.y;
        pathParts.push(`L ${currentX} ${currentY}`);
      }
    } else if (cmd.type === 'C' || cmd.type === 'c') {
      if (cmd.type === 'C') {
        pathParts.push(`C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
        currentX = cmd.x;
        currentY = cmd.y;
      } else {
        const x1 = currentX + cmd.x1;
        const y1 = currentY + cmd.y1;
        const x2 = currentX + cmd.x2;
        const y2 = currentY + cmd.y2;
        currentX += cmd.x;
        currentY += cmd.y;
        pathParts.push(`C ${x1} ${y1} ${x2} ${y2} ${currentX} ${currentY}`);
      }
    } else if (cmd.type === 'Q' || cmd.type === 'q') {
      if (cmd.type === 'Q') {
        pathParts.push(`Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
        currentX = cmd.x;
        currentY = cmd.y;
      } else {
        const x1 = currentX + cmd.x1;
        const y1 = currentY + cmd.y1;
        currentX += cmd.x;
        currentY += cmd.y;
        pathParts.push(`Q ${x1} ${y1} ${currentX} ${currentY}`);
      }
    } else if (cmd.type === 'Z' || cmd.type === 'z') {
      pathParts.push('Z');
    }
  });

  const pathData = pathParts.join(' ');
  
  // Get text object properties
  const left = textObj.left || 0;
  const top = textObj.top || 0;
  const angle = textObj.angle || 0;
  const scaleX = textObj.scaleX || 1;
  const scaleY = textObj.scaleY || 1;
  const fill = textObj.fill || '#000000';
  const stroke = textObj.stroke || null;
  const strokeWidth = textObj.strokeWidth || 0;
  
  // Build transform string (SVG transforms are applied right-to-left)
  // Order: translate → scale → rotate
  const transforms = [];
  transforms.push(`translate(${left} ${top})`);
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX} ${scaleY})`);
  }
  if (angle !== 0) {
    transforms.push(`rotate(${angle})`);
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  
  // Build SVG path element
  let pathElement = `<path d="${pathData}" fill="${fill}"`;
  if (stroke) {
    pathElement += ` stroke="${stroke}" stroke-width="${strokeWidth}"`;
  }
  pathElement += `${transformAttr} />`;
  
  return pathElement;
}

/**
 * Converts Fabric Canvas to SVG, handling text objects specially
 * 
 * @param {fabric.Canvas} fabricCanvas - Fabric.js canvas instance
 * @returns {Promise<string>} - SVG string
 */
async function captureFabricCanvasAsSvg(fabricCanvas) {
  console.log('Capturing Fabric Canvas as SVG...');
  
  // Get all objects, filter to only visible (current view)
  const allObjects = fabricCanvas.getObjects();
  const objects = allObjects.filter(obj => obj.visible !== false);
  console.log(`Found ${allObjects.length} objects on Fabric Canvas (${objects.length} visible)`);
  
  // Separate text objects from others
  const textObjects = objects.filter(obj => obj.type === 'text' || obj.type === 'i-text');
  const otherObjects = objects.filter(obj => obj.type !== 'text' && obj.type !== 'i-text');
  
  console.log(`Text objects: ${textObjects.length}, Other objects: ${otherObjects.length}`);
  
  // Load fonts for text objects
  const uniqueFonts = [...new Set(textObjects.map(obj => obj.fontFamily || 'Arial'))];
  await Promise.all(uniqueFonts.map(getFont));
  
  // Convert text objects to SVG paths
  const textPaths = [];
  for (const textObj of textObjects) {
    const fontFamily = textObj.fontFamily || 'Arial';
    const font = fontCache.get(fontFamily);
    
    if (font) {
      const pathSvg = await convertTextToSvgPath(textObj, font);
      if (pathSvg) {
        textPaths.push(pathSvg);
      }
    } else {
      console.warn(`Font not loaded for ${fontFamily}, skipping text object`);
    }
  }
  
  // Export other objects to SVG (this handles groups, paths, images, etc.)
  let fabricSvg;
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  
  if (otherObjects.length > 0) {
    // Create a temporary canvas with only non-text objects
    const tempCanvas = new fabric.Canvas(null, {
      width: fabricCanvas.width,
      height: fabricCanvas.height
    });
    
    // Clone non-text objects to temp canvas
    otherObjects.forEach(obj => {
      try {
        const cloned = obj.clone();
        tempCanvas.add(cloned);
      } catch (err) {
        console.warn('Failed to clone object for SVG export:', err);
      }
    });
    
    // Export temp canvas to SVG
    fabricSvg = tempCanvas.toSVG({
      width: fabricCanvas.width,
      height: fabricCanvas.height,
      viewBox: {
        x: 0,
        y: 0,
        width: fabricCanvas.width,
        height: fabricCanvas.height
      }
    });
  } else {
    // No non-text objects, create empty SVG
    fabricSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fabricCanvas.width}" height="${fabricCanvas.height}" viewBox="0 0 ${fabricCanvas.width} ${fabricCanvas.height}"></svg>`;
  }
  
  // Parse SVG and inject text paths
  const svgDoc = parser.parseFromString(fabricSvg, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  
  // Create a group for text paths
  if (textPaths.length > 0) {
    const textGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('id', 'text-paths');
    
    textPaths.forEach(pathSvg => {
      try {
        const pathDoc = parser.parseFromString(`<g>${pathSvg}</g>`, 'image/svg+xml');
        const pathElement = pathDoc.documentElement.firstChild;
        if (pathElement && pathElement.nodeName === 'path') {
          textGroup.appendChild(pathElement.cloneNode(true));
        }
      } catch (err) {
        console.warn('Failed to parse text path SVG:', err);
      }
    });
    
    if (textGroup.childNodes.length > 0) {
      svgElement.appendChild(textGroup);
    }
  }
  
  // Serialize back to string
  fabricSvg = serializer.serializeToString(svgElement);
  
  console.log('Fabric Canvas captured as SVG');
  return fabricSvg;
}

/**
 * Captures Product Canvas as SVG using source SVGs directly
 * 
 * @param {Object} productData - Product data with template/overlay URLs
 * @param {number} canvasWidthPx - Canvas width in pixels
 * @param {number} canvasHeightPx - Canvas height in pixels
 * @returns {Promise<string>} - SVG string
 */
async function captureProductCanvasAsSvg(productData, canvasWidthPx, canvasHeightPx) {
  console.log('Capturing Product Canvas as SVG...');
  
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  
  // Create root SVG element using DOMParser
  const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidthPx}" height="${canvasHeightPx}" viewBox="0 0 ${canvasWidthPx} ${canvasHeightPx}"></svg>`;
  const svgDoc = parser.parseFromString(svgTemplate, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  
  // Calculate dimensions in pixels
  const canvasWidthInches = (productData.canvas && productData.canvas.width) 
    ? productData.canvas.width 
    : (productData.realWorldWidth || 24);
  const canvasHeightInches = (productData.canvas && productData.canvas.height) 
    ? productData.canvas.height 
    : (productData.realWorldHeight || 18);
  
  // Calculate scale for converting inches to pixels
  const scaleX = canvasWidthPx / canvasWidthInches;
  const scaleY = canvasHeightPx / canvasHeightInches;
  
  // Add template SVG (if available)
  if (productData.imageUrl) {
    try {
      const templateResponse = await fetch(productData.imageUrl);
      const templateSvgText = await templateResponse.text();
      const templateDoc = parser.parseFromString(templateSvgText, 'image/svg+xml');
      const templateSvg = templateDoc.documentElement;
      
      // Create group for template
      const templateGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
      templateGroup.setAttribute('id', 'template');
      
      // Scale and position template
      templateGroup.setAttribute('transform', `translate(0, 0) scale(${scaleX} ${scaleY})`);
      
      // Clone paths from template SVG
      const templatePaths = templateSvg.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');
      templatePaths.forEach(path => {
        const clonedPath = path.cloneNode(true);
        templateGroup.appendChild(clonedPath);
      });
      
      svgElement.appendChild(templateGroup);
      console.log('Template SVG added');
    } catch (err) {
      console.warn('Failed to load template SVG:', err);
    }
  }
  
  // Add overlay SVG (if available)
  if (productData.overlayUrl) {
    try {
      const overlayResponse = await fetch(productData.overlayUrl);
      const overlaySvgText = await overlayResponse.text();
      const overlayDoc = parser.parseFromString(overlaySvgText, 'image/svg+xml');
      const overlaySvg = overlayDoc.documentElement;
      
      // Create group for overlay
      const overlayGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlayGroup.setAttribute('id', 'overlay');
      overlayGroup.setAttribute('opacity', '0.5');
      
      // Scale and position overlay (same as template)
      overlayGroup.setAttribute('transform', `translate(0, 0) scale(${scaleX} ${scaleY})`);
      
      // Clone paths from overlay SVG
      const overlayPaths = overlaySvg.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');
      overlayPaths.forEach(path => {
        const clonedPath = path.cloneNode(true);
        overlayGroup.appendChild(clonedPath);
      });
      
      svgElement.appendChild(overlayGroup);
      console.log('Overlay SVG added');
    } catch (err) {
      console.warn('Failed to load overlay SVG:', err);
    }
  }
  
  // Add productBase rectangles (if available)
  if (productData.productBase && Array.isArray(productData.productBase)) {
    const baseGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    baseGroup.setAttribute('id', 'product-base');
    
    productData.productBase.forEach((base, index) => {
      if (base.x !== undefined && base.y !== undefined && base.width && base.height) {
        const rect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', (base.x * scaleX).toString());
        rect.setAttribute('y', (base.y * scaleY).toString());
        rect.setAttribute('width', (base.width * scaleX).toString());
        rect.setAttribute('height', (base.height * scaleY).toString());
        rect.setAttribute('fill', '#cccccc'); // Default fill
        rect.setAttribute('id', base.id || `base-${index}`);
        baseGroup.appendChild(rect);
      }
    });
    
    if (baseGroup.childNodes.length > 0) {
      svgElement.appendChild(baseGroup);
      console.log(`ProductBase rectangles added: ${baseGroup.childNodes.length}`);
    }
  }
  
  const productSvg = serializer.serializeToString(svgElement);
  console.log('Product Canvas captured as SVG');
  return productSvg;
}

/**
 * Combines Fabric SVG and Product SVG into unified SVG
 * 
 * @param {string} fabricSvg - Fabric Canvas SVG
 * @param {string} productSvg - Product Canvas SVG
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @returns {string} - Unified SVG string
 */
function combineSvgs(fabricSvg, productSvg, width, height) {
  console.log('Combining SVGs into unified document...');
  
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  
  // Create root SVG using DOMParser
  const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
  const svgDoc = parser.parseFromString(svgTemplate, 'image/svg+xml');
  const rootSvg = svgDoc.documentElement;
  
  // Parse product SVG (background layer)
  const productDoc = parser.parseFromString(productSvg, 'image/svg+xml');
  const productSvgElement = productDoc.documentElement;
  
  // Create background group
  const bgGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
  bgGroup.setAttribute('id', 'background');
  
  // Clone all children from product SVG
  Array.from(productSvgElement.childNodes).forEach(child => {
    if (child.nodeType === 1) { // ELEMENT_NODE = 1
      const cloned = child.cloneNode(true);
      bgGroup.appendChild(cloned);
    }
  });
  
  rootSvg.appendChild(bgGroup);
  
  // Parse fabric SVG (foreground layer)
  const fabricDoc = parser.parseFromString(fabricSvg, 'image/svg+xml');
  const fabricSvgElement = fabricDoc.documentElement;
  
  // Create foreground group
  const fgGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
  fgGroup.setAttribute('id', 'foreground');
  
  // Clone all children from fabric SVG
  Array.from(fabricSvgElement.childNodes).forEach(child => {
    if (child.nodeType === 1) { // ELEMENT_NODE = 1
      const cloned = child.cloneNode(true);
      fgGroup.appendChild(cloned);
    }
  });
  
  rootSvg.appendChild(fgGroup);
  
  const unifiedSvg = serializer.serializeToString(rootSvg);
  console.log('SVGs combined into unified document');
  return unifiedSvg;
}

/**
 * Transforms unified SVG from pixel coordinates to real-world inches
 * Applies scale and Y-flip transformation
 * 
 * @param {string} unifiedSvg - Unified SVG string
 * @param {Object} options - Transformation options
 * @param {number} options.canvasWidthPx - Canvas width in pixels
 * @param {number} options.canvasHeightPx - Canvas height in pixels
 * @param {number} options.realWorldWidthInches - Real-world width in inches
 * @param {number} options.realWorldHeightInches - Real-world height in inches
 * @returns {string} - Transformed SVG string
 */
function transformSvgToRealWorld(unifiedSvg, options) {
  const {
    canvasWidthPx,
    canvasHeightPx,
    realWorldWidthInches,
    realWorldHeightInches
  } = options;
  
  console.log('Transforming SVG to real-world coordinates...');
  console.log(`Canvas: ${canvasWidthPx}px × ${canvasHeightPx}px`);
  console.log(`Real-world: ${realWorldWidthInches}" × ${realWorldHeightInches}"`);
  
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  
  const svgDoc = parser.parseFromString(unifiedSvg, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  
  // Calculate scale factors
  const scaleX = realWorldWidthInches / canvasWidthPx;
  const scaleY = realWorldHeightInches / canvasHeightPx;
  
  console.log(`Scale factors: X=${scaleX}, Y=${scaleY}`);
  
  // Apply transformation: scale + Y-flip
  // Y-flip: scale(1, -1) then translate(0, -height)
  // Combined: scale(scaleX, -scaleY) translate(0, -realWorldHeightInches)
  const transform = `scale(${scaleX} ${-scaleY}) translate(0 ${-realWorldHeightInches})`;
  
  // Wrap everything in a group with the transformation
  const transformGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
  transformGroup.setAttribute('transform', transform);
  
  // Move all children to the transform group
  Array.from(svgElement.childNodes).forEach(child => {
    if (child.nodeType === 1) { // ELEMENT_NODE = 1
      transformGroup.appendChild(child);
    }
  });
  
  // Clear and update SVG element
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }
  
  // Update SVG dimensions to real-world
  svgElement.setAttribute('width', realWorldWidthInches.toString());
  svgElement.setAttribute('height', realWorldHeightInches.toString());
  svgElement.setAttribute('viewBox', `0 0 ${realWorldWidthInches} ${realWorldHeightInches}`);
  
  svgElement.appendChild(transformGroup);
  
  const transformedSvg = serializer.serializeToString(svgElement);
  console.log('SVG transformed to real-world coordinates');
  return transformedSvg;
}

/**
 * Converts SVG string to Maker.js model
 * 
 * @param {string} svgString - SVG string
 * @returns {Promise<Object>} - Maker.js model
 */
async function svgStringToMakerModel(svgString) {
  console.log('Converting SVG to Maker.js model...');
  
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  
  const makerModel = { paths: {}, models: {} };
  let modelIndex = 0;
  
  // Extract all paths
  const paths = svgElement.querySelectorAll('path');
  paths.forEach((path) => {
    const pathData = path.getAttribute('d');
    if (pathData) {
      try {
        const pathModel = maker.importer.fromSVGPathData(pathData);
        if (pathModel && pathModel.paths) {
          // Apply transform if present
          const transform = path.getAttribute('transform');
          if (transform) {
            // Parse transform (simplified - handles translate, scale, rotate)
            // For now, just add the path - transforms are already applied in SVG
            makerModel.models[`path-${modelIndex++}`] = pathModel;
          } else {
            makerModel.models[`path-${modelIndex++}`] = pathModel;
          }
        }
      } catch (err) {
        console.warn(`Failed to convert path ${modelIndex}:`, err);
      }
    }
  });
  
  // Extract rectangles
  const rects = svgElement.querySelectorAll('rect');
  rects.forEach((rect) => {
    try {
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const y = parseFloat(rect.getAttribute('y')) || 0;
      const w = parseFloat(rect.getAttribute('width')) || 0;
      const h = parseFloat(rect.getAttribute('height')) || 0;
      if (w > 0 && h > 0) {
        const rectModel = new maker.models.Rectangle(w, h);
        maker.model.move(rectModel, [x, y]);
        makerModel.models[`rect-${modelIndex++}`] = rectModel;
      }
    } catch (err) {
      console.warn(`Failed to convert rect ${modelIndex}:`, err);
    }
  });
  
  // Extract circles
  const circles = svgElement.querySelectorAll('circle');
  circles.forEach((circle) => {
    try {
      const cx = parseFloat(circle.getAttribute('cx')) || 0;
      const cy = parseFloat(circle.getAttribute('cy')) || 0;
      const r = parseFloat(circle.getAttribute('r')) || 0;
      if (r > 0) {
        const circleModel = new maker.models.Circle([cx, cy], r);
        makerModel.models[`circle-${modelIndex++}`] = circleModel;
      }
    } catch (err) {
      console.warn(`Failed to convert circle ${modelIndex}:`, err);
    }
  });
  
  console.log(`Maker.js model created with ${Object.keys(makerModel.models).length} sub-models`);
  return makerModel;
}

/**
 * Unified DXF Export Function (PROTOTYPE)
 * 
 * Captures entire canvas as unified SVG, then transforms once to real-world coordinates
 * 
 * @param {Object} params - Export parameters
 * @param {fabric.Canvas} params.fabricCanvas - Fabric.js canvas instance
 * @param {HTMLCanvasElement} params.productCanvas - Product canvas element (optional, for reference)
 * @param {Object} params.productData - Product data with dimensions and template info
 * @param {Object} params.unitConverter - Unit converter utility
 * @returns {Promise<void>}
 */
export async function exportToDxfUnified({ fabricCanvas, productCanvas, productData, unitConverter }) {
  try {
    console.log('=== UNIFIED DXF EXPORT (PROTOTYPE) ===');
    console.log('Starting unified export...');
    
    // Step 1: Calculate dimensions and scale
    const scale = unitConverter.calculateScale(
      productData.realWorldWidth,
      fabricCanvas.width
    );
    
    const canvasWidthPx = fabricCanvas.width;
    const canvasHeightPx = fabricCanvas.height;
    
    const canvasWidthInches = (productData.canvas && productData.canvas.width) 
      ? productData.canvas.width 
      : (productData.realWorldWidth || 24);
    const canvasHeightInches = (productData.canvas && productData.canvas.height) 
      ? productData.canvas.height 
      : (productData.realWorldHeight || 18);
    
    console.log(`Canvas: ${canvasWidthPx}px × ${canvasHeightPx}px`);
    console.log(`Real-world: ${canvasWidthInches}" × ${canvasHeightInches}"`);
    console.log(`Scale: ${scale} pixels/inch`);
    
    // Step 2: Capture Fabric Canvas as SVG
    const fabricSvg = await captureFabricCanvasAsSvg(fabricCanvas);
    
    // Step 3: Capture Product Canvas as SVG
    const productSvg = await captureProductCanvasAsSvg(
      productData,
      canvasWidthPx,
      canvasHeightPx
    );
    
    // Step 4: Combine SVGs into unified document
    const unifiedSvg = combineSvgs(fabricSvg, productSvg, canvasWidthPx, canvasHeightPx);
    
    // Step 5: Transform unified SVG to real-world coordinates
    const transformedSvg = transformSvgToRealWorld(unifiedSvg, {
      canvasWidthPx,
      canvasHeightPx,
      realWorldWidthInches: canvasWidthInches,
      realWorldHeightInches: canvasHeightInches
    });
    
    // Step 6: Convert transformed SVG to Maker.js model
    const makerModel = await svgStringToMakerModel(transformedSvg);
    
    // Step 7: Export Maker.js model to DXF
    console.log('Exporting Maker.js model to DXF...');
    const dxfString = maker.exporter.toDXF(makerModel);
    
    // Step 8: Download DXF file
    const filename = (productData.name || productData.id || 'design') + '-unified-export.dxf';
    triggerDownload(filename, dxfString);
    
    console.log('=== UNIFIED DXF EXPORT COMPLETE ===');
    console.log(`DXF file downloaded: ${filename}`);
    
  } catch (error) {
    console.error('Error in unified DXF export:', error);
    throw error;
  }
}

export default exportToDxf;
