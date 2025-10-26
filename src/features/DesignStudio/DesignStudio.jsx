/**
 * DesignStudio Component
 * 
 * Central layout manager and orchestrator for the memorial design studio.
 * Manages all state, coordinates child components, and handles user actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FabricImage, FabricText } from 'fabric';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { pixelsToInches, calculateScale } from './utils/unitConverter';
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
 * @returns {JSX.Element}
 */
const DesignStudio = ({ initialData, materials = [], artwork = [], onSave, onClose }) => {
  
  // Canvas refs
  const productCanvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Internal state management
  const [fabricInstance, setFabricInstance] = useState(null);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
    if (initialData && initialData.material && !activeMaterial) {
      setActiveMaterial(initialData.material);
    } else if (materials.length > 0 && !activeMaterial) {
      // Set first material as default
      setActiveMaterial(materials[0]);
    }
    // eslint-disable-next-line
  }, []); // Only run once on mount

  // Call useFabricCanvas hook (the "engine")
  const fabric = useFabricCanvas(
    fabricCanvasRef,
    productCanvasRef,
    zoneCanvasRef,
    initialData,
    setSelectedElement,
    canvasSize
  );

  // Save the returned Fabric instance to our state
  useEffect(() => {
    if (fabric && !fabricInstance) {
      setFabricInstance(fabric);
    }
    // eslint-disable-next-line
  }, [fabric]);

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
    if (!fabricInstance) {
      console.log('No Fabric instance available');
      return;
    }

    console.log('Add text clicked');
    
    // Create a new text object using FabricText (Fabric v6 API)
    const textObject = new FabricText('Edit Me', {
      left: fabricInstance.width / 2,
      top: fabricInstance.height / 2,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center'
    });

    // Add metadata for tracking
    textObject.elementId = `text-${Date.now()}`;
    
    // Add to canvas (Fabric will handle the first edit zone if it has zoneId)
    if (initialData.editZones && initialData.editZones.length > 0) {
      // Use the first edit zone as default
      textObject.zoneId = initialData.editZones[0].id;
    }

    // Add to canvas and render
    fabricInstance.add(textObject);
    fabricInstance.setActiveObject(textObject);
    fabricInstance.renderAll();
    
    console.log('Text object added:', textObject);
  }, [fabricInstance, initialData]);

  /**
   * Handler: Add Artwork
   */
  const handleAddArtwork = useCallback(async (art) => {
    if (!fabricInstance || !art) return;

    console.log('Adding artwork:', art);
    console.log('FabricImage:', FabricImage);
    
    try {
      // Fabric v6 uses fromURL as a Promise-based static method
      const img = await FabricImage.fromURL(art.imageUrl);
      
      if (!img) {
        console.error('Failed to load artwork image:', art.imageUrl);
        return;
      }

      console.log('Image loaded successfully:', img);

      // Calculate center position for the artwork
      const canvasWidth = fabricInstance.width || 800;
      const canvasHeight = fabricInstance.height || 600;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      // Set position and scale
      img.set({
        left: centerX - img.width / 2,
        top: centerY - img.height / 2,
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
          artworkName: art.name
        }
      });

      // Add to canvas and render
      fabricInstance.add(img);
      fabricInstance.setActiveObject(img);
      fabricInstance.renderAll();

      console.log('Artwork object added to canvas:', img);
    } catch (error) {
      console.error('Error loading artwork:', error);
    }
  }, [fabricInstance]);

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
          y: pixelsToInches(obj.top, scale),
          zoneId: obj.zoneId
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
    if (!fabricInstance || isExporting || canvasSize.width === 0) return;

    setIsExporting(true);

    try {
      console.log('Exporting to DXF...');
      
      await exportToDxf({
        fabricCanvas: fabricInstance,
        productData: initialData,
        unitConverter: {
          calculateScale,
          pixelsToInches,
          inchesToPixels: (inches, scale) => inches * scale
        }
      });
      
    } catch (error) {
      console.error('Error exporting to DXF:', error);
      alert('Failed to export to DXF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [fabricInstance, initialData, canvasSize, isExporting]);

  /**
   * Handler: Close Studio
   */
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

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
      
      {/* Top: Toolbar */}
      <DesignStudioToolbar
        onAddText={handleAddText}
        onSave={handleSave}
        onExport={handleExport}
        onClose={handleClose}
        isSaving={isSaving}
        isExporting={isExporting}
      />

      <div className="design-studio-layout">
        
        {/* Left Panel: Artwork */}
        <div className="design-studio-sidebar design-studio-sidebar-left">
          {/* Material Picker hidden for now - will be shown in modal later */}
          <div style={{ display: 'none' }}>
            <MaterialPicker
              materials={materials}
              activeMaterialId={activeMaterial?.id}
              onSelectMaterial={handleSelectMaterial}
            />
          </div>
          
          <ArtworkLibrary
            artwork={artwork}
            onSelectArtwork={handleAddArtwork}
          />
        </div>

        {/* Main/Center: Canvas */}
        <div className="design-studio-canvas-container" ref={canvasContainerRef}>
          
          {/* Canvas Stack */}
          <div className="canvas-stack">
            
            {/* Product Canvas (bottom layer) */}
            <canvas
              ref={productCanvasRef}
              className="canvas-layer product-canvas"
            />
            
            {/* Zone Canvas (middle layer) */}
            <canvas
              ref={zoneCanvasRef}
              className="canvas-layer zone-canvas"
            />
            
            {/* Fabric Canvas (top layer) */}
            <canvas
              ref={fabricCanvasRef}
              className="canvas-layer fabric-canvas"
            />
            
          </div>
        </div>

        {/* Right Panel: Options */}
        <div className="design-studio-sidebar design-studio-sidebar-right">
          <OptionsPanel
            selectedElement={selectedElement}
            onDeleteElement={handleDeleteElement}
          />
        </div>

      </div>
    </div>
  );
};

export default DesignStudio;
