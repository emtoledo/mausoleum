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
    const svgString = await convertDxfToSvg(dxfString, makerjs.unitType.Inches);
    
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

