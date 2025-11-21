/**
 * DXF Importer Utility
 * 
 * Imports DXF files and converts them to Fabric.js Group objects on the canvas.
 */

import DxfParser from 'dxf-parser';
import * as makerjs from 'makerjs';
import * as fabric from 'fabric';

/**
 * Convert a single POLYLINE entity to a Maker.js model
 * Creates a closed path that can be used for boolean operations
 * 
 * @param {Object} entity - DXF POLYLINE or LWPOLYLINE entity
 * @param {number} index - Index for naming
 * @param {boolean} forUnion - If true, convert to closed SVG path for boolean operations
 * @returns {Object|null} - Maker.js model or null if invalid
 */
function convertPolylineToModel(entity, index, forUnion = false) {
  const vertices = entity.vertices || entity.points || [];
  
  if (vertices.length < 2) {
    return null;
  }
  
  // Check if polyline is closed
  const isClosed = entity.closed || 
                   (vertices.length > 2 && 
                    Math.abs(vertices[0].x - vertices[vertices.length - 1].x) < 0.001 &&
                    Math.abs(vertices[0].y - vertices[vertices.length - 1].y) < 0.001);
  
  // For boolean union operations, convert to SVG path string and import as closed path
  if (forUnion && isClosed && vertices.length >= 3) {
    try {
      // Build SVG path string: M (move to first point), L (line to each subsequent point), Z (close)
      let pathString = `M ${vertices[0].x || 0} ${vertices[0].y || 0}`;
      for (let i = 1; i < vertices.length; i++) {
        pathString += ` L ${vertices[i].x || 0} ${vertices[i].y || 0}`;
      }
      pathString += ' Z'; // Close the path
      
      // Convert SVG path string to Maker.js model using importer
      const pathModel = makerjs.importer.fromSVGPathData(pathString);
      if (pathModel && pathModel.paths) {
        return pathModel;
      }
    } catch (error) {
      console.warn(`Failed to convert polyline ${index} to closed path for union:`, error);
    }
  }
  
  if (!isClosed) {
    // For open polylines, create a line-based model
    const lines = {};
    for (let i = 0; i < vertices.length - 1; i++) {
      const start = vertices[i];
      const end = vertices[i + 1];
      if (start && end) {
        lines[`line-${i}`] = new makerjs.paths.Line(
          [start.x || 0, start.y || 0],
          [end.x || 0, end.y || 0]
        );
      }
    }
    return Object.keys(lines).length > 0 ? { paths: lines } : null;
  }
  
  // For closed polylines (non-union case), create a path that can be unioned
  // Convert to a chain of lines that form a closed loop
  const lines = {};
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length]; // Wrap around for closed path
    if (start && end) {
      lines[`line-${i}`] = new makerjs.paths.Line(
        [start.x || 0, start.y || 0],
        [end.x || 0, end.y || 0]
      );
    }
  }
  
  return Object.keys(lines).length > 0 ? { paths: lines } : null;
}

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
        const polylineModel = convertPolylineToModel(entity, index);
        if (polylineModel) {
          model.models[`polyline-${index}`] = polylineModel;
        }
      } else if (entity.type === 'SPLINE') {
        // Convert spline to polyline approximation
        const controlPoints = entity.controlPoints || entity.vertices || [];
        if (controlPoints.length >= 2) {
          const lines = {};
          for (let i = 0; i < controlPoints.length - 1; i++) {
            const start = controlPoints[i];
            const end = controlPoints[i + 1];
            if (start && end) {
              lines[`line-${i}`] = new makerjs.paths.Line(
                [start.x || 0, start.y || 0],
                [end.x || 0, end.y || 0]
              );
            }
          }
          if (Object.keys(lines).length > 0) {
            model.models[`spline-${index}`] = { paths: lines };
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
 * Recursively extract all path objects from a Fabric.js group
 * 
 * @param {fabric.Object} obj - Fabric.js object (could be group, path, etc.)
 * @returns {Array<fabric.Path>} Array of path objects
 */
function extractAllPaths(obj) {
  const paths = [];
  
  if (!obj) return paths;
  
  if (obj.type === 'group' && obj._objects) {
    // Recursively extract paths from group
    obj._objects.forEach(child => {
      paths.push(...extractAllPaths(child));
    });
  } else if (obj.type === 'path') {
    paths.push(obj);
  }
  
  return paths;
}

/**
 * Find the outermost path(s) from an array of paths
 * Uses bounding box area to determine outermost path
 * 
 * @param {Array<fabric.Path>} paths - Array of path objects
 * @returns {Array<fabric.Path>} Array of outermost path objects
 */
function findOutermostPaths(paths) {
  if (paths.length === 0) return [];
  
  // Calculate bounding box for each path
  const pathBounds = paths.map(path => {
    const bounds = path.getBoundingRect();
    const area = bounds.width * bounds.height;
    return { path, bounds, area };
  });
  
  // Sort by area (largest first) - outermost paths are typically larger
  pathBounds.sort((a, b) => b.area - a.area);
  
  // Return the largest path(s) - for now, just return the largest one
  // Could be enhanced to return multiple if they're similar in size
  return [pathBounds[0].path];
}

/**
 * Load SVG string into Fabric.js and return a group
 * 
 * @param {string} svgString - SVG string to load
 * @returns {Promise<fabric.Group>} Promise that resolves with a fabric.Group
 */
async function loadSvgToFabricGroup(svgString) {
  // Try Promise-based API first
  try {
    const loadResult = fabric.loadSVGFromString(svgString);
    
    if (loadResult && typeof loadResult.then === 'function') {
      const result = await loadResult;
      const objects = result.objects || result;
      const options = result.options || {};
      
      const objectsArray = Array.isArray(objects) ? objects : [objects].filter(Boolean);
      
      if (objectsArray.length === 0) {
        throw new Error('No objects loaded from SVG');
      }
      
      if (objectsArray.length === 1) {
        return objectsArray[0];
      } else {
        return new fabric.Group(objectsArray, options || {});
      }
    }
  } catch (promiseError) {
    console.log('Promise API failed, trying callback API:', promiseError);
  }
  
  // Fallback to callback-based API
  return new Promise((resolve, reject) => {
    fabric.loadSVGFromString(svgString, (...args) => {
      try {
        let objects, options;
        
        if (args.length === 0) {
          reject(new Error('loadSVGFromString callback received no arguments'));
          return;
        } else if (args.length === 1) {
          const arg = args[0];
          if (Array.isArray(arg)) {
            objects = arg;
            options = {};
          } else if (arg && arg.objects) {
            objects = arg.objects;
            options = arg.options || {};
          } else if (arg && typeof arg === 'object' && (arg.type || arg.width !== undefined)) {
            objects = [arg];
            options = {};
          } else {
            objects = arg.objects || arg.elements || [];
            options = arg.options || arg;
          }
        } else if (args.length === 2) {
          const first = args[0];
          const second = args[1];
          
          if (Array.isArray(first)) {
            objects = first;
            options = second || {};
          } else if (Array.isArray(second)) {
            objects = second;
            options = first || {};
          } else {
            if (first.objects || first.elements) {
              objects = first.objects || first.elements || [];
              options = second || {};
            } else {
              objects = second.objects || second.elements || [];
              options = first || {};
            }
          }
        } else {
          // Try to find arrays in args
          const arrayArg = args.find(arg => Array.isArray(arg));
          if (arrayArg) {
            objects = arrayArg;
            options = args.find(arg => arg && typeof arg === 'object' && !Array.isArray(arg)) || {};
          } else {
            reject(new Error('Could not parse loadSVGFromString callback arguments'));
            return;
          }
        }
        
        if (!Array.isArray(objects) || objects.length === 0) {
          reject(new Error('No valid objects found in loadSVGFromString result'));
          return;
        }
        
        const group = objects.length === 1 ? objects[0] : new fabric.Group(objects, options || {});
        resolve(group);
      } catch (error) {
        reject(error);
      }
    }, (error) => {
      reject(error);
    });
  });
}

/**
 * Import a DXF file and add it to a Fabric.js canvas as a Group
 * Creates separate color and texture layers using boolean union at Maker.js level
 * 
 * @param {Object} params - Import parameters
 * @param {string} params.dxfString - The raw text content of the DXF file
 * @param {fabric.Canvas} params.fabricCanvas - The Fabric.js canvas instance to add the object to
 * @param {makerjs.unitType} params.importUnit - The makerjs.unitType to use (e.g., makerjs.unitType.Inches)
 * @param {string} params.textureUrl - Optional URL to texture image for texture layer
 * @returns {Promise<fabric.Group>} Promise that resolves with the newly created fabric.Group
 */
export async function importDxfToFabric({ dxfString, fabricCanvas, importUnit, textureUrl }) {
  try {
    // Parse the DXF string using dxf-parser
    const parser = new DxfParser();
    const dxfData = parser.parseSync(dxfString);
    
    if (!dxfData || !dxfData.entities) {
      throw new Error('DXF file contains no entities');
    }
    
    // Extract all POLYLINE entities and create individual Maker.js models
    // Use forUnion=true to get proper closed paths for boolean operations
    const polylineModels = [];
    const polylineIndices = []; // Track original entity indices
    const allEntities = [];
    
    dxfData.entities.forEach((entity, index) => {
      if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
        // For union operations, convert to closed SVG paths
        const polylineModel = convertPolylineToModel(entity, index, true);
        if (polylineModel) {
          polylineModels.push(polylineModel);
          polylineIndices.push(index);
          allEntities.push({ type: 'POLYLINE', model: polylineModel, index });
          console.log(`Converted polyline entity ${index} to closed path model`);
        } else {
          console.warn(`Failed to convert polyline entity ${index} - may not be closed or has insufficient vertices`);
        }
      } else {
        // Store other entity types for the color model
        allEntities.push({ type: entity.type, entity, index });
      }
    });
    
    console.log(`Found ${polylineModels.length} POLYLINE entities (indices: ${polylineIndices.join(', ')})`);
    
    // Create colorModel: container for all original entities
    const colorModel = convertDxfToMakerModel(dxfData);
    
    // Helper function to count paths in a model
    const countPaths = (model) => {
      if (!model) return 0;
      let count = 0;
      if (model.paths) {
        count += Object.keys(model.paths).length;
      }
      if (model.models) {
        Object.values(model.models).forEach(subModel => {
          count += countPaths(subModel);
        });
      }
      return count;
    };
    
    // Create textureModel: boolean union of all closed POLYLINE models
    let textureModel = null;
    if (polylineModels.length > 0) {
      // Start with the first model - scale it slightly to create overlap
      textureModel = makerjs.model.clone(polylineModels[0]);
      makerjs.model.scale(textureModel, 1.001); // Scale by 0.1% to create better overlap
      console.log(`Starting union with polyline ${polylineIndices[0]} (model 0), scaled by 1.001`);
      
      // Union all remaining models
      for (let i = 1; i < polylineModels.length; i++) {
        const originalIndex = polylineIndices[i];
        console.log(`Unioning polyline ${originalIndex} (model ${i}) into texture model...`);
        try {
          // Log before union
          const beforePathCount = countPaths(textureModel);
          const newPathCount = countPaths(polylineModels[i]);
          console.log(`Before union: textureModel has ${beforePathCount} paths, new polyline has ${newPathCount} paths`);
          
          // Scaling hack: Clone and scale the model slightly to create better overlap
          // This helps when shapes are touching edge-to-edge but not overlapping
          // Scale from center (default behavior of makerjs.model.scale)
          // Increased scale from 1.0001 to 1.001 (0.1% instead of 0.01%) for better overlap
          const scaledModel = makerjs.model.clone(polylineModels[i]);
          makerjs.model.scale(scaledModel, 1.001); // Scale by 0.1% to create better overlap
          console.log(`Scaled polyline ${originalIndex} by 1.001 to create overlap`);
          
          // makerjs.model.combine(modelA, modelB, subtract, union)
          // false = don't subtract, true = union
          const unionResult = makerjs.model.combine(textureModel, scaledModel, false, true);
          
          if (unionResult && (unionResult.paths || unionResult.models)) {
            const afterPathCount = countPaths(unionResult);
            console.log(`After union: result has ${afterPathCount} paths`);
            
            // Check if union actually preserved geometry
            // If the new polyline has many paths but union result doesn't increase significantly,
            // the union might have failed or merged too aggressively
            // For complex shapes, union might reduce path count (which is good - it's simplifying)
            // But if it reduces too much (less than 50% of expected), it might have failed
            const expectedMinPaths = Math.max(beforePathCount, Math.floor(newPathCount * 0.5));
            if (newPathCount > 10 && afterPathCount < expectedMinPaths) {
              console.warn(`Union may have lost geometry: ${newPathCount} paths reduced to ${afterPathCount} paths (expected at least ${expectedMinPaths}). Merging instead.`);
              // Merge instead of union to preserve all geometry
              // First, ensure textureModel has models object
              if (!textureModel.models) {
                textureModel.models = {};
              }
              
              // Add the entire polyline model as a sub-model
              textureModel.models[`polyline-${originalIndex}`] = polylineModels[i];
              
              // Also try to merge paths directly at the top level for easier access
              // But keep the model structure too for proper export
              const extractAllPathsFromModel = (model) => {
                const allPaths = {};
                if (model.paths) {
                  Object.assign(allPaths, model.paths);
                }
                if (model.models) {
                  Object.values(model.models).forEach(subModel => {
                    const subPaths = extractAllPathsFromModel(subModel);
                    Object.assign(allPaths, subPaths);
                  });
                }
                return allPaths;
              };
              
              const pathsToMerge = extractAllPathsFromModel(polylineModels[i]);
              const pathsCount = Object.keys(pathsToMerge).length;
              console.log(`Extracted ${pathsCount} paths from polyline ${originalIndex} for merging`);
              
              if (pathsCount > 0) {
                if (!textureModel.paths) {
                  textureModel.paths = {};
                }
                Object.keys(pathsToMerge).forEach(key => {
                  textureModel.paths[`polyline-${originalIndex}-${key}`] = pathsToMerge[key];
                });
                console.log(`Merged ${pathsCount} paths from polyline ${originalIndex} directly into textureModel.paths (total paths now: ${Object.keys(textureModel.paths).length})`);
              } else {
                console.warn(`No paths extracted from polyline ${originalIndex} - model structure:`, {
                  hasPaths: !!polylineModels[i].paths,
                  hasModels: !!polylineModels[i].models,
                  pathKeys: polylineModels[i].paths ? Object.keys(polylineModels[i].paths) : [],
                  modelKeys: polylineModels[i].models ? Object.keys(polylineModels[i].models) : []
                });
              }
              
              console.log(`Merged polyline ${originalIndex} (model ${i}) to preserve geometry`);
            } else {
              // When union succeeds, preserve any previously merged paths
              if (textureModel.paths && Object.keys(textureModel.paths).length > 0) {
                // Preserve existing merged paths
                if (!unionResult.paths) {
                  unionResult.paths = {};
                }
                Object.keys(textureModel.paths).forEach(key => {
                  unionResult.paths[key] = textureModel.paths[key];
                });
                console.log(`Preserved ${Object.keys(textureModel.paths).length} previously merged paths in union result`);
              }
              textureModel = unionResult;
              console.log(`Successfully unioned polyline ${originalIndex} (model ${i})`);
            }
          } else {
            console.warn(`Union returned invalid result for polyline ${originalIndex} (model ${i})`);
            // Try to merge models as fallback
            if (textureModel.models) {
              textureModel.models[`polyline-${originalIndex}`] = polylineModels[i];
            } else {
              textureModel.models = { [`polyline-${originalIndex}`]: polylineModels[i] };
            }
            // Also merge paths directly
            if (polylineModels[i].paths) {
              if (!textureModel.paths) {
                textureModel.paths = {};
              }
              Object.keys(polylineModels[i].paths).forEach(key => {
                textureModel.paths[`polyline-${originalIndex}-${key}`] = polylineModels[i].paths[key];
              });
            }
            console.log(`Merged polyline ${originalIndex} (model ${i}) as fallback`);
          }
        } catch (unionError) {
          console.warn(`Error performing union for polyline ${originalIndex} (model ${i}):`, unionError);
          // If union fails, merge models instead
          if (textureModel.models) {
            textureModel.models[`polyline-${originalIndex}`] = polylineModels[i];
          } else {
            textureModel.models = { [`polyline-${originalIndex}`]: polylineModels[i] };
          }
          // Also merge paths directly
          if (polylineModels[i].paths) {
            if (!textureModel.paths) {
              textureModel.paths = {};
            }
            Object.keys(polylineModels[i].paths).forEach(key => {
              textureModel.paths[`polyline-${originalIndex}-${key}`] = polylineModels[i].paths[key];
            });
          }
          console.log(`Merged polyline ${originalIndex} (model ${i}) after union error`);
        }
      }
      
      const pathCount = countPaths(textureModel);
      console.log(`Texture model created via boolean union (${polylineModels.length} polylines processed, ${pathCount} paths in result)`);
      
      // Log model structure for debugging
      if (textureModel.paths) {
        console.log('Texture model paths:', Object.keys(textureModel.paths));
      }
      if (textureModel.models) {
        console.log('Texture model sub-models:', Object.keys(textureModel.models));
      }
      
      // Check if union failed (too many individual paths = union didn't work)
      // If we have more than 50 paths, union likely failed and we're just collecting paths
      // In this case, use the outermost polyline (largest bounding box) as fallback
      let useBoundingBoxFallback = false;
      const hasTooManyPaths = pathCount > 50;
      if (hasTooManyPaths) {
        console.warn(`Union appears to have failed (${pathCount} paths). Using outermost polyline as fallback...`);
        
        // Helper function to get bounding box of a model
        const getModelBounds = (model) => {
          const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
          
          const collectBounds = (m) => {
            if (!m) return;
            if (m.paths) {
              Object.values(m.paths).forEach(path => {
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
                  const r = path.radius || 0;
                  bounds.minX = Math.min(bounds.minX, path.center[0] - r);
                  bounds.minY = Math.min(bounds.minY, path.center[1] - r);
                  bounds.maxX = Math.max(bounds.maxX, path.center[0] + r);
                  bounds.maxY = Math.max(bounds.maxY, path.center[1] + r);
                }
              });
            }
            if (m.models) {
              Object.values(m.models).forEach(subModel => collectBounds(subModel));
            }
          };
          
          collectBounds(model);
          return bounds;
        };
        
        // Calculate bounding box area for each polyline model
        let outermostPolyline = null;
        let largestArea = -1;
        let outermostIndex = -1;
        
        polylineModels.forEach((polyModel, idx) => {
          const bounds = getModelBounds(polyModel);
          if (isFinite(bounds.minX) && isFinite(bounds.minY) && 
              isFinite(bounds.maxX) && isFinite(bounds.maxY)) {
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;
            const area = width * height;
            
            if (area > largestArea) {
              largestArea = area;
              outermostPolyline = polyModel;
              outermostIndex = polylineIndices[idx];
            }
          }
        });
        
        if (outermostPolyline) {
          // Use the outermost polyline as the texture model
          textureModel = outermostPolyline;
          useBoundingBoxFallback = true;
          const bounds = getModelBounds(outermostPolyline);
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          console.log(`Using outermost polyline ${outermostIndex} as fallback: ${width} x ${height} (area: ${largestArea})`);
        } else {
          console.warn('Could not find outermost polyline, falling back to bounding box rectangle...');
          // Fallback to rectangle if we can't find outermost polyline
          const bounds = getModelBounds(textureModel);
          if (isFinite(bounds.minX) && isFinite(bounds.minY) && 
              isFinite(bounds.maxX) && isFinite(bounds.maxY)) {
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;
            const boundingRect = new makerjs.models.Rectangle(width, height);
            makerjs.model.move(boundingRect, [bounds.minX, bounds.minY]);
            textureModel = boundingRect;
            useBoundingBoxFallback = true;
            console.log(`Created bounding box rectangle fallback: ${width} x ${height} at [${bounds.minX}, ${bounds.minY}]`);
          } else {
            console.warn('Could not calculate bounds for fallback, using original model');
          }
        }
      }
      
      // Flatten the model structure to ensure all paths are exported
      // Maker.js union can create nested models, but SVG export might not handle them correctly
      // Skip flattening if we're using bounding box fallback (it's already a simple rectangle)
      const flattenModel = (model) => {
        const flattened = { paths: {}, models: {} };
        
        // Collect all paths recursively
        const collectPaths = (m, prefix = '') => {
          if (!m) return;
          
          // Collect paths at this level
          if (m.paths && typeof m.paths === 'object') {
            Object.keys(m.paths).forEach(key => {
              const pathKey = prefix ? `${prefix}-${key}` : key;
              flattened.paths[pathKey] = m.paths[key];
            });
          }
          
          // Recursively collect from nested models
          if (m.models && typeof m.models === 'object') {
            Object.keys(m.models).forEach(key => {
              const nestedPrefix = prefix ? `${prefix}-${key}` : key;
              collectPaths(m.models[key], nestedPrefix);
            });
          }
        };
        
        collectPaths(model);
        
        // Log what we collected
        const collectedPathKeys = Object.keys(flattened.paths);
        console.log(`Flattened model collected ${collectedPathKeys.length} paths:`, collectedPathKeys.slice(0, 10), collectedPathKeys.length > 10 ? '...' : '');
        
        return flattened;
      };
      
      // Flatten the texture model before export
      // Skip flattening if we're using bounding box fallback (it's already a simple rectangle)
      if (!useBoundingBoxFallback) {
        const flattenedTextureModel = flattenModel(textureModel);
        const flattenedPathCount = countPaths(flattenedTextureModel);
        console.log(`Flattened texture model has ${flattenedPathCount} paths (should match collected paths)`);
        
        // If flattening didn't collect enough paths, try a different approach
        if (flattenedPathCount < 10 && polylineModels.length > 2) {
          console.warn('Flattening may have missed paths, trying alternative flattening approach...');
          // Alternative: manually collect all paths from all polyline models
          const manualFlattened = { paths: {}, models: {} };
          polylineModels.forEach((polyModel, idx) => {
            const collectAllPaths = (m, pathPrefix = '') => {
              if (!m) return;
              if (m.paths) {
                Object.keys(m.paths).forEach(key => {
                  manualFlattened.paths[`polyline-${idx}-${pathPrefix}${key}`] = m.paths[key];
                });
              }
              if (m.models) {
                Object.keys(m.models).forEach(key => {
                  collectAllPaths(m.models[key], `${pathPrefix}${key}-`);
                });
              }
            };
            collectAllPaths(polyModel);
          });
          const manualPathCount = Object.keys(manualFlattened.paths).length;
          console.log(`Manual flattening collected ${manualPathCount} paths`);
          if (manualPathCount > flattenedPathCount) {
            console.log('Using manually flattened model with more paths');
            textureModel = manualFlattened;
          } else {
            textureModel = flattenedTextureModel;
          }
        } else {
          textureModel = flattenedTextureModel;
        }
      } else {
        console.log('Skipping flattening - using bounding box fallback');
      }
    } else {
      console.warn('No POLYLINE entities found, cannot create texture layer');
    }
    
    // Export both models to SVG strings
    const colorSvg = makerjs.exporter.toSVG(colorModel, { units: makerjs.unitType.Pixel });
    
    // Debug texture model before export
    console.log('Texture model before export:', {
      hasTextureModel: !!textureModel,
      textureModelType: textureModel ? typeof textureModel : 'null',
      textureUrl: textureUrl,
      willCreateTextureGroup: !!(textureUrl && textureModel)
    });
    
    let textureSvg = null;
    if (textureModel) {
      try {
        textureSvg = makerjs.exporter.toSVG(textureModel, { units: makerjs.unitType.Pixel });
        console.log('Texture SVG exported successfully:', textureSvg ? textureSvg.length : 0, 'chars');
      } catch (error) {
        console.error('Failed to export texture SVG:', error);
        textureSvg = null;
      }
    } else {
      console.warn('No texture model available for export');
    }
    
    console.log('Exported color SVG:', colorSvg.length, 'chars');
    if (textureSvg) {
      console.log('Exported texture SVG:', textureSvg.length, 'chars');
      
      // Modify texture SVG to ensure paths have fill attributes (Maker.js exports strokes by default)
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(textureSvg, 'image/svg+xml');
      const svgPaths = svgDoc.querySelectorAll('path');
      console.log(`Texture SVG contains ${svgPaths.length} path elements`);
      
      // Ensure all paths have fill="black" (will be replaced with pattern later)
      // and remove stroke so they render as filled shapes
      svgPaths.forEach(path => {
        // Set fill to black (temporary, will be replaced with pattern)
        path.setAttribute('fill', '#000000');
        // Remove stroke so it renders as a filled shape
        path.setAttribute('stroke', 'none');
        path.setAttribute('stroke-width', '0');
      });
      
      // Serialize back to string
      const serializer = new XMLSerializer();
      textureSvg = serializer.serializeToString(svgDoc.documentElement);
      console.log('Modified texture SVG to add fill attributes');
    }
    
    // Load color SVG into Fabric.js (top layer)
    const colorGroup = await loadSvgToFabricGroup(colorSvg);
    
    // Get color group bounds - this is relative to the group's origin
    // We need to ensure the group's internal content starts at (0,0)
    colorGroup.set({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top'
    });
    colorGroup.setCoords();
    
    // Get bounds after setting position - this tells us where the content actually is
    const colorBounds = colorGroup.getBoundingRect();
    console.log('Color group loaded:', { 
      type: colorGroup.type, 
      bounds: colorBounds,
      position: { left: colorGroup.left, top: colorGroup.top }
    });
    
    // If textureUrl is provided and we have a texture model, load texture SVG and apply pattern
    let textureGroup = null;
    console.log('Checking texture layer creation:', {
      hasTextureUrl: !!textureUrl,
      hasTextureSvg: !!textureSvg,
      textureUrl: textureUrl,
      textureSvgLength: textureSvg ? textureSvg.length : 0,
      willCreateTextureGroup: !!(textureUrl && textureSvg)
    });
    
    if (textureUrl && textureSvg) {
      // Load texture SVG into Fabric.js (bottom layer)
      textureGroup = await loadSvgToFabricGroup(textureSvg);
      
      // Set initial position
      textureGroup.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top'
      });
      textureGroup.setCoords();
      
      // Get texture group bounds after setting position
      const textureBounds = textureGroup.getBoundingRect();
      
      // Calculate offset to align texture group's content to color group's content
      // Both groups are at (0,0), but their internal content might be at different positions
      const offsetX = colorBounds.left - textureBounds.left;
      const offsetY = colorBounds.top - textureBounds.top;
      
      console.log('Aligning texture group to match color group:', {
        colorBounds: { left: colorBounds.left, top: colorBounds.top, width: colorBounds.width, height: colorBounds.height },
        textureBounds: { left: textureBounds.left, top: textureBounds.top, width: textureBounds.width, height: textureBounds.height },
        offsetX,
        offsetY
      });
      
      // Load texture image and create pattern
      const textureImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load texture image: ${textureUrl}`));
        img.src = textureUrl;
      });
      
      // Create pattern from texture image
      // In Fabric.js v6, patterns might need to be created differently
      let pattern;
      try {
        // Try creating pattern directly
        pattern = new fabric.Pattern({
          source: textureImage,
          repeat: 'repeat'
        });
        
        // Initialize pattern if it has an initialize method
        if (pattern && typeof pattern.initialize === 'function') {
          pattern.initialize(textureImage);
        }
        
        console.log('Pattern created:', {
          patternType: pattern?.type,
          hasSource: !!pattern?.source,
          repeat: pattern?.repeat
        });
      } catch (patternError) {
        console.error('Error creating pattern:', patternError);
        // Fallback: try using Pattern.fromURL if available
        if (fabric.Pattern && typeof fabric.Pattern.fromURL === 'function') {
          pattern = await fabric.Pattern.fromURL(textureUrl, {
            repeat: 'repeat'
          });
        } else {
          throw patternError;
        }
      }
      
      // Apply pattern fill to all paths in texture group
      let pathCount = 0;
      const applyPatternToObject = (obj) => {
        if (obj.type === 'group' && obj._objects) {
          obj._objects.forEach(child => applyPatternToObject(child));
        } else if (obj.type === 'path') {
          pathCount++;
          console.log(`Applying pattern to path ${pathCount}:`, {
            pathType: obj.type,
            hasPath: !!obj.path,
            currentFill: obj.fill,
            bounds: obj.getBoundingRect()
          });
          
          // Ensure path has a fill rule set (needed for patterns to render)
          if (!obj.fillRule) {
            obj.fillRule = 'nonzero';
          }
          
          // Set pattern as fill
          obj.set({
            fill: pattern,
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            fillRule: 'nonzero' // Ensure fill rule is set
          });
          
          // Disable caching for paths with patterns (can cause rendering issues)
          obj.objectCaching = false;
          
          // In Fabric.js v6, might need to call setCoords or render
          if (typeof obj.setCoords === 'function') {
            obj.setCoords();
          }
          
          
          // Verify pattern was set
          console.log(`Pattern set on path ${pathCount}:`, {
            fill: obj.fill,
            fillType: obj.fill?.type,
            hasPattern: obj.fill?.source === textureImage || obj.fill === pattern,
            objectCaching: obj.objectCaching,
            fillRule: obj.fillRule,
            visible: obj.visible,
            opacity: obj.opacity
          });
          
          // Force the path to be dirty so it re-renders with the pattern
          obj.dirty = true;
        }
      };
      
      applyPatternToObject(textureGroup);
      console.log(`Applied pattern to ${pathCount} paths in texture group`);
      
      // Apply the offset to align texture group content with color group content
      if (Math.abs(offsetX) > 0.001 || Math.abs(offsetY) > 0.001) {
        // If there's a significant offset, apply it
        textureGroup.set({
          left: offsetX,
          top: offsetY,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          visible: true,
          opacity: 1
        });
        textureGroup.setCoords();
        
        // Verify alignment after offset
        const textureBoundsAfter = textureGroup.getBoundingRect();
        console.log('Texture group aligned:', {
          before: textureBounds,
          after: textureBoundsAfter,
          offsetApplied: { offsetX, offsetY }
        });
      } else {
        // No offset needed, just set properties
        textureGroup.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          visible: true,
          opacity: 1
        });
        textureGroup.setCoords();
        console.log('Texture group already aligned (no offset needed)');
      }
      
      // Disable caching for texture group (patterns don't render well with caching)
      textureGroup.objectCaching = false;
      
      // Force the group/path to be dirty so it re-renders
      textureGroup.dirty = true;
      
      // If it's a single path (not a group), ensure it's set up correctly
      if (textureGroup.type === 'path') {
        console.log('Texture is a single path object:', {
          fill: textureGroup.fill,
          fillType: textureGroup.fill?.type,
          hasPattern: textureGroup.fill?.source === textureImage,
          bounds: textureGroup.getBoundingRect(),
          width: textureGroup.width,
          height: textureGroup.height
        });
      }
      
      console.log('Texture group loaded with pattern:', { 
        type: textureGroup.type, 
        bounds: textureGroup.getBoundingRect(),
        pathCount: pathCount,
        childrenCount: textureGroup._objects?.length,
        firstChildType: textureGroup._objects?.[0]?.type,
        firstChildFill: textureGroup._objects?.[0]?.fill
      });
    }
    
    // Create final group: stack textureGroup (bottom) and colorGroup (top)
    // Before grouping, ensure both groups are positioned correctly relative to each other
    const finalGroupChildren = [];
    
    // Get final bounds before grouping to understand positioning
    const colorBoundsBeforeGroup = colorGroup.getBoundingRect();
    const textureBoundsBeforeGroup = textureGroup ? textureGroup.getBoundingRect() : null;
    
    if (textureGroup) {
      // Ensure texture group is positioned correctly relative to color group
      // Both should have their content aligned
      finalGroupChildren.push(textureGroup);
    }
    
    // Color group should be at (0, 0) relative to the final group
    finalGroupChildren.push(colorGroup);
    
    // Create the group - Fabric.js will calculate bounds based on children positions
    // Use calculateBounds: false to prevent Fabric from auto-adjusting positions
    const finalGroup = new fabric.Group(finalGroupChildren, {
      left: 10,
      top: 10,
      selectable: true,
      originX: 'left',
      originY: 'top'
    });
    
    // After grouping, verify alignment
    // Note: getBoundingRect() on children within a group gives bounds relative to the group
    const finalBounds = finalGroup.getBoundingRect();
    
    // Get the actual children positions within the group
    const textureChild = textureGroup ? finalGroup._objects.find(obj => obj === textureGroup) : null;
    const colorChild = finalGroup._objects.find(obj => obj === colorGroup);
    
    console.log('Final group created:', {
      childrenCount: finalGroup._objects?.length,
      finalGroupBounds: finalBounds,
      colorGroupBoundsBefore: colorBoundsBeforeGroup,
      textureGroupBoundsBefore: textureBoundsBeforeGroup,
      textureChildPosition: textureChild ? { left: textureChild.left, top: textureChild.top } : null,
      colorChildPosition: colorChild ? { left: colorChild.left, top: colorChild.top } : null,
      textureGroupPosition: textureGroup ? { left: textureGroup.left, top: textureGroup.top } : null,
      colorGroupPosition: { left: colorGroup.left, top: colorGroup.top }
    });
    
    // Add the final group to the fabricCanvas
    fabricCanvas.add(finalGroup);
    
    // Force recalculation of group bounds and child positions
    // This ensures proper alignment (similar to what happens when color is changed)
    finalGroup.setCoords();
    if (textureGroup) {
      textureGroup.setCoords();
    }
    colorGroup.setCoords();
    
    // Apply default black color to the color group (outline paths)
    // This ensures proper alignment and sets a default appearance
    const applyDefaultColor = (obj) => {
      if (obj.type === 'group' && obj._objects) {
        obj._objects.forEach(child => applyDefaultColor(child));
      } else if (obj.type === 'path') {
        // Apply black color (#000000) with full opacity
        obj.set({
          fill: '#000000',
          opacity: 1,
          stroke: null,
          strokeWidth: 0
        });
      }
    };
    
    // Apply black color to all paths in the color group
    applyDefaultColor(colorGroup);
    
    // Update customData on final group to track the default color and texture URL
    const customData = finalGroup.customData || {};
    customData.currentColor = '#000000';
    customData.currentColorId = 'black';
    customData.currentOpacity = 1;
    customData.currentStrokeColor = null;
    customData.currentStrokeWidth = 0;
    // Store textureUrl so it can be saved and reloaded
    if (textureUrl) {
      customData.textureUrl = textureUrl;
      finalGroup.textureUrl = textureUrl; // Also store directly on group for easier access
    }
    finalGroup.set('customData', customData);
    
    // Trigger a render to ensure everything is properly positioned and colored
    fabricCanvas.renderAll();
    
    // Re-apply pattern after adding to canvas (sometimes needed for pattern to render)
    if (textureGroup && textureUrl) {
      console.log('Re-applying pattern after adding to canvas...');
      // Reload texture image and reapply pattern
      const textureImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load texture image: ${textureUrl}`));
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
      } catch (err) {
        console.error('Error creating pattern for re-apply:', err);
        return finalGroup; // Skip re-apply if pattern creation fails
      }
      
      // Re-apply pattern to texture group now that it's on the canvas
      let reapplyCount = 0;
      const reapplyPattern = (obj) => {
        if (obj.type === 'group' && obj._objects) {
          obj._objects.forEach(child => reapplyPattern(child));
        } else if (obj.type === 'path') {
          reapplyCount++;
          
          // Apply the pattern directly
          obj.set({
            fill: pattern,
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            fillRule: 'nonzero'
          });
          
          // Disable caching for paths with patterns (can cause rendering issues)
          obj.objectCaching = false;
          
          if (typeof obj.setCoords === 'function') {
            obj.setCoords();
          }
          
          console.log(`Re-applied pattern to path ${reapplyCount}:`, {
            fill: obj.fill,
            fillType: obj.fill?.type,
            visible: obj.visible,
            opacity: obj.opacity,
            bounds: obj.getBoundingRect()
          });
          
          obj.dirty = true;
        }
      };
      
      reapplyPattern(textureGroup);
      console.log(`Re-applied pattern to ${reapplyCount} paths`);
      
      textureGroup.dirty = true;
      textureGroup.objectCaching = false; // Disable caching for the group too
      finalGroup.dirty = true;
      
      // Force canvas to re-render everything
      fabricCanvas.requestRenderAll();
    }
    
    fabricCanvas.requestRenderAll();
    
    return finalGroup;
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

