/**
 * DXF to SVG Converter Service
 * 
 * Standalone service for converting DXF files to SVG format.
 * Used for pre-processing artwork files before upload to Supabase.
 */

import { convertDxfToSvg } from './dxfImporter';
import * as makerjs from 'makerjs';

/**
 * Convert a DXF file to SVG format
 * @param {File|Blob} dxfFile - The DXF file to convert
 * @returns {Promise<Blob>} Promise that resolves with SVG Blob
 */
export async function convertDxfFileToSvg(dxfFile) {
  try {
    // Read the DXF file as text
    const dxfString = await readFileAsText(dxfFile);
    
    // Convert DXF string to SVG string
    let svgString = await convertDxfToSvg(dxfString, makerjs.unitType.Inches);
    
    // Normalize the SVG to remove strokes and set stroke-width to 0
    // This matches how DXF files are processed in importDxfToFabric
    // Maker.js exports strokes by default, but we want filled shapes only
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgPaths = svgDoc.querySelectorAll('path');
    
    // Remove strokes and set stroke-width to 0 for all paths
    // This ensures the SVG renders as filled shapes, not stroked outlines
    svgPaths.forEach(path => {
      // Remove stroke attributes
      path.setAttribute('stroke', 'none');
      path.setAttribute('stroke-width', '0');
      // Ensure fill is set (default to black if not set)
      if (!path.getAttribute('fill') || path.getAttribute('fill') === 'none') {
        path.setAttribute('fill', '#000000');
      }
    });
    
    // Also handle other SVG elements that might have strokes
    const allElements = svgDoc.querySelectorAll('path, line, polyline, polygon, circle, ellipse, rect');
    allElements.forEach(el => {
      el.setAttribute('stroke', 'none');
      el.setAttribute('stroke-width', '0');
      if (!el.getAttribute('fill') || el.getAttribute('fill') === 'none') {
        el.setAttribute('fill', '#000000');
      }
    });
    
    // Serialize back to string
    const serializer = new XMLSerializer();
    svgString = serializer.serializeToString(svgDoc.documentElement);
    
    // Convert SVG string to Blob
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    
    return svgBlob;
  } catch (error) {
    console.error('Error converting DXF to SVG:', error);
    throw new Error(`Failed to convert DXF to SVG: ${error.message}`);
  }
}

/**
 * Read a file as text
 * @param {File|Blob} file - The file to read
 * @returns {Promise<string>} Promise that resolves with file content as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Check if a file is a DXF file
 * @param {File|string} fileOrName - File object or filename string
 * @returns {boolean} True if the file is a DXF file
 */
export function isDxfFile(fileOrName) {
  const name = typeof fileOrName === 'string' 
    ? fileOrName 
    : fileOrName.name || '';
  
  return name.toLowerCase().endsWith('.dxf');
}

/**
 * Create an SVG File object from a Blob
 * @param {Blob} svgBlob - SVG Blob
 * @param {string} originalFilename - Original filename (without extension)
 * @returns {File} File object with .svg extension
 */
export function createSvgFileFromBlob(svgBlob, originalFilename) {
  // Remove .dxf extension if present and add .svg
  const baseName = originalFilename.replace(/\.dxf$/i, '');
  const svgFilename = `${baseName}.svg`;
  
  return new File([svgBlob], svgFilename, { type: 'image/svg+xml' });
}

