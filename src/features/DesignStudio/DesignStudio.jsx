/**
 * DesignStudio Component
 * 
 * Main container for the memorial design studio.
 * Manages canvas initialization, state, and coordinates all child components.
 */

import React, { useState, useRef } from 'react';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { pixelsToInches } from './utils/unitConverter';
import DesignStudioToolbar from './components/DesignStudioToolbar';
import MaterialPicker from './components/MaterialPicker';
import ArtworkLibrary from './components/ArtworkLibrary';
import OptionsPanel from './components/OptionsPanel';

/**
 * @param {Object} initialData - Template/product data with dimensions, editZones, and designElements
 * @param {Array} materials - Array of material objects from MaterialsData
 * @param {Array} artwork - Array of artwork objects from ArtworkData
 * @param {Function} onSave - Callback when user saves (receives updated project data)
 * @param {Function} onClose - Callback when user closes the studio
 * @returns {JSX.Element}
 */
const DesignStudio = ({ initialData, materials = [], artwork = [], onSave, onClose }) => {
  
  // Refs for canvas layers
  const productCanvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  // State for selected element and material
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Get canvas instance and selected element from useFabricCanvas hook
  const { canvas: fabricCanvas, selectedObject } = useFabricCanvas(
    fabricCanvasRef,
    productCanvasRef,
    zoneCanvasRef,
    initialData,
    selectedMaterial?.textureUrl
  );

  // Update selected element when canvas selection changes
  React.useEffect(() => {
    if (selectedObject) {
      setSelectedElement(selectedObject);
    }
  }, [selectedObject]);

  /**
   * Handle material selection
   * 
   * @param {Object} material - Selected material object
   */
  const handleMaterialSelect = (material) => {
    setSelectedMaterial(material);
    setActiveMaterialId(material.id);
  };

  /**
   * Handle artwork selection
   * 
   * @param {Object} art - Selected artwork object
   */
  const handleArtworkSelect = (art) => {
    if (!fabricCanvas) return;

    // TODO: Implement artwork insertion logic
    // This would create a Fabric.js Image object and add it to the canvas
    console.log('Selected artwork:', art);
  };

  /**
   * Handle Add Text button
   */
  const handleAddText = () => {
    if (!fabricCanvas) return;

    // TODO: Implement text insertion logic
    // This would create a Fabric.js Text object and add it to the canvas
    console.log('Add text clicked');
  };

  /**
   * Handle Save Project
   * 
   * Critical: Gets all objects from Fabric, converts to inches, and calls onSave
   */
  const handleSave = async () => {
    if (!fabricCanvas || isSaving) return;

    setIsSaving(true);

    try {
      // Get all objects from Fabric canvas
      const objects = fabricCanvas.getObjects();
      
      // Convert each object to design element format
      const designElements = objects.map(obj => {
        const scale = fabricCanvas.width / (initialData.realWorldWidth || 24);
        
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
          element.content = obj.getSrc() || '';
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
        material: selectedMaterial
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
  };

  /**
   * Handle Export to DXF
   */
  const handleExport = async () => {
    if (!fabricCanvas || isExporting) return;

    setIsExporting(true);

    try {
      // TODO: Implement DXF export logic
      console.log('Export to DXF clicked');
      
      // Get all objects from Fabric canvas
      const objects = fabricCanvas.getObjects();
      
      // This would use the dxfExporter utility
      // const dxfContent = exportToDXF(objects, initialData);
      // downloadDXF(dxfContent);
      
    } catch (error) {
      console.error('Error exporting to DXF:', error);
      alert('Failed to export to DXF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle Close
   */
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  /**
   * Handle element update from OptionsPanel
   */
  const handleElementUpdate = (element) => {
    // Element is already updated by OptionsPanel's two-way binding
    // This callback is optional for logging or notifications
    console.log('Element updated:', element);
  };

  // Set default material on mount if available
  React.useEffect(() => {
    if (materials && materials.length > 0 && !selectedMaterial) {
      const defaultMaterial = materials[0];
      setSelectedMaterial(defaultMaterial);
      setActiveMaterialId(defaultMaterial.id);
    }
  }, [materials, selectedMaterial]);

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
      
      {/* Toolbar */}
      <DesignStudioToolbar
        onAddText={handleAddText}
        onSave={handleSave}
        onExport={handleExport}
        onClose={handleClose}
        isSaving={isSaving}
        isExporting={isExporting}
      />

      <div className="design-studio-layout">
        
        {/* Left Sidebar: Material & Artwork */}
        <div className="design-studio-sidebar design-studio-sidebar-left">
          <MaterialPicker
            materials={materials}
            activeMaterialId={activeMaterialId}
            onSelectMaterial={handleMaterialSelect}
          />
          
          <ArtworkLibrary
            artwork={artwork}
            onSelectArtwork={handleArtworkSelect}
          />
        </div>

        {/* Center: Canvas */}
        <div className="design-studio-canvas-container">
          
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

        {/* Right Sidebar: Options Panel */}
        <div className="design-studio-sidebar design-studio-sidebar-right">
          <OptionsPanel
            selectedElement={selectedElement}
            onUpdateElement={handleElementUpdate}
          />
        </div>

      </div>
    </div>
  );
};

export default DesignStudio;