/**
 * Create a texture layer for a DXF group
 * 
 * @param {fabric.Group} originalGroup - The original DXF group
 * @param {string} textureUrl - URL to the texture image
 * @param {fabric.Canvas} fabricCanvas - The Fabric.js canvas instance
 * @returns {Promise<fabric.Group>} Promise that resolves with the final grouped object
 */
async function createTextureLayer(originalGroup, textureUrl, fabricCanvas) {
  try {
    // Extract all paths from the original group
    const allPaths = extractAllPaths(originalGroup);
    
    if (allPaths.length === 0) {
      console.warn('No paths found in group, cannot create texture layer');
      return originalGroup;
    }
    
    // Find the outermost path(s)
    const outermostPaths = findOutermostPaths(allPaths);
    
    if (outermostPaths.length === 0) {
      console.warn('No outermost paths found, cannot create texture layer');
      return originalGroup;
    }
    
    // Clone the outermost paths for the texture layer
    const texturePaths = outermostPaths.map(path => {
      try {
        // Get the path data - could be an array or SVG string
        let pathData = null;
        
        if (path.path && Array.isArray(path.path)) {
          // Path data is an array, convert to SVG path string
          pathData = fabric.util.joinPath(path.path);
        } else if (typeof path.path === 'string') {
          // Path data is already a string
          pathData = path.path;
        } else if (path.get && typeof path.get === 'function') {
          // Try to get path data using get method
          pathData = path.get('path');
        }
        
        if (!pathData) {
          console.warn('Path has no path data, attempting to serialize:', path);
          // Fallback: try to get path from path property directly
          pathData = path.path;
        }
        
        if (!pathData) {
          console.warn('Could not extract path data, skipping texture layer for this path');
          return null;
        }
        
        // Create a new Path object from the path data
        const clonedPath = new fabric.Path(pathData, {
          left: path.left || 0,
          top: path.top || 0,
          scaleX: path.scaleX || 1,
          scaleY: path.scaleY || 1,
          angle: path.angle || 0,
          originX: path.originX || 'left',
          originY: path.originY || 'top',
          fill: null, // Will be set to pattern later
          stroke: null,
          strokeWidth: 0
        });
        
        return clonedPath;
      } catch (error) {
        console.error('Error cloning path for texture layer:', error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    if (texturePaths.length === 0) {
      console.warn('No valid texture paths created, returning original group');
      return originalGroup;
    }
    
    // Load the texture image
    const textureImage = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('Texture image loaded:', { width: img.width, height: img.height, src: textureUrl });
        resolve(img);
      };
      img.onerror = (err) => {
        console.error('Failed to load texture image:', textureUrl, err);
        reject(new Error(`Failed to load texture image: ${textureUrl}`));
      };
      
      img.src = textureUrl;
    });
    
    console.log('Creating pattern from texture image:', { 
      imageWidth: textureImage.width, 
      imageHeight: textureImage.height,
      texturePathsCount: texturePaths.length 
    });
    
    // Create a pattern from the texture image
    // In Fabric.js v6, Pattern might need to be created with a callback or initialized
    let pattern;
    try {
      // Try creating pattern directly
      pattern = new fabric.Pattern({
        source: textureImage,
        repeat: 'repeat'
      });
      
      // If pattern has an initialize method, call it
      if (pattern && typeof pattern.initialize === 'function') {
        pattern.initialize(textureImage);
      }
      
      console.log('Pattern created:', { 
        pattern, 
        hasSource: !!pattern.source,
        repeat: pattern.repeat 
      });
    } catch (patternError) {
      console.error('Error creating pattern:', patternError);
      // Fallback: try creating pattern with callback
      pattern = fabric.Pattern.fromURL(textureUrl, {
        repeat: 'repeat'
      });
    }
    
    // Apply the pattern as fill to all texture paths
    texturePaths.forEach((path, index) => {
      console.log(`Applying pattern to texture path ${index}:`, {
        pathType: path.type,
        pathBounds: path.getBoundingRect(),
        hasPath: !!path.path,
        currentFill: path.fill
      });
      
      // Set the pattern as fill
      path.set('fill', pattern);
      
      // Ensure the path is visible and has proper styling
      path.set({
        opacity: 1,
        visible: true,
        stroke: null,
        strokeWidth: 0
      });
      
      // Force the path to render with the pattern
      if (path.dirty) {
        path.dirty = true;
      }
      
      console.log(`Path ${index} fill after setting:`, {
        fill: path.fill,
        fillType: path.fill?.type,
        hasPattern: path.fill?.source === textureImage
      });
    });
    
    // Store original group's position and transform before modifying
    const originalLeft = originalGroup.left || 0;
    const originalTop = originalGroup.top || 0;
    const originalScaleX = originalGroup.scaleX || 1;
    const originalScaleY = originalGroup.scaleY || 1;
    const originalAngle = originalGroup.angle || 0;
    const originalOriginX = originalGroup.originX || 'left';
    const originalOriginY = originalGroup.originY || 'top';
    
    // Reset texture paths positions to be relative to group origin (0,0)
    // Since they'll be children of the texture layer group
    texturePaths.forEach(path => {
      path.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top'
      });
    });
    
    // Create a texture layer group
    const textureLayer = texturePaths.length === 1 
      ? texturePaths[0]
      : new fabric.Group(texturePaths, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top'
      });
    
    // Ensure texture layer is visible and on top (will be below originalGroup in final group)
    textureLayer.set({
      selectable: false, // Don't allow selecting texture layer separately
      evented: false, // Don't allow events on texture layer
      excludeFromExport: false // Include in exports
    });
    
    console.log('Texture layer created:', {
      type: textureLayer.type,
      bounds: textureLayer.getBoundingRect(),
      fill: textureLayer.fill || (textureLayer._objects && textureLayer._objects[0]?.fill),
      childrenCount: textureLayer._objects?.length,
      firstChildFill: textureLayer._objects?.[0]?.fill
    });
    
    // Reset original group position to be relative to group origin
    originalGroup.set({
      left: 0,
      top: 0,
      originX: originalOriginX,
      originY: originalOriginY
    });
    
    // Create final group with texture layer below and original group above
    const finalGroup = new fabric.Group([textureLayer, originalGroup], {
      left: originalLeft,
      top: originalTop,
      scaleX: originalScaleX,
      scaleY: originalScaleY,
      angle: originalAngle,
      originX: originalOriginX,
      originY: originalOriginY,
      selectable: true
    });
    
    console.log('Final group created:', {
      childrenCount: finalGroup._objects?.length,
      bounds: finalGroup.getBoundingRect(),
      left: finalGroup.left,
      top: finalGroup.top
    });
    
    // Add the final group to the canvas
    fabricCanvas.add(finalGroup);
    
    // Force a render to ensure pattern is displayed
    fabricCanvas.requestRenderAll();
    
    // Also try to initialize the pattern if it has an initialize method
    if (pattern && typeof pattern.initialize === 'function') {
      pattern.initialize(textureImage);
    }
    
    console.log('Texture layer created successfully, final group added to canvas');
    
    return finalGroup;
  } catch (error) {
    console.error('Error creating texture layer:', error);
    // Return original group if texture layer creation fails
    fabricCanvas.add(originalGroup);
    fabricCanvas.requestRenderAll();
    return originalGroup;
  }
}

export default importDxfToFabric;

