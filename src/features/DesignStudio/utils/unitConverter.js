/**
 * Unit Converter Utilities
 * 
 * Provides helper functions to convert between real-world inches and screen pixels
 * for the memorial design studio. This ensures accurate scaling and measurement
 * display when working with memorial designs.
 */

/**
 * Calculate the scale factor between real-world dimensions and canvas pixels
 * 
 * @param {number} realWorldWidthInches - The width in inches (real-world dimension)
 * @param {number} canvasWidthPixels - The canvas width in pixels (screen dimension)
 * @returns {number} The scale factor (pixels per inch)
 * 
 * @example
 * const scale = calculateScale(12, 1200); // Returns 100 (pixels per inch)
 */
export const calculateScale = (realWorldWidthInches, canvasWidthPixels) => {
  if (realWorldWidthInches <= 0 || canvasWidthPixels <= 0) {
    throw new Error('Both dimensions must be greater than zero');
  }
  
  return canvasWidthPixels / realWorldWidthInches;
};

/**
 * Convert inches to pixels based on a scale factor
 * 
 * @param {number} inches - The value in inches to convert
 * @param {number} scale - The scale factor (pixels per inch)
 * @returns {number} The equivalent value in pixels
 * 
 * @example
 * const pixels = inchesToPixels(6, 100); // Returns 600 pixels
 */
export const inchesToPixels = (inches, scale) => {
  if (scale <= 0) {
    throw new Error('Scale must be greater than zero');
  }
  
  return inches * scale;
};

/**
 * Convert pixels to inches based on a scale factor
 * 
 * @param {number} pixels - The value in pixels to convert
 * @param {number} scale - The scale factor (pixels per inch)
 * @returns {number} The equivalent value in inches
 * 
 * @example
 * const inches = pixelsToInches(600, 100); // Returns 6 inches
 */
export const pixelsToInches = (pixels, scale) => {
  if (scale <= 0) {
    throw new Error('Scale must be greater than zero');
  }
  
  return pixels / scale;
};

/**
 * Convert pixels to inches with formatting
 * 
 * @param {number} pixels - The value in pixels to convert
 * @param {number} scale - The scale factor (pixels per inch)
 * @param {number} precision - Number of decimal places (default: 2)
 * @returns {string} Formatted string representation in inches
 * 
 * @example
 * const formatted = pixelsToInchesFormatted(600.1234, 100, 2); // Returns "6.00\""
 */
export const pixelsToInchesFormatted = (pixels, scale, precision = 2) => {
  const inches = pixelsToInches(pixels, scale);
  return `${inches.toFixed(precision)}"`;
};

/**
 * Convert inches to pixels with rounding
 * 
 * @param {number} inches - The value in inches to convert
 * @param {number} scale - The scale factor (pixels per inch)
 * @returns {number} Rounded pixel value
 * 
 * @example
 * const pixels = inchesToPixelsRounded(6.1, 100); // Returns 610 pixels
 */
export const inchesToPixelsRounded = (inches, scale) => {
  return Math.round(inchesToPixels(inches, scale));
};

/**
 * Get a formatted string for inches and pixels (for display)
 * 
 * @param {number} pixels - The value in pixels
 * @param {number} scale - The scale factor (pixels per inch)
 * @returns {string} Formatted string showing both measurements
 * 
 * @example
 * const display = formatMeasurement(600, 100); // Returns "600px (6.00\")"
 */
export const formatMeasurement = (pixels, scale) => {
  const inches = pixelsToInches(pixels, scale);
  return `${Math.round(pixels)}px (${inches.toFixed(2)}")`;
};

export default {
  calculateScale,
  inchesToPixels,
  pixelsToInches,
  pixelsToInchesFormatted,
  inchesToPixelsRounded,
  formatMeasurement
};
