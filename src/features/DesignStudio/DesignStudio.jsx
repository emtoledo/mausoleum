/**
 * DesignStudio Component
 * 
 * Central layout manager and orchestrator for the memorial design studio.
 * Manages all state, coordinates child components, and handles user actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FabricImage, FabricText } from 'fabric';
import * as makerjs from 'makerjs';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { pixelsToInches, calculateScale, inchesToPixels } from './utils/unitConverter';
import DesignStudioToolbar from './components/DesignStudioToolbar';
import MaterialPicker from './components/MaterialPicker';
import ArtworkLibrary from './components/ArtworkLibrary';
import OptionsPanel from './components/OptionsPanel';
import exportToDxf from './utils/dxfExporter';
import { importDxfToFabric } from '../../utils/dxfImporter';
import AlertMessage from '../../components/ui/AlertMessage';

/**
 * @param {Object} initialData - Template/product data with dimensions, editZones, and designElements
 * @param {Array} materials - Array of material objects from MaterialsData
 * @param {Array} artwork - Array of artwork objects from ArtworkData
 * @param {Function} onSave - Callback when user saves (receives updated project data)
 * @param {Function} onClose - Callback when user closes the studio
 * @param {Function} onHandlersReady - Optional callback to expose handlers to parent (for AppHeader integration)
 * @returns {JSX.Element}
 */
