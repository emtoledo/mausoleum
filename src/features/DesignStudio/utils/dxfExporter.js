/**
 * DXF Exporter Utility
 * 
 * Converts Fabric.js canvas state into high-precision, real-world-scale DXF files
 * for CNC manufacturing. Handles fonts, coordinate transformations, and vector paths.
 */

import opentype from 'opentype.js';
import maker from 'makerjs';

// Module-level cache to store loaded fonts
const fontCache = new Map();

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
    // 1. Initialize the DXF Document
    const dxfDocument = new maker.Document({ units: maker.unitType.Inches });

    // 2. Get Canvas Objects & Scale
    const objects = fabricCanvas.getObjects();
    const scale = unitConverter.calculateScale(
      productData.realWorldWidth,
      fabricCanvas.width
    );

    // 3. Load All Required Fonts
    const uniqueFonts = [
      ...new Set(
        objects
          .filter(obj => obj.type === 'text')
          .map(obj => obj.fontFamily || 'Arial')
      )
    ];

    await Promise.all(uniqueFonts.map(getFont));

    // 4. Iterate and Convert Each Object
    for (const obj of objects) {
      let makerModel = null;

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
        // For images, export a placement rectangle
        const widthInches = unitConverter.pixelsToInches(obj.width * (obj.scaleX || 1), scale);
        const heightInches = unitConverter.pixelsToInches(obj.height * (obj.scaleY || 1), scale);

        // Create a rectangle placeholder
        makerModel = new maker.models.Rectangle(widthInches, heightInches);
      }

      // Skip if makerModel is null (unsupported type)
      if (!makerModel) {
        continue;
      }

      // 5. Transformation & Coordinate System Conversion

      // a. Apply Scale (if not already applied)
      if (obj.scaleX !== 1 || obj.scaleY !== 1) {
        // Note: Scale may already be baked into the model size
        // Only apply if not already handled in model creation
        if (!(obj.type === 'image' || obj.type === 'imagebox')) {
          maker.model.scale(makerModel, obj.scaleX || 1, obj.scaleY || 1);
        }
      }

      // b. Apply Rotation (note: negative for coordinate system conversion)
      const angle = obj.angle || 0;
      if (angle !== 0) {
        maker.model.rotate(makerModel, -angle, [0, 0]);
      }

      // c. Apply Position with Coordinate System Flip
      const leftInches = unitConverter.pixelsToInches(obj.left, scale);
      const topInches = unitConverter.pixelsToInches(obj.top, scale);

      // Convert from Fabric's top-left (pixels) to DXF's bottom-left (inches)
      const dxf_X = leftInches;
      const dxf_Y = (productData.realWorldHeight || 18) - topInches;

      // Move the model to its final position
      maker.model.move(makerModel, [dxf_X, dxf_Y]);

      // d. Add to Document
      const modelName = obj.elementId || obj.id || `element-${objects.indexOf(obj)}`;
      dxfDocument.models[modelName] = makerModel;
    }

    // 6. Generate and Download the File
    const dxfString = maker.exporter.toDxf(dxfDocument);
    const filename = (productData.name || productData.id || 'design') + '-export.dxf';
    
    triggerDownload(filename, dxfString);

    console.log('DXF export successful');
  } catch (error) {
    console.error('Error exporting to DXF:', error);
    throw error;
  }
}

export default exportToDxf;
