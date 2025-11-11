/**
 * DXF Importer Utility
 * 
 * Imports DXF files and converts them to Fabric.js Group objects on the canvas.
 */

import DxfParser from 'dxf-parser';
import * as makerjs from 'makerjs';
import * as fabric from 'fabric';

/**
 * Convert DXF entities to Maker.js model
 * 
 * @param {Object} dxfData - Parsed DXF data from dxf-parser
 * @returns {Object} - Maker.js model
 */
export function convertDxfToMakerModel(dxfData) {
  const model = { paths: {}, models: {} };
  
  if (!dxfData.entities || !Array.isArray(dxfData.entities)) {
    return model;
  }
  
  dxfData.entities.forEach((entity, index) => {
    try {
      if (entity.type === 'LINE') {
        const start = entity.start || entity.vertices?.[0];
        const end = entity.end || entity.vertices?.[1];
        if (start && end) {
          model.paths[`line-${index}`] = new makerjs.paths.Line(
            [start.x || 0, start.y || 0],
            [end.x || 0, end.y || 0]
          );
        }
      } else if (entity.type === 'CIRCLE') {
        const center = entity.center || { x: 0, y: 0 };
        const radius = entity.radius || 0;
        if (radius > 0) {
          model.paths[`circle-${index}`] = new makerjs.paths.Circle(
            [center.x || 0, center.y || 0],
            radius
          );
        }
      } else if (entity.type === 'ARC') {
        const center = entity.center || { x: 0, y: 0 };
        const radius = entity.radius || 0;
        const startAngle = entity.startAngle || 0;
        const endAngle = entity.endAngle || 0;
        if (radius > 0) {
          // Convert angles from degrees to radians if needed
          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;
          model.paths[`arc-${index}`] = new makerjs.paths.Arc(
            [center.x || 0, center.y || 0],
            radius,
            startAngleRad,
            endAngleRad
          );
        }
      } else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
        const vertices = entity.vertices || entity.points || [];
        if (vertices.length >= 2) {
          const lines = [];
          for (let i = 0; i < vertices.length - 1; i++) {
            const start = vertices[i];
            const end = vertices[i + 1];
            if (start && end) {
              lines.push(new makerjs.paths.Line(
                [start.x || 0, start.y || 0],
                [end.x || 0, end.y || 0]
              ));
            }
          }
          // If closed polyline, add line from last to first
          if (entity.closed && vertices.length > 2) {
            const first = vertices[0];
            const last = vertices[vertices.length - 1];
            if (first && last) {
              lines.push(new makerjs.paths.Line(
                [last.x || 0, last.y || 0],
                [first.x || 0, first.y || 0]
              ));
            }
          }
          // Store as a model with multiple paths
          if (lines.length > 0) {
            model.models[`polyline-${index}`] = {
              paths: lines.reduce((acc, line, lineIdx) => {
                acc[`line-${lineIdx}`] = line;
                return acc;
              }, {})
            };
          }
        }
      } else if (entity.type === 'SPLINE') {
        // Convert spline to polyline approximation
        const controlPoints = entity.controlPoints || entity.vertices || [];
        if (controlPoints.length >= 2) {
          const lines = [];
          for (let i = 0; i < controlPoints.length - 1; i++) {
            const start = controlPoints[i];
            const end = controlPoints[i + 1];
            if (start && end) {
              lines.push(new makerjs.paths.Line(
                [start.x || 0, start.y || 0],
                [end.x || 0, end.y || 0]
              ));
            }
          }
          if (lines.length > 0) {
            model.models[`spline-${index}`] = {
              paths: lines.reduce((acc, line, lineIdx) => {
                acc[`line-${lineIdx}`] = line;
                return acc;
              }, {})
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to convert DXF entity ${entity.type} at index ${index}:`, err);
    }
  });
  
  return model;
}

/**
 * Import a DXF file and add it to a Fabric.js canvas as a Group
 * 
 * @param {Object} params - Import parameters
 * @param {string} params.dxfString - The raw text content of the DXF file
 * @param {fabric.Canvas} params.fabricCanvas - The Fabric.js canvas instance to add the object to
 * @param {makerjs.unitType} params.importUnit - The makerjs.unitType to use (e.g., makerjs.unitType.Inches)
 * @returns {Promise<fabric.Group>} Promise that resolves with the newly created fabric.Group
 */
export async function importDxfToFabric({ dxfString, fabricCanvas, importUnit }) {
  try {
    // Parse the DXF string using dxf-parser
    const parser = new DxfParser();
    const dxfData = parser.parseSync(dxfString);
    
    if (!dxfData || !dxfData.entities) {
      throw new Error('DXF file contains no entities');
    }
    
    // Convert DXF entities to Maker.js model
    const makerModel = convertDxfToMakerModel(dxfData);
    
    // Convert the model to an SVG string, using Pixel units for correct Fabric.js scaling
    const svgString = makerjs.exporter.toSVG(makerModel, { units: makerjs.unitType.Pixel });
    
    // Use fabric.loadSVGFromString - in Fabric.js v6 it may return a Promise or use callbacks
    // Try Promise-based API first, fallback to callback
    try {
      // Check if loadSVGFromString returns a Promise (Fabric.js v6)
      const loadResult = fabric.loadSVGFromString(svgString);
      
      if (loadResult && typeof loadResult.then === 'function') {
        // Promise-based API
        const result = await loadResult;
        const objects = result.objects || result;
        const options = result.options || {};
        
        // Ensure objects is an array
        const objectsArray = Array.isArray(objects) ? objects : [objects].filter(Boolean);
        
        if (objectsArray.length === 0) {
          throw new Error('No objects loaded from SVG');
        }
        
        // Create a group from the objects
        let group;
        if (objectsArray.length === 1) {
          group = objectsArray[0];
        } else {
          group = new fabric.Group(objectsArray, options || {});
        }
        
        // Set default properties on the group
        group.set({
          left: 10,
          top: 10,
          selectable: true
        });
        
        // Add the group to the fabricCanvas
        fabricCanvas.add(group);
        fabricCanvas.requestRenderAll();
        
        return group;
      }
    } catch (promiseError) {
      // If Promise API fails, try callback API
      console.log('Promise API failed, trying callback API:', promiseError);
    }
    
    // Fallback to callback-based API
    return new Promise((resolve, reject) => {
      // Try different callback signatures
      // Signature 1: (objects, options)
      // Signature 2: (result) where result contains objects and options
      // Signature 3: (options, objects) - reversed
      fabric.loadSVGFromString(svgString, (...args) => {
        try {
          console.log('loadSVGFromString callback args:', args);
          
          let objects, options;
          
          // Handle different callback signatures
          if (args.length === 0) {
            throw new Error('loadSVGFromString callback received no arguments');
          } else if (args.length === 1) {
            // Single argument - could be array of objects or result object
            const arg = args[0];
            if (Array.isArray(arg)) {
              objects = arg;
              options = {};
            } else if (arg && arg.objects) {
              objects = arg.objects;
              options = arg.options || {};
            } else if (arg && typeof arg === 'object' && (arg.type || arg.width !== undefined)) {
              // Single Fabric object
              objects = [arg];
              options = {};
            } else {
              // Try to extract objects from various properties
              objects = arg.objects || arg.elements || [];
              options = arg.options || arg;
            }
          } else if (args.length === 2) {
            // Two arguments - could be (objects, options) or (options, objects)
            const first = args[0];
            const second = args[1];
            
            if (Array.isArray(first)) {
              objects = first;
              options = second || {};
            } else if (Array.isArray(second)) {
              objects = second;
              options = first || {};
            } else {
              // Both are objects, try to determine which is which
              if (first.objects || first.elements) {
                objects = first.objects || first.elements || [];
                options = second || first;
              } else {
                objects = second.objects || second.elements || [second].filter(Boolean);
                options = first || {};
              }
            }
          } else {
            // More than 2 arguments - use first as objects, second as options
            objects = args[0];
            options = args[1] || {};
          }
          
          // Ensure objects is an array
          if (!Array.isArray(objects)) {
            // If it's a single Fabric object, wrap it
            if (objects && typeof objects === 'object' && (objects.type || objects.width !== undefined)) {
              objects = [objects];
            } else {
              objects = [];
            }
          }
          
          if (objects.length === 0) {
            throw new Error('No objects loaded from SVG');
          }
          
          // Create a group from the objects
          let group;
          if (objects.length === 1) {
            group = objects[0];
          } else {
            group = new fabric.Group(objects, options || {});
          }
          
          // Set default properties on the group
          group.set({
            left: 10,
            top: 10,
            selectable: true
          });
          
          // Add the group to the fabricCanvas
          fabricCanvas.add(group);
          fabricCanvas.requestRenderAll();
          
          // Resolve with the group
          resolve(group);
        } catch (error) {
          console.error('Error creating group from SVG:', error);
          console.error('Callback args:', args);
          reject(error);
        }
      }, (error) => {
        console.error('Error loading SVG from string:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error importing DXF:', error);
    return Promise.reject(error);
  }
}

/**
 * Convert DXF string to SVG string for preview/display purposes
 * 
 * @param {string} dxfString - The raw text content of the DXF file
 * @param {makerjs.unitType} importUnit - The makerjs.unitType to use (e.g., makerjs.unitType.Inches)
 * @returns {Promise<string>} Promise that resolves with SVG string
 */
export async function convertDxfToSvg(dxfString, importUnit = makerjs.unitType.Inches) {
  try {
    // Parse the DXF string using dxf-parser
    const parser = new DxfParser();
    const dxfData = parser.parseSync(dxfString);
    
    if (!dxfData || !dxfData.entities) {
      throw new Error('DXF file contains no entities');
    }
    
    // Convert DXF entities to Maker.js model
    const makerModel = convertDxfToMakerModel(dxfData);
    
    // Convert the model to an SVG string, using Pixel units for display
    const svgString = makerjs.exporter.toSVG(makerModel, { units: makerjs.unitType.Pixel });
    
    return svgString;
  } catch (error) {
    console.error('Error converting DXF to SVG:', error);
    throw error;
  }
}

export default importDxfToFabric;

