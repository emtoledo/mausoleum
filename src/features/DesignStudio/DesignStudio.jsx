/**
 * DesignStudio Component
 * 
 * Central layout manager and orchestrator for the memorial design studio.
 * Manages all state, coordinates child components, and handles user actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FabricImage, FabricText } from 'fabric';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { pixelsToInches, calculateScale, inchesToPixels } from './utils/unitConverter';
import DesignStudioToolbar from './components/DesignStudioToolbar';
import MaterialPicker from './components/MaterialPicker';
import ArtworkLibrary from './components/ArtworkLibrary';
import OptionsPanel from './components/OptionsPanel';
import exportToDxf from './utils/dxfExporter';

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

  // Initialize active material from initialData on first load
  useEffect(() => {
    if (!activeMaterial && materials.length > 0) {
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
        if (initialData && initialData.material) {
          // Check if the material is in availableMaterials
          if (availableMaterials.find(m => m.id === initialData.material.id)) {
            materialToSet = initialData.material;
          }
        }
        // Priority 2: Use defaultMaterialId from template to find matching material
        if (!materialToSet && initialData && initialData.defaultMaterialId) {
          materialToSet = availableMaterials.find(m => m.id === initialData.defaultMaterialId);
        }
        // Priority 3: Fallback to first available material
        if (!materialToSet) {
          materialToSet = availableMaterials[0];
        }
        
        if (materialToSet) {
          setActiveMaterial(materialToSet);
        }
      }
    }
    // eslint-disable-next-line
  }, []); // Only run once on mount

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
    setActiveMaterial(material);
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
    if (!fabricInstance || !selectedElement) return;

    const centerX = fabricInstance.width / 2;
    selectedElement.set({
      left: centerX
    });
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Center Selected Element Vertically
   */
  const handleCenterVertical = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    const centerY = fabricInstance.height / 2;
    selectedElement.set({
      top: centerY
    });
    selectedElement.setCoords();
    fabricInstance.renderAll();
  }, [fabricInstance, selectedElement]);

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
        const canvasWidth = canvasSize.width || fabricInstance.width;
        const scale = calculateScale(realWorldWidth, canvasWidth);
        
        // Nudge increment: 0.5 inches
        const nudgeInches = 0.5;
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

      // Convert each object to design element format
      const designElements = objects.map((obj) => {
        const element = {
          id: obj.elementId || `element-${Date.now()}`,
          type: obj.type,
          x: pixelsToInches(obj.left, scale),
          y: pixelsToInches(obj.top, scale)
        };

        // Add type-specific properties
        if (obj.type === 'text') {
          element.content = obj.text || '';
          element.fontSize = pixelsToInches(obj.fontSize, scale);
          element.font = obj.fontFamily || 'Arial';
          element.fill = obj.fill || '#000000';
        } else if (obj.type === 'image') {
          element.content = obj.getSrc ? obj.getSrc() : '';
          element.width = pixelsToInches(obj.width * obj.scaleX, scale);
          element.height = pixelsToInches(obj.height * obj.scaleY, scale);
          element.opacity = obj.opacity || 1;
        }

        return element;
      });

      // Create updated project data
      const updatedProjectData = {
        ...initialData,
        designElements,
        material: activeMaterial
      };

      // Call parent's onSave callback
      if (onSave) {
        await onSave(updatedProjectData);
      }

    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
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
    </div>
  );
};

export default DesignStudio;
