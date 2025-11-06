/**
 * DXF Exporter Utility
 * 
 * Converts Fabric.js canvas state into high-precision, real-world-scale DXF files
 * for CNC manufacturing. Handles fonts, coordinate transformations, and vector paths.
 */

import opentype from 'opentype.js';
import * as maker from 'makerjs';

// Module-level cache to store loaded fonts
const fontCache = new Map();

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
    
    // Get SVG viewBox or dimensions
    const viewBox = svgElement.getAttribute('viewBox');
    let svgWidth = parseFloat(svgElement.getAttribute('width')) || widthInches;
    let svgHeight = parseFloat(svgElement.getAttribute('height')) || heightInches;
    
    if (viewBox) {
      const viewBoxValues = viewBox.split(/\s+|,/);
      svgWidth = parseFloat(viewBoxValues[2]) || svgWidth;
      svgHeight = parseFloat(viewBoxValues[3]) || svgHeight;
    }
    
    // Calculate scale factor to convert SVG units to inches
    const scaleX = widthInches / svgWidth;
    const scaleY = heightInches / svgHeight;
    
    // Extract all path elements and other shape elements
    const paths = svgElement.querySelectorAll('path');
    const models = {};
    let modelIndex = 0;
    
    // Convert path elements
    paths.forEach((path) => {
      const pathData = path.getAttribute('d');
      if (pathData) {
        try {
          // Convert SVG path to maker.js model
          const pathModel = maker.importer.fromSVGPathData(pathData);
          if (pathModel && pathModel.paths) {
            // Scale the path to match desired dimensions
            maker.model.scale(pathModel, scaleX, scaleY);
            models[`path-${modelIndex++}`] = pathModel;
          }
        } catch (err) {
          console.warn(`Failed to convert SVG path ${modelIndex}:`, err);
        }
      }
    });
    
    // Convert rectangle elements
    const rects = svgElement.querySelectorAll('rect');
    rects.forEach((rect) => {
      try {
        const x = (parseFloat(rect.getAttribute('x')) || 0) * scaleX;
        const y = (parseFloat(rect.getAttribute('y')) || 0) * scaleY;
        const w = (parseFloat(rect.getAttribute('width')) || 0) * scaleX;
        const h = (parseFloat(rect.getAttribute('height')) || 0) * scaleY;
        if (w > 0 && h > 0) {
          const rectModel = new maker.models.Rectangle(w, h);
          maker.model.move(rectModel, [x, y]);
          models[`rect-${modelIndex++}`] = rectModel;
        }
      } catch (err) {
        console.warn(`Failed to convert SVG rect ${modelIndex}:`, err);
      }
    });
    
    // Convert circle elements to SVG path data (more reliable)
    const circles = svgElement.querySelectorAll('circle');
    circles.forEach((circle) => {
      try {
        const cx = (parseFloat(circle.getAttribute('cx')) || 0) * scaleX;
        const cy = (parseFloat(circle.getAttribute('cy')) || 0) * scaleY;
        const r = (parseFloat(circle.getAttribute('r')) || 0) * Math.min(scaleX, scaleY);
        if (r > 0) {
          // Convert circle to SVG path data and import it
          // Circle path: M cx-r,cy A r,r 0 1,1 cx+r,cy A r,r 0 1,1 cx-r,cy
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
    
    // Convert ellipse elements to SVG path data
    const ellipses = svgElement.querySelectorAll('ellipse');
    ellipses.forEach((ellipse) => {
      try {
        const cx = (parseFloat(ellipse.getAttribute('cx')) || 0) * scaleX;
        const cy = (parseFloat(ellipse.getAttribute('cy')) || 0) * scaleY;
        const rx = (parseFloat(ellipse.getAttribute('rx')) || 0) * scaleX;
        const ry = (parseFloat(ellipse.getAttribute('ry')) || 0) * scaleY;
        if (rx > 0 && ry > 0) {
          // Convert ellipse to SVG path data
          // Ellipse path: M cx-rx,cy A rx,ry 0 1,1 cx+rx,cy A rx,ry 0 1,1 cx-rx,cy
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
        const x1 = (parseFloat(line.getAttribute('x1')) || 0) * scaleX;
        const y1 = (parseFloat(line.getAttribute('y1')) || 0) * scaleY;
        const x2 = (parseFloat(line.getAttribute('x2')) || 0) * scaleX;
        const y2 = (parseFloat(line.getAttribute('y2')) || 0) * scaleY;
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
    // If we have nested models, we need to return them in a way that maker.js can handle
    // Maker.js expects either a model with paths, or a model with nested models
    let combinedModel;
    
    if (Object.keys(models).length === 1) {
      // Single model - return it directly
      combinedModel = Object.values(models)[0];
    } else {
      // Multiple models - combine them
      combinedModel = { models };
    }
    
    // Note: SVG uses top-left origin, but we'll handle coordinate conversion
    // during positioning. The paths are extracted in SVG coordinate space,
    // scaled to match desired dimensions, and then positioned in DXF space.
    
    return combinedModel;
  } catch (error) {
    console.warn(`Failed to convert SVG to maker model: ${svgUrl}`, error);
    // Return a rectangle as fallback
    return new maker.models.Rectangle(widthInches, heightInches);
  }
}

/**
 * Asynchronously loads a font from the /public/fonts/ directory and caches it
 * 
 * @param {string} fontFamily - The font family name
 * @returns {Promise<opentype.Font>} - The loaded font
 */
async function getFont(fontFamily) {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily);
  }

  // Map font family names to actual filenames
  const fontMap = {
    'Arial': 'Arial.ttf',
    'Times New Roman': 'TimesNewRoman.ttf',
    'Helvetica': 'Helvetica.ttf',
    'Georgia': 'Georgia.ttf',
    'Courier New': 'CourierNew.ttf',
    'Verdana': 'Verdana.ttf'
  };

  const fontFilename = fontMap[fontFamily] || `${fontFamily}.ttf`;
  const fontUrl = `/fonts/${fontFilename}`;

  try {
    const font = await opentype.load(fontUrl);
    fontCache.set(fontFamily, font);
    return font;
  } catch (err) {
    console.error(`Failed to load font: ${fontUrl}`, err);
    // Return null for missing fonts - caller will handle gracefully
    fontCache.set(fontFamily, null);
    return null;
  }
}

/**
 * Helper function to trigger a browser download
 * 
 * @param {string} filename - Name of the file to download
 * @param {string} data - File contents as string
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
 * Export Fabric.js canvas to DXF format
 * 
 * @param {Object} params - Export parameters
 * @param {fabric.Canvas} params.fabricCanvas - The Fabric.js canvas instance
 * @param {Object} params.productData - Product/template data with real-world dimensions
 * @param {Object} params.unitConverter - Unit converter utilities
 * @returns {Promise<void>}
 */
export async function exportToDxf({ fabricCanvas, productData, unitConverter }) {
  try {
    console.log('Starting DXF export...', { productData, fabricCanvas });
    
    // 1. Initialize the DXF Document (plain object with models property)
    const dxfDocument = { models: {} };

    // 2. Get Canvas Objects & Scale
    const objects = fabricCanvas.getObjects();
    console.log(`Found ${objects.length} canvas objects`);
    
    const scale = unitConverter.calculateScale(
      productData.realWorldWidth,
      fabricCanvas.width
    );
    console.log('Scale calculated:', scale);

    // Get canvas dimensions for coordinate conversion
    const canvasHeightInches = (productData.canvas && productData.canvas.height) 
      ? productData.canvas.height 
      : (productData.realWorldHeight || 18);

    // 3. Export Product Template SVG
    if (productData.imageUrl) {
      try {
        console.log('Exporting template SVG:', productData.imageUrl);
        const templateWidthInches = productData.realWorldWidth || 24;
        const templateHeightInches = productData.realWorldHeight || 18;
        const templateModel = await svgToMakerModel(
          productData.imageUrl,
          templateWidthInches,
          templateHeightInches
        );
        
        if (templateModel) {
          // Position template at bottom-left in DXF coordinates
          // SVG uses top-left origin, so we need to flip Y and position at bottom
          // First, flip the model vertically around its center
          try {
            maker.model.mirror(templateModel, false, true, [templateWidthInches / 2, templateHeightInches / 2]);
          } catch (mirrorErr) {
            console.warn('Failed to mirror template model, continuing without mirror:', mirrorErr);
          }
          // Then position at bottom-left (Y=0 for bottom edge)
          maker.model.move(templateModel, [0, 0]);
          
          dxfDocument.models['template'] = templateModel;
          console.log('Template SVG exported successfully');
        }
      } catch (error) {
        console.error('Failed to export template SVG:', error);
        // Don't throw - continue with other elements
      }
    }

    // 4. Export Overlay SVG (if present)
    if (productData.overlayUrl) {
      try {
        console.log('Exporting overlay SVG:', productData.overlayUrl);
        const templateWidthInches = productData.realWorldWidth || 24;
        const templateHeightInches = productData.realWorldHeight || 18;
        const overlayModel = await svgToMakerModel(
          productData.overlayUrl,
          templateWidthInches,
          templateHeightInches
        );
        
        if (overlayModel) {
          // Position overlay at same position as template
          // Flip vertically and position at bottom-left
          try {
            maker.model.mirror(overlayModel, false, true, [templateWidthInches / 2, templateHeightInches / 2]);
          } catch (mirrorErr) {
            console.warn('Failed to mirror overlay model, continuing without mirror:', mirrorErr);
          }
          maker.model.move(overlayModel, [0, 0]);
          
          dxfDocument.models['overlay'] = overlayModel;
          console.log('Overlay SVG exported successfully');
        }
      } catch (error) {
        console.error('Failed to export overlay SVG:', error);
        // Don't throw - continue with other elements
      }
    }

    // 5. Export ProductBase Rectangles
    if (productData.productBase && Array.isArray(productData.productBase)) {
      productData.productBase.forEach((base, index) => {
        if (base.x !== undefined && base.y !== undefined && base.width && base.height) {
          const baseModel = new maker.models.Rectangle(base.width, base.height);
          
          // Convert position: productBase uses top-left origin, DXF uses bottom-left
          const dxf_X = base.x;
          const dxf_Y = canvasHeightInches - base.y - base.height;
          
          maker.model.move(baseModel, [dxf_X, dxf_Y]);
          dxfDocument.models[`productBase-${base.id || index}`] = baseModel;
        }
      });
    }

    // 6. Load All Required Fonts
    const uniqueFonts = [
      ...new Set(
        objects
          .filter(obj => obj.type === 'text')
          .map(obj => obj.fontFamily || 'Arial')
      )
    ];

    await Promise.all(uniqueFonts.map(getFont));

    // 7. Iterate and Convert Each Canvas Object
    for (const obj of objects) {
      let makerModel = null;
      let imageSrc = null;

      // Object Type Conversion
      if (obj.type === 'text') {
        const fontFamily = obj.fontFamily || 'Arial';
        const font = fontCache.get(fontFamily);

        // Skip if font failed to load
        if (!font) {
          console.warn(`Font not loaded: ${fontFamily}`);
          continue;
        }

        // Convert font size from pixels to inches
        const fontSizeInches = unitConverter.pixelsToInches(obj.fontSize || 12, scale);

        // Get the path from opentype
        const openTypePath = font.getPath(obj.text || 'Text', 0, 0, fontSizeInches);

        // Convert opentype path to maker.js model
        makerModel = maker.importer.fromOpentypePath(openTypePath);
      } else if (obj.type === 'image' || obj.type === 'imagebox') {
        // Get image source URL
        // Try to get original source from customData (for artwork)
        if (obj.customData && obj.customData.originalSource) {
          imageSrc = obj.customData.originalSource;
        } else if (obj.getSrc) {
          imageSrc = obj.getSrc();
        } else if (obj.src) {
          imageSrc = obj.src;
        }
        
        const widthInches = unitConverter.pixelsToInches(obj.width * (obj.scaleX || 1), scale);
        const heightInches = unitConverter.pixelsToInches(obj.height * (obj.scaleY || 1), scale);
        
        // Check if it's an SVG file
        if (imageSrc && (imageSrc.endsWith('.svg') || imageSrc.startsWith('data:image/svg+xml'))) {
          try {
            // Convert SVG to actual paths
            makerModel = await svgToMakerModel(imageSrc, widthInches, heightInches);
            // Flip Y coordinates for SVG (top-left to bottom-left origin conversion)
            if (makerModel) {
              try {
                maker.model.mirror(makerModel, false, true, [widthInches / 2, heightInches / 2]);
              } catch (mirrorErr) {
                console.warn('Failed to mirror artwork SVG model, continuing without mirror:', mirrorErr);
              }
            }
          } catch (error) {
            console.warn('Failed to convert SVG artwork to paths, using rectangle:', error);
            // Fallback to rectangle
            makerModel = new maker.models.Rectangle(widthInches, heightInches);
          }
        } else {
          // For non-SVG images, create a rectangle placeholder
          makerModel = new maker.models.Rectangle(widthInches, heightInches);
        }
      }

      // Skip if makerModel is null (unsupported type)
      if (!makerModel) {
        continue;
      }

      // 8. Transformation & Coordinate System Conversion

      // a. Apply Scale (if not already applied)
      // For SVG models, scale is already applied in svgToMakerModel
      // For text, we need to apply scale
      if (obj.type === 'text' && (obj.scaleX !== 1 || obj.scaleY !== 1)) {
        maker.model.scale(makerModel, obj.scaleX || 1, obj.scaleY || 1);
      }
      // For images, scale is already baked into width/height calculation

      // b. Apply Rotation (note: negative for coordinate system conversion)
      const angle = obj.angle || 0;
      if (angle !== 0) {
        maker.model.rotate(makerModel, -angle, [0, 0]);
      }

      // c. Apply Position with Coordinate System Flip
      const leftInches = unitConverter.pixelsToInches(obj.left, scale);
      const topInches = unitConverter.pixelsToInches(obj.top, scale);

      // Calculate object dimensions for origin adjustment
      let objWidthInches, objHeightInches;
      
      if (obj.type === 'text') {
        // For text, estimate dimensions from font size and text length
        const fontSizeInches = unitConverter.pixelsToInches(obj.fontSize || 12, scale);
        const textLength = (obj.text || '').length;
        // Rough estimate: average character width is about 0.6 * font size
        objWidthInches = fontSizeInches * textLength * 0.6;
        objHeightInches = fontSizeInches;
      } else if (obj.type === 'image' || obj.type === 'imagebox') {
        objWidthInches = unitConverter.pixelsToInches(obj.width * (obj.scaleX || 1), scale);
        objHeightInches = unitConverter.pixelsToInches(obj.height * (obj.scaleY || 1), scale);
      } else {
        // Fallback for unknown types
        objWidthInches = unitConverter.pixelsToInches(obj.width || 0, scale);
        objHeightInches = unitConverter.pixelsToInches(obj.height || 0, scale);
      }

      // Account for object origin
      const originX = obj.originX || 'left';
      const originY = obj.originY || 'top';
      
      let adjustedLeft = leftInches;
      let adjustedTop = topInches;
      
      if (originX === 'center') {
        adjustedLeft = leftInches - (objWidthInches / 2);
      }
      
      if (originY === 'center') {
        adjustedTop = topInches - (objHeightInches / 2);
      }

      // Convert from Fabric's top-left (pixels) to DXF's bottom-left (inches)
      const dxf_X = adjustedLeft;
      const dxf_Y = canvasHeightInches - adjustedTop - objHeightInches;

      // Move the model to its final position
      maker.model.move(makerModel, [dxf_X, dxf_Y]);

      // d. Add to Document
      const modelName = obj.elementId || obj.id || `element-${objects.indexOf(obj)}`;
      dxfDocument.models[modelName] = makerModel;
    }

    // 9. Generate and Download the File
    console.log('Generating DXF string from document with models:', Object.keys(dxfDocument.models));
    
    try {
      const dxfString = maker.exporter.toDXF(dxfDocument);
      const filename = (productData.name || productData.id || 'design') + '-export.dxf';
      
      triggerDownload(filename, dxfString);

      console.log('DXF export successful');
    } catch (dxfError) {
      console.error('Error generating DXF string:', dxfError);
      console.error('DXF Document structure:', JSON.stringify(dxfDocument, null, 2));
      throw new Error(`Failed to generate DXF: ${dxfError.message}`);
    }
  } catch (error) {
    console.error('Error exporting to DXF:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

export default exportToDxf;
