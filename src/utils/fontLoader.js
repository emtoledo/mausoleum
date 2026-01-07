/**
 * Font Loader Utility
 * 
 * Dynamically loads fonts from /public/fonts/ directory using the FontFace API.
 * This avoids webpack build-time resolution issues with CSS @font-face.
 */

import { fontData } from '../data/FontData';

// Cache to track loaded fonts
const loadedFonts = new Set();

/**
 * Load a single font using the FontFace API
 * @param {Object} font - Font object from FontData
 * @returns {Promise<FontFace>} - FontFace object
 */
async function loadFont(font) {
  // Check if already loaded
  if (loadedFonts.has(font.fontFamily)) {
    return document.fonts.check(`12px "${font.fontFamily}"`);
  }

  try {
    // Encode the filename for URL
    const encodedFileName = encodeURIComponent(font.fileName);
    const fontUrl = `/fonts/${encodedFileName}`;

    // Create FontFace object
    const fontFace = new FontFace(
      font.fontFamily,
      `url(${fontUrl}) format('truetype')`,
      {
        display: 'swap'
      }
    );

    // Load the font
    await fontFace.load();

    // Add to document.fonts
    document.fonts.add(fontFace);

    // Mark as loaded
    loadedFonts.add(font.fontFamily);

    console.log(`✓ Font loaded: ${font.fontFamily}`);
    return fontFace;
  } catch (error) {
    console.error(`Failed to load font ${font.fontFamily}:`, error);
    throw error;
  }
}

/**
 * Load all fonts from FontData
 * @returns {Promise<void>}
 */
export async function loadAllFonts() {
  const loadPromises = fontData.map(font => 
    loadFont(font).catch(err => {
      console.warn(`Could not load font ${font.fontFamily}:`, err);
      return null;
    })
  );

  await Promise.all(loadPromises);
  console.log('All fonts loaded');
}

/**
 * Load a specific font by fontFamily name
 * @param {string} fontFamily - Font family name (e.g., "Brush Script")
 * @returns {Promise<FontFace|null>} - FontFace object or null if not found
 */
export async function loadFontByFamily(fontFamily) {
  const font = fontData.find(f => f.fontFamily === fontFamily);
  if (!font) {
    console.warn(`Font not found in FontData: ${fontFamily}`);
    return null;
  }

  return loadFont(font);
}

/**
 * Preload fonts that are commonly used
 * Call this early in the app lifecycle
 */
export function preloadCommonFonts() {
  const commonFonts = ['Times New Roman', 'Arial', 'Helvetica', 'Georgia', 'Brush Script'];
  
  commonFonts.forEach(fontFamily => {
    loadFontByFamily(fontFamily).catch(err => {
      console.warn(`Could not preload ${fontFamily}:`, err);
    });
  });
}

export default {
  loadAllFonts,
  loadFontByFamily,
  preloadCommonFonts
};