const DesignStudio = ({ initialData, materials = [], artwork = [], onSave, onClose, onHandlersReady }) => {
  
  // Canvas refs
  const productCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Internal state management
  const [fabricInstance, setFabricInstance] = useState(null);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showArtworkLibrary, setShowArtworkLibrary] = useState(false);
  const [saveAlert, setSaveAlert] = useState(null);

  // Update canvas size when container dimensions change
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    // Initial size
    updateCanvasSize();

    // Create ResizeObserver for responsive canvas
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvasContainerRef.current);

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Track if we've initialized the material to prevent overwriting user changes
  const materialInitialized = useRef(false);
  // Track the current material in a ref to ensure we always have the latest value
  const activeMaterialRef = useRef(null);
  
  // Initialize active material from initialData on first load
  useEffect(() => {
    // Only initialize material on first load or if activeMaterial is not set
    // Don't overwrite if user has already selected a material (even if initialData changed after save)
    const shouldInitialize = !materialInitialized.current || !activeMaterial;
    
    if (materials.length > 0 && shouldInitialize) {
      // Filter materials based on template's availableMaterials
      let availableMaterials = materials;
      if (initialData && initialData.availableMaterials && Array.isArray(initialData.availableMaterials)) {
        availableMaterials = materials.filter(material => 
          initialData.availableMaterials.includes(material.id)
        );
      }
      
      if (availableMaterials.length > 0) {
        let materialToSet = null;
        
        // Priority 1: Use material object from initialData if provided
        // This is the saved material from the project
        if (initialData && initialData.material) {
          // Find the full material object from availableMaterials using the ID
          // This ensures we have all properties (textureUrl, swatch, etc.)
          const fullMaterial = availableMaterials.find(m => m.id === initialData.material.id);
          if (fullMaterial) {
            materialToSet = fullMaterial;
            console.log('Setting active material from initialData (availableMaterials):', fullMaterial);
          } else if (initialData.material.id) {
            // If not in availableMaterials, try to find it in all materials
            const materialFromAll = materials.find(m => m.id === initialData.material.id);
            if (materialFromAll) {
              materialToSet = materialFromAll;
              console.log('Setting active material from initialData (all materials):', materialFromAll);
            }
          }
        }
        // Priority 2: Use defaultMaterialId from template to find matching material
        if (!materialToSet && initialData && initialData.defaultMaterialId) {
          materialToSet = availableMaterials.find(m => m.id === initialData.defaultMaterialId);
        }
        // Priority 3: Fallback to first available material (only if no saved material)
        if (!materialToSet && !initialData?.material) {
          materialToSet = availableMaterials[0];
        }
        
        if (materialToSet) {
          console.log('Setting active material:', materialToSet);
          setActiveMaterial(materialToSet);
          activeMaterialRef.current = materialToSet; // Update ref
          materialInitialized.current = true;
        } else {
          console.log('No material found to set. initialData.material:', initialData?.material);
        }
      }
    }
    // eslint-disable-next-line
  }, [initialData, materials]); // Re-run when initialData or materials change

  // Call useFabricCanvas hook (the "engine")
  const fabricFromHook = useFabricCanvas(
    fabricCanvasRef,
    productCanvasRef,
    initialData,
    setSelectedElement,
    canvasSize,
    setFabricInstance, // Callback when canvas is ready
    activeMaterial, // Pass active material for product canvas fill
    materials // Pass materials array for productBase rendering
  );

  // Use the fabric instance from state (set via callback) or hook return value as fallback
  // This ensures we have the latest instance even if state hasn't updated
  const currentFabricInstance = fabricInstance || fabricFromHook;

  /**
   * Handler: Select Material
   */
  const handleSelectMaterial = useCallback((material) => {
    console.log('Material selected:', material);
    setActiveMaterial(material);
    activeMaterialRef.current = material; // Update ref immediately
    // Mark as initialized so we don't overwrite user's selection when initialData changes
    materialInitialized.current = true;
  }, []);

  /**
   * Handler: Add Text
   */
  const handleAddText = useCallback(() => {
    const fabric = fabricInstance || fabricFromHook;
    if (!fabric) {
      console.log('No Fabric instance available');
      return;
    }

    console.log('Add text clicked');
    
    // Create a new text object using FabricText (Fabric v6 API)
    const textObject = new FabricText('Edit Me', {
      left: fabricInstance.width / 2,
      top: fabricInstance.height / 2,
      fontSize: 20,
      fontFamily: 'Times New Roman',
      fill: '#000000',
      originX: 'center',
      originY: 'center'
    });

    // Add metadata for tracking
    textObject.elementId = `text-${Date.now()}`;

    // Add to canvas and render
    fabricInstance.add(textObject);
    fabricInstance.setActiveObject(textObject);
    fabricInstance.renderAll();
    
    console.log('Text object added:', textObject);
  }, [fabricInstance, initialData]);

  /**
   * Handler: Toggle Artwork Library Visibility
   */
  const handleToggleArtworkLibrary = useCallback(() => {
    setShowArtworkLibrary(prev => !prev);
  }, []);

  /**
   * Handler: Add Artwork
   */
  const handleAddArtwork = useCallback(async (art) => {
    if (!fabricInstance || !art || !initialData) return;

    console.log('Adding artwork:', art);
    
    // Check if this is a DXF file
    const isDxfFile = art.imageUrl && (
      art.imageUrl.toLowerCase().endsWith('.dxf') ||
      art.imageUrl.endsWith('.DXF')
    );

    if (isDxfFile) {
      // Handle DXF file import
      try {
        console.log('Detected DXF file, importing...');
        
        // Fetch the DXF file content as text
        const response = await fetch(art.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch DXF file: ${response.statusText}`);
        }
        const dxfString = await response.text();
        
        // Import DXF to Fabric.js group (with optional texture layer)
        const group = await importDxfToFabric({
          dxfString,
          fabricCanvas: fabricInstance,
          importUnit: makerjs.unitType.Inches,
          textureUrl: art.textureUrl || null
        });
        
        if (!group) {
          console.error('Failed to import DXF file');
          return;
        }

        console.log('DXF imported successfully:', group);

        // Calculate scale factor based on template dimensions
        const realWorldWidth = initialData.realWorldWidth || 24; // inches
        const canvasWidth = fabricInstance.width || 800;
        const scale = calculateScale(realWorldWidth, canvasWidth);
        
        // Get the artwork's default width in real-world inches
        const artworkWidthInches = art.defaultWidth || 6; // Default to 6 inches for DXF
        const artworkWidthPixels = artworkWidthInches * scale;
        
        // Get the current group dimensions
        const groupWidth = group.width * group.scaleX;
        const groupHeight = group.height * group.scaleY;
        
        // Calculate scale factors to match the target width
        const scaleX = artworkWidthPixels / groupWidth;
        const scaleY = scaleX; // Maintain aspect ratio
        
        // Calculate center position for the artwork
        const canvasHeight = fabricInstance.height || 600;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Update group properties
        group.set({
          left: centerX,
          top: centerY,
          scaleX: scaleX,
          scaleY: scaleY,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          // Store artwork metadata for potential export
          customData: {
            type: 'artwork',
            artworkId: art.id,
            artworkName: art.name,
            defaultWidthInches: artworkWidthInches,
            originalSource: art.imageUrl,
            isDxf: true
          }
        });

        // Re-render canvas
        fabricInstance.setActiveObject(group);
        fabricInstance.renderAll();

        // Close the artwork library after selecting artwork
        setShowArtworkLibrary(false);

        console.log('DXF artwork added to canvas:', group);
        console.log(`DXF artwork scaled to ${artworkWidthInches}" width (${artworkWidthPixels}px)`);
      } catch (error) {
        console.error('Error importing DXF artwork:', error);
      }
    } else {
      // Handle regular image artwork
      try {
        // Fabric v6 uses fromURL as a Promise-based static method
        const img = await FabricImage.fromURL(art.imageUrl);
        
        if (!img) {
          console.error('Failed to load artwork image:', art.imageUrl);
          return;
        }

        console.log('Image loaded successfully:', img);

        // Calculate scale factor based on template dimensions
        const realWorldWidth = initialData.realWorldWidth || 24; // inches
        const canvasWidth = fabricInstance.width || 800;
        const scale = calculateScale(realWorldWidth, canvasWidth);
        
        // Get the artwork's default width in real-world inches
        const artworkWidthInches = art.defaultWidth || 2.5; // Default to 2.5 inches
        const artworkWidthPixels = artworkWidthInches * scale;
        
        // Calculate the aspect ratio to maintain proportions
        const aspectRatio = img.height / img.width;
        const artworkHeightPixels = artworkWidthPixels * aspectRatio;
        
        // Calculate the scale factors for the image
        const scaleX = artworkWidthPixels / img.width;
        const scaleY = artworkHeightPixels / img.height;

        // Calculate center position for the artwork
        const canvasHeight = fabricInstance.height || 600;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Set position and scale
        img.set({
          left: centerX,
          top: centerY,
          scaleX: scaleX,
          scaleY: scaleY,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          // Store artwork metadata for potential export
          customData: {
            type: 'artwork',
            artworkId: art.id,
            artworkName: art.name,
            defaultWidthInches: artworkWidthInches,
            originalSource: art.imageUrl // Store original source URL for color changes
          }
        });

        // Add to canvas and render
        fabricInstance.add(img);
        fabricInstance.setActiveObject(img);
        fabricInstance.renderAll();

        // Close the artwork library after selecting artwork
        setShowArtworkLibrary(false);

        console.log('Artwork object added to canvas:', img);
        console.log(`Artwork scaled to ${artworkWidthInches}" width (${artworkWidthPixels}px)`);
      } catch (error) {
        console.error('Error loading artwork:', error);
      }
    }
  }, [fabricInstance, initialData]);

  /**
   * Handler: Delete Selected Element
   */
  const handleDeleteElement = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Remove the selected element
    fabricInstance.remove(selectedElement);
    fabricInstance.renderAll();
    
    // Clear selection
    fabricInstance.discardActiveObject();
    
    console.log('Element deleted');
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Center Selected Element Horizontally
   */
  const handleCenterHorizontal = useCallback(() => {
    if (!fabricInstance || !selectedElement || !initialData) return;

    const canvasWidth = fabricInstance.width;
    const canvasHeight = fabricInstance.height;
    
    let centerX = canvasWidth / 2; // Default to canvas center
    
    // Check if editZones are defined
    if (initialData.editZones && initialData.editZones.length > 0) {
      const editZone = initialData.editZones[0];
      const realWorldWidth = initialData.realWorldWidth || 24;
      const realWorldHeight = initialData.realWorldHeight || 18;
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / realWorldHeight;
      
      // Convert editZone coordinates from inches to pixels
      const editZoneLeft = editZone.x * scaleX;
      const editZoneWidth = editZone.width * scaleX;
      
      // Calculate center X of the edit zone
      centerX = editZoneLeft + (editZoneWidth / 2);
    }
    
    // Account for object origin point
    const originX = selectedElement.originX || 'left';
    if (originX === 'center') {
      // Object is already centered at its origin, so centerX is correct
      selectedElement.set({ left: centerX });
    } else {
      // Object origin is at left, need to adjust for object width
      const objWidth = Math.abs(selectedElement.width * selectedElement.scaleX);
      selectedElement.set({ left: centerX - (objWidth / 2) });
    }
    
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement, initialData]);

  /**
   * Handler: Center Selected Element Vertically
   */
  const handleCenterVertical = useCallback(() => {
    if (!fabricInstance || !selectedElement || !initialData) return;

    const canvasWidth = fabricInstance.width;
    const canvasHeight = fabricInstance.height;
    
    let centerY = canvasHeight / 2; // Default to canvas center
    
    // Check if editZones are defined
    if (initialData.editZones && initialData.editZones.length > 0) {
      const editZone = initialData.editZones[0];
      const realWorldWidth = initialData.realWorldWidth || 24;
      const realWorldHeight = initialData.realWorldHeight || 18;
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / realWorldHeight;
      
      // Convert editZone coordinates from inches to pixels
      const editZoneTop = editZone.y * scaleY;
      const editZoneHeight = editZone.height * scaleY;
      
      // Calculate center Y of the edit zone
      centerY = editZoneTop + (editZoneHeight / 2);
    }
    
    // Account for object origin point
    const originY = selectedElement.originY || 'top';
    if (originY === 'center') {
      // Object is already centered at its origin, so centerY is correct
      selectedElement.set({ top: centerY });
    } else {
      // Object origin is at top, need to adjust for object height
      const objHeight = Math.abs(selectedElement.height * selectedElement.scaleY);
      selectedElement.set({ top: centerY - (objHeight / 2) });
    }
    
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement, initialData]);

  /**
   * Handler: Flip Selected Element Horizontally
   */
  const handleFlipHorizontal = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Flip by negating scaleX
    selectedElement.set({
      scaleX: -selectedElement.scaleX
    });
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Flip Selected Element Vertically
   */
  const handleFlipVertical = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Flip by negating scaleY
    selectedElement.set({
      scaleY: -selectedElement.scaleY
    });
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Bring Selected Element To Front
   */
  const handleBringToFront = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Get all objects
    const objects = fabricInstance.getObjects();
    const index = objects.indexOf(selectedElement);
    
    if (index === -1) return;
    
    // Remove object from its current position
    fabricInstance.remove(selectedElement);
    // Add it back (this puts it at the end of the objects array, on top)
    fabricInstance.add(selectedElement);
    // Keep it selected
    fabricInstance.setActiveObject(selectedElement);
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Send Selected Element To Back
   */
  const handleSendToBack = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Get all objects
    const objects = fabricInstance.getObjects();
    const index = objects.indexOf(selectedElement);
    
    if (index === -1) return;
    
    // Remove object from its current position
    fabricInstance.remove(selectedElement);
    
    // Get remaining objects
    const remainingObjects = fabricInstance.getObjects();
    
    // Remove all remaining objects temporarily
    remainingObjects.forEach(obj => {
      fabricInstance.remove(obj);
    });
    
    // Add selected element first (bottom of z-index)
    fabricInstance.add(selectedElement);
    
    // Add all other objects back (on top)
    remainingObjects.forEach(obj => {
      fabricInstance.add(obj);
    });
    
    // Keep it selected
    fabricInstance.setActiveObject(selectedElement);
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

  // Keyboard event handler for Delete key and arrow key nudge
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if focus is in an input field (input, textarea, or contenteditable)
      const target = e.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable ||
                          target.closest('input, textarea, [contenteditable="true"]');
      
      // If focus is in an input field, allow normal text editing (don't intercept keys)
      if (isInputField) {
        return; // Let the browser handle it normally
      }

      // Check if Delete or Backspace is pressed and an object is selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        e.preventDefault();
        handleDeleteElement();
        return;
      }

      // Arrow key nudge controls (with object selected)
      if (selectedElement && fabricInstance && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        // Calculate scale to convert inches to pixels
        const realWorldWidth = initialData.realWorldWidth || 24;
        const canvasWidthForScale = canvasSize.width || fabricInstance.width;
        const scale = calculateScale(realWorldWidth, canvasWidthForScale);
        
        // Nudge increment: 0.125 inches
        const nudgeInches = 0.125;
        const nudgePixels = inchesToPixels(nudgeInches, scale);

        e.preventDefault();
        
        let newLeft = selectedElement.left;
        let newTop = selectedElement.top;

        switch (e.key) {
          case 'ArrowLeft':
            newLeft -= nudgePixels;
            break;
          case 'ArrowRight':
            newLeft += nudgePixels;
            break;
          case 'ArrowUp':
            newTop -= nudgePixels;
            break;
          case 'ArrowDown':
            newTop += nudgePixels;
            break;
        }

        // Apply constraint logic (same as in useFabricCanvas)
        const canvasWidth = fabricInstance.width;
        const canvasHeight = fabricInstance.height;
        
        let constraintLeft = 0;
        let constraintTop = 0;
        let constraintRight = canvasWidth;
        let constraintBottom = canvasHeight;
        
        if (initialData.editZones && initialData.editZones.length > 0) {
          const editZone = initialData.editZones[0];
          const realWorldWidth = initialData.realWorldWidth || 24;
          const realWorldHeight = initialData.realWorldHeight || 18;
          
          const scaleX = canvasWidth / realWorldWidth;
          const scaleY = canvasHeight / realWorldHeight;
          
          constraintLeft = editZone.x * scaleX;
          constraintTop = editZone.y * scaleY;
          constraintRight = constraintLeft + (editZone.width * scaleX);
          constraintBottom = constraintTop + (editZone.height * scaleY);
        }
        
        // Get object dimensions
        const objWidth = Math.abs(selectedElement.width * selectedElement.scaleX);
        const objHeight = Math.abs(selectedElement.height * selectedElement.scaleY);
        const originX = selectedElement.originX || 'left';
        const originY = selectedElement.originY || 'top';
        
        // Calculate bounding box
        let objLeft, objTop, objRight, objBottom;
        if (originX === 'center') {
          objLeft = newLeft - (objWidth / 2);
          objRight = newLeft + (objWidth / 2);
        } else {
          objLeft = newLeft;
          objRight = newLeft + objWidth;
        }
        if (originY === 'center') {
          objTop = newTop - (objHeight / 2);
          objBottom = newTop + (objHeight / 2);
        } else {
          objTop = newTop;
          objBottom = newTop + objHeight;
        }
        
        // Constrain position
        if (objLeft < constraintLeft) {
          newLeft = originX === 'center' ? constraintLeft + (objWidth / 2) : constraintLeft;
        } else if (objRight > constraintRight) {
          newLeft = originX === 'center' ? constraintRight - (objWidth / 2) : constraintRight - objWidth;
        }
        if (objTop < constraintTop) {
          newTop = originY === 'center' ? constraintTop + (objHeight / 2) : constraintTop;
        } else if (objBottom > constraintBottom) {
          newTop = originY === 'center' ? constraintBottom - (objHeight / 2) : constraintBottom - objHeight;
        }
        
        // Update object position
        selectedElement.set({
          left: newLeft,
          top: newTop
        });
        selectedElement.setCoords();
        fabricInstance.renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, handleDeleteElement, fabricInstance, canvasSize, initialData]);

  /**
   * Handler: Save Project (CRITICAL)
   * 
   * Gets all objects from Fabric, converts pixels to inches, and calls onSave
   */
  const handleSave = useCallback(async () => {
    if (!fabricInstance || isSaving || canvasSize.width === 0) return;

    setIsSaving(true);

    try {
      // Calculate scale (pixels per inch)
      const scale = calculateScale(
        initialData.realWorldWidth || 24,
        canvasSize.width
      );

      // Get all objects from Fabric instance
      const objects = fabricInstance.getObjects();
      
      console.log('=== SAVE DEBUG ===');
      console.log('Total objects on canvas:', objects.length);
      console.log('Objects:', objects.map(obj => ({
        type: obj.type,
        elementId: obj.elementId,
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        opacity: obj.opacity,
        customData: obj.customData,
        width: obj.width,
        height: obj.height
      })));

      // Convert each object to design element format
      const designElements = objects.map((obj, index) => {
        // Get actual transformed values - use get() to ensure we get current state
        const actualLeft = obj.get ? obj.get('left') : (obj.left ?? 0);
        const actualTop = obj.get ? obj.get('top') : (obj.top ?? 0);
        const actualScaleX = obj.get ? obj.get('scaleX') : (obj.scaleX ?? 1);
        const actualScaleY = obj.get ? obj.get('scaleY') : (obj.scaleY ?? obj.scaleX ?? 1);
        const actualAngle = obj.get ? obj.get('angle') : (obj.angle ?? obj.rotation ?? 0);
        const actualOpacity = obj.get ? obj.get('opacity') : (obj.opacity ?? 1);
        const actualFill = obj.get ? obj.get('fill') : (obj.fill ?? '#000000');
        const actualStroke = obj.get ? obj.get('stroke') : obj.stroke;
        const actualStrokeWidth = obj.get ? obj.get('strokeWidth') : obj.strokeWidth;
        
        // Base properties for all objects
        const element = {
          id: obj.elementId || obj.id || `element-${Date.now()}-${index}`,
          type: obj.type,
          x: pixelsToInches(actualLeft, scale),
          y: pixelsToInches(actualTop, scale),
          // Transform properties
          scaleX: actualScaleX,
          scaleY: actualScaleY,
          rotation: actualAngle,
          // Visual properties
          opacity: actualOpacity,
          fill: actualFill,
          // Layer order (z-index)
          zIndex: index
        };

        // Add stroke properties if they exist
        if (actualStroke !== undefined && actualStroke !== null) {
          element.stroke = actualStroke;
        }
        if (actualStrokeWidth !== undefined && actualStrokeWidth !== null) {
          element.strokeWidth = pixelsToInches(actualStrokeWidth, scale);
        }
        
        // Capture customData properties (colors, artwork metadata, etc.)
        const customData = obj.customData || {};
        if (customData.currentColor) element.fill = customData.currentColor;
        if (customData.currentColorId) element.colorId = customData.currentColorId;
        if (customData.currentOpacity !== undefined) element.opacity = customData.currentOpacity;
        if (customData.currentStrokeColor) element.stroke = customData.currentStrokeColor;
        if (customData.currentStrokeWidth !== undefined) {
          element.strokeWidth = pixelsToInches(customData.currentStrokeWidth, scale);
        }
        if (customData.artworkId) element.artworkId = customData.artworkId;
        if (customData.artworkName) element.artworkName = customData.artworkName;
        if (customData.category) element.category = customData.category;

        // Type-specific properties
        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
          // Get actual text properties using get() method
          const actualText = obj.get ? obj.get('text') : (obj.text ?? '');
          const actualFontSize = obj.get ? obj.get('fontSize') : (obj.fontSize ?? 12);
          const actualFontFamily = obj.get ? obj.get('fontFamily') : (obj.fontFamily ?? 'Arial');
          const actualFontWeight = obj.get ? obj.get('fontWeight') : (obj.fontWeight ?? 'normal');
          const actualFontStyle = obj.get ? obj.get('fontStyle') : (obj.fontStyle ?? 'normal');
          const actualTextAlign = obj.get ? obj.get('textAlign') : (obj.textAlign ?? 'left');
          const actualLineHeight = obj.get ? obj.get('lineHeight') : (obj.lineHeight ?? 1.2);
          
          element.content = actualText;
          // For text, fontSize might be scaled - use actual rendered size
          element.fontSize = pixelsToInches(actualFontSize * actualScaleX, scale);
          element.font = actualFontFamily;
          element.fontWeight = actualFontWeight;
          element.fontStyle = actualFontStyle;
          element.textAlign = actualTextAlign;
          element.lineHeight = actualLineHeight;
          // Text-specific fill (already in base fill)
        } else if (obj.type === 'image' || obj.type === 'imagebox') {
          // Get image source - prefer customData.originalSource to avoid blob URLs
          const imgCustomData = obj.customData || {};
          if (imgCustomData.originalSource) {
            element.content = imgCustomData.originalSource;
            element.imageUrl = imgCustomData.originalSource;
          } else if (typeof obj.getSrc === 'function') {
            element.content = obj.getSrc();
          } else if (obj.src) {
            element.content = obj.src;
          } else if (obj._element && obj._element.src) {
            element.content = obj._element.src;
          } else {
            element.content = '';
          }
          
          // Get actual dimensions using get() method
          const objWidth = obj.get ? obj.get('width') : (obj.width ?? 0);
          const objHeight = obj.get ? obj.get('height') : (obj.height ?? 0);
          
          // Calculate actual dimensions accounting for scale
          const actualWidth = objWidth * actualScaleX;
          const actualHeight = objHeight * actualScaleY;
          element.width = pixelsToInches(actualWidth, scale);
          element.height = pixelsToInches(actualHeight, scale);
        } else if (obj.type === 'group') {
          // Handle groups (like artwork with textures)
          // Get metadata from customData or direct properties
          const groupCustomData = obj.customData || {};
          element.content = obj.name || groupCustomData.artworkName || groupCustomData.artworkId || obj.artworkId || '';
          element.category = obj.category || groupCustomData.category || '';
          element.type = 'artwork'; // Normalize type for groups that are artwork
          
          // Get group dimensions from actual bounding rect (accounts for transforms)
          const groupBounds = obj.getBoundingRect();
          element.width = pixelsToInches(groupBounds.width, scale);
          element.height = pixelsToInches(groupBounds.height, scale);
          
          // For groups, get the actual transformed position
          // Groups may use center origin, so we need to account for that
          if (obj.getCenterPoint) {
            const groupCoords = obj.getCenterPoint();
            const groupOriginX = obj.get ? obj.get('originX') : (obj.originX || 'left');
            const groupOriginY = obj.get ? obj.get('originY') : (obj.originY || 'top');
            
            if (groupOriginX === 'center' || groupOriginY === 'center') {
              // Use center point and adjust for bounds
              element.x = pixelsToInches(groupCoords.x - (groupBounds.width / 2), scale);
              element.y = pixelsToInches(groupCoords.y - (groupBounds.height / 2), scale);
            }
          }
          
          // Store group-specific data
          if (obj.artworkId || groupCustomData.artworkId) element.artworkId = obj.artworkId || groupCustomData.artworkId;
          if (obj.textureUrl || groupCustomData.textureUrl) element.textureUrl = obj.textureUrl || groupCustomData.textureUrl;
          if (obj.imageUrl || groupCustomData.imageUrl || groupCustomData.originalSource) {
            element.imageUrl = obj.imageUrl || groupCustomData.imageUrl || groupCustomData.originalSource;
          }
          if (groupCustomData.defaultWidthInches) element.defaultWidthInches = groupCustomData.defaultWidthInches;
          
          // For groups, try to get color from the first path child if customData doesn't have it
          // This ensures we capture the actual color applied to the artwork
          if ((!element.fill || element.fill === '#000000') && obj._objects && obj._objects.length > 0) {
            // Check if this is a texture layer group (2 children: texture + artwork)
            let targetGroup = obj;
            if (obj._objects.length === 2) {
              const firstChild = obj._objects[0];
              const hasPatternFill = firstChild.fill && typeof firstChild.fill === 'object' && firstChild.fill.type === 'pattern';
              if (hasPatternFill) {
                targetGroup = obj._objects[1]; // Get the artwork group (second child)
              }
            }
            
            // Find first path in the group to get its color
            const findFirstPath = (groupObj) => {
              if (groupObj.type === 'path') {
                return groupObj;
              }
              if (groupObj._objects) {
                for (const child of groupObj._objects) {
                  const path = findFirstPath(child);
                  if (path) return path;
                }
              }
              return null;
            };
            
            const firstPath = findFirstPath(targetGroup);
            if (firstPath) {
              const pathFill = firstPath.get ? firstPath.get('fill') : firstPath.fill;
              const pathStroke = firstPath.get ? firstPath.get('stroke') : firstPath.stroke;
              const pathStrokeWidth = firstPath.get ? firstPath.get('strokeWidth') : firstPath.strokeWidth;
              const pathOpacity = firstPath.get ? firstPath.get('opacity') : firstPath.opacity;
              
              if (pathFill) element.fill = pathFill;
              if (pathStroke) element.stroke = pathStroke;
              if (pathStrokeWidth !== undefined) element.strokeWidth = pixelsToInches(pathStrokeWidth, scale);
              if (pathOpacity !== undefined) element.opacity = pathOpacity;
            }
          }
        } else if (obj.type === 'path' || obj.type === 'path-group') {
          // Handle paths (DXF artwork)
          element.content = obj.name || obj.artworkId || '';
          element.category = obj.category || '';
          
          // Get path dimensions
          const pathBounds = obj.getBoundingRect();
          element.width = pixelsToInches(pathBounds.width, scale);
          element.height = pixelsToInches(pathBounds.height, scale);
          
          // Store path-specific data
          if (obj.artworkId) element.artworkId = obj.artworkId;
          if (obj.textureUrl) element.textureUrl = obj.textureUrl;
          if (obj.imageUrl) element.imageUrl = obj.imageUrl;
        } else {
          // Generic object (rect, circle, etc.)
          element.content = obj.name || '';
          const bounds = obj.getBoundingRect ? obj.getBoundingRect() : { width: obj.width || 0, height: obj.height || 0 };
          element.width = pixelsToInches(bounds.width, scale);
          element.height = pixelsToInches(bounds.height, scale);
        }

        console.log(`Element ${index} (${obj.type}):`, element);
        return element;
      });

      console.log('=== SAVED DESIGN ELEMENTS ===');
      console.log('Total elements:', designElements.length);
      console.log('Elements:', JSON.stringify(designElements, null, 2));
      // Use ref to get the most current material value (state might be stale)
      const currentMaterial = activeMaterialRef.current || activeMaterial;
      
      console.log('=== SAVE: Active material ===');
      console.log('Active material (state):', activeMaterial);
      console.log('Active material (ref):', activeMaterialRef.current);
      console.log('Using material:', currentMaterial);
      console.log('Active material ID:', currentMaterial?.id);
      console.log('Active material name:', currentMaterial?.name);
      
      if (!currentMaterial) {
        console.warn('WARNING: No active material set when saving!');
      }

      // Create updated project data
      const updatedProjectData = {
        ...initialData,
        designElements,
        material: currentMaterial // Use ref value to ensure we have the latest
      };

      // Call parent's onSave callback
      if (onSave) {
        await onSave(updatedProjectData);
      }

      // Show success alert
      setSaveAlert({
        type: 'success',
        message: 'Design Saved'
      });

    } catch (error) {
      console.error('Error saving project:', error);
      // Show error alert
      setSaveAlert({
        type: 'danger',
        message: 'Failed to save project. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [fabricInstance, initialData, activeMaterial, canvasSize, isSaving, onSave]);

  /**
   * Handler: Export to DXF
   */
  const handleExport = useCallback(async () => {
    // Use current fabric instance (from state or hook return value)
    const fabric = fabricInstance || fabricFromHook;
    
    console.log('DesignStudio handleExport called', {
      hasFabricInstance: !!fabricInstance,
      hasFabricFromHook: !!fabricFromHook,
      fabricFromHookType: typeof fabricFromHook,
      currentFabricInstance: !!fabric,
      isExporting,
      canvasSizeWidth: canvasSize.width,
      fabricCanvasRefCurrent: !!fabricCanvasRef.current
    });

    // Check if canvas size is ready
    if (canvasSize.width === 0) {
      console.warn('DesignStudio handleExport: Canvas size is 0, waiting for canvas to initialize...');
      alert('Canvas is still initializing. Please wait a moment for the canvas to load and try again.');
      return;
    }

    // Check if we have a fabric instance
    if (!fabric) {
      console.warn('DesignStudio handleExport: No fabric instance available yet');
      alert('Canvas not ready. The canvas is still initializing. Please wait a moment and try again.');
      return;
    }

    if (isExporting) {
      console.warn('DesignStudio handleExport: Export already in progress');
      return;
    }

    setIsExporting(true);

    try {
      console.log('DesignStudio: Starting DXF export...');
      
      await exportToDxf({
        fabricCanvas: fabric,
        productData: initialData,
        unitConverter: {
          calculateScale,
          pixelsToInches,
          inchesToPixels: (inches, scale) => inches * scale
        }
      });
      
      console.log('DesignStudio: DXF export completed successfully');
    } catch (error) {
      console.error('DesignStudio: Error exporting to DXF:', error);
      alert('Failed to export to DXF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [fabricInstance, fabricFromHook, initialData, canvasSize, isExporting]);

  /**
   * Handler: Close Studio
   */
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Expose handlers to parent component (for AppHeader integration)
  // Store handlers in ref to always have latest version without causing re-renders
  const handlersRef = useRef({ onSave: handleSave, onExport: handleExport });
  const prevStateRef = useRef({ isSaving: false, isExporting: false, canvasReady: false, initialized: false });
  
  // Update handlers ref when they change (without triggering effects)
  useEffect(() => {
    handlersRef.current = { onSave: handleSave, onExport: handleExport };
  }, [handleSave, handleExport]);
  
  // Only expose handlers when state changes or on initial mount
  useEffect(() => {
    if (!onHandlersReady) return;
    
    // Check if state changed
    const stateChanged = 
      prevStateRef.current.isSaving !== isSaving ||
      prevStateRef.current.isExporting !== isExporting;
    
    // Check if canvas readiness changed
    const canvasReady = canvasSize.width > 0 && (!!fabricInstance || !!fabricFromHook);
    const prevCanvasReady = prevStateRef.current.canvasReady || false;
    const canvasReadinessChanged = canvasReady !== prevCanvasReady;
    
    // Also call on initial mount
    const isInitial = !prevStateRef.current.initialized;
    
    console.log('DesignStudio: Checking if handlers should be exposed', {
      stateChanged,
      canvasReadinessChanged,
      isInitial,
      isSaving,
      isExporting,
      canvasReady,
      prevCanvasReady,
      canvasSizeWidth: canvasSize.width,
      hasFabricInstance: !!fabricInstance,
      hasFabricFromHook: !!fabricFromHook
    });
    
    if (stateChanged || canvasReadinessChanged || isInitial) {
      prevStateRef.current = { 
        isSaving, 
        isExporting,
        canvasReady,
        initialized: true 
      };
      
      // Use handlers from ref to avoid dependency issues
      console.log('DesignStudio: Exposing handlers via onHandlersReady', {
        hasOnHandlersReady: !!onHandlersReady,
        hasOnSave: !!handlersRef.current.onSave,
        hasOnExport: !!handlersRef.current.onExport,
        onExportName: handlersRef.current.onExport?.name || 'anonymous',
        isSaving,
        isExporting,
        isCanvasReady: canvasReady,
        canvasSizeWidth: canvasSize.width,
        hasFabricInstance: !!fabricInstance,
        hasFabricFromHook: !!fabricFromHook,
        '*** isCanvasReady VALUE': canvasReady
      });
      onHandlersReady({
        onSave: handlersRef.current.onSave,
        onExport: handlersRef.current.onExport,
        isSaving,
        isExporting,
        isCanvasReady: canvasReady
      });
    }
  }, [onHandlersReady, isSaving, isExporting, canvasSize.width, fabricInstance, fabricFromHook]); // Re-expose when canvas becomes ready

  if (!initialData) {
    return (
      <div className="design-studio">
        <div className="design-studio-error">
          No template data provided
        </div>
      </div>
    );
  }

  return (
    <div className="design-studio">
      


      <div className="design-studio-layout">
        
        
      {/* side bar: Toolbar */}
      <DesignStudioToolbar
        onAddText={handleAddText}
        onToggleArtworkLibrary={handleToggleArtworkLibrary}
        onClose={handleClose}
      />

        {/* Left Panel: Artwork (only show when toggled) */}
        {showArtworkLibrary && (
            
            <ArtworkLibrary
              artwork={artwork}
              onSelectArtwork={handleAddArtwork}
            />
          
        )}

        {/* Main/Center: Canvas */}
        <div className="design-studio-canvas-container" ref={canvasContainerRef}>
          
          {/* Canvas Stack */}
          <div className="canvas-stack">
            
            {/* Product Canvas (bottom layer) */}
            <canvas
              ref={productCanvasRef}
              className="canvas-layer product-canvas"
            />
            
            {/* Fabric Canvas (top layer) */}
            <canvas
              ref={fabricCanvasRef}
              className="canvas-layer fabric-canvas"
            />
            
          </div>


        </div>

        {/* Right Panel: Options (only show when an object is selected) */}
        {selectedElement && (

            <OptionsPanel
              selectedElement={selectedElement}
              onDeleteElement={handleDeleteElement}
              onCenterHorizontal={handleCenterHorizontal}
              onCenterVertical={handleCenterVertical}
              onFlipHorizontal={handleFlipHorizontal}
              onFlipVertical={handleFlipVertical}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              realWorldWidth={initialData?.realWorldWidth || 24}
              canvasSize={canvasSize}
            />
     
        )}


        {/* Material Picker */}
          {(() => {
            // Filter materials based on template's availableMaterials
            let filteredMaterials = materials;
            if (initialData && initialData.availableMaterials && Array.isArray(initialData.availableMaterials)) {
              filteredMaterials = materials.filter(material => 
                initialData.availableMaterials.includes(material.id)
              );
            }
            
            return (
              <MaterialPicker
                materials={filteredMaterials}
                activeMaterialId={activeMaterial?.id}
                onSelectMaterial={handleSelectMaterial}
              />
            );
          })()}

        {/* Modal: Material Picker */}
      </div>

      {/* Alert Message */}
      {saveAlert && (
        <AlertMessage
          type={saveAlert.type}
          message={saveAlert.message}
          duration={5000}
          onClose={() => setSaveAlert(null)}
        />
      )}
    </div>
  );
};

export default DesignStudio;
