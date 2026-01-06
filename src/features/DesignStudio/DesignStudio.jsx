/**
 * DesignStudio Component
 * 
 * Central layout manager and orchestrator for the memorial design studio.
 * Manages all state, coordinates child components, and handles user actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FabricImage, FabricText, IText } from 'fabric';
import * as fabric from 'fabric';
// Import fabric namespace with alias to avoid shadowing when 'fabric' is used as canvas variable
const FabricNamespace = fabric;
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { pixelsToInches, calculateScale, inchesToPixels } from './utils/unitConverter';
import DesignStudioToolbar from './components/DesignStudioToolbar';
import MaterialPicker from './components/MaterialPicker';
import ArtworkLibrary from './components/ArtworkLibrary';
import ArtworkTemplatesLibrary from './components/ArtworkTemplatesLibrary';
import OptionsPanel from './components/OptionsPanel';
import exportToDxf, { exportToDxfUnified } from './utils/dxfExporter';
import { captureCombinedCanvas, captureArtworkOnly } from '../../utils/canvasCapture';
import { uploadPreviewImage } from '../../utils/storageService';
import AlertMessage from '../../components/ui/AlertMessage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import productService from '../../services/productService';
import artworkTemplateService from '../../services/artworkTemplateService';
import colorData from '../../data/ColorData';

/**
 * @param {Object} initialData - Template/product data with dimensions, editZones, and designElements
 * @param {Array} materials - Array of material objects from MaterialsData
 * @param {Array} artwork - Array of artwork objects from Supabase
 * @param {Function} onSave - Callback when user saves (receives updated project data)
 * @param {Function} onClose - Callback when user closes the studio
 * @param {Function} onHandlersReady - Optional callback to expose handlers to parent (for AppHeader integration)
 * @param {String} projectTitle - Title of the project to display in header
 * @returns {JSX.Element}
 */
const DesignStudio = ({ initialData, materials = [], artwork = [], onSave, onClose, onHandlersReady, projectTitle, projectId }) => {
  const navigate = useNavigate();
  const params = useParams();
  
  // Get projectId from props or params
  const currentProjectId = projectId || params?.projectId;
  
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
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  // Always default to 'front' on initial load, regardless of saved currentView
  // This ensures the front view is always loaded first
  const [currentView, setCurrentView] = useState(() => {
    // On initial mount, always default to 'front' if available
    const availableViewsList = initialData?.availableViews || ['front'];
    return availableViewsList.includes('front') ? 'front' : (availableViewsList[0] || 'front');
  });
  const [availableViews, setAvailableViews] = useState(initialData?.availableViews || ['front']);
  
  // Local state to store design elements for all views (front, back, top)
  // This allows seamless view switching without database calls
  const [localDesignElements, setLocalDesignElements] = useState(() => {
    // Initialize from initialData on mount
    if (initialData?.designElements) {
      if (Array.isArray(initialData.designElements)) {
        // Old format: array - convert to new format with front view
        return { front: initialData.designElements };
      } else if (typeof initialData.designElements === 'object') {
        // New format: object with view keys - use as-is
        return { ...initialData.designElements };
      }
    }
    return {};
  });
  
  // Debug: Log availableViews when it changes
  useEffect(() => {
    console.log('DesignStudio: availableViews from initialData:', initialData?.availableViews);
    console.log('DesignStudio: current availableViews state:', availableViews);
    if (initialData?.availableViews) {
      setAvailableViews(initialData.availableViews);
    }
  }, [initialData?.availableViews]);
  
  // Initialize local design elements from initialData when it first loads
  useEffect(() => {
    if (initialData?.designElements && Object.keys(localDesignElements).length === 0) {
      if (Array.isArray(initialData.designElements)) {
        setLocalDesignElements({ front: initialData.designElements });
      } else if (typeof initialData.designElements === 'object') {
        setLocalDesignElements({ ...initialData.designElements });
      }
    }
  }, [initialData?.designElements]); // Only run when initialData.designElements changes
  
  const [saveAlert, setSaveAlert] = useState(null);
  const [loadingState, setLoadingState] = useState({ isLoading: false, loaded: 0, total: 0, message: '' });
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [saveTemplateModal, setSaveTemplateModal] = useState({ isOpen: false });
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Check if user is master admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminStatus = await productService.isMasterAdmin();
        setIsMasterAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking master admin status:', error);
        setIsMasterAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

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
  // Callback to handle loading state updates from useFabricCanvas
  const handleLoadingStateChange = useCallback((state) => {
    setLoadingState(state);
  }, []);

  // Create initialData for useFabricCanvas hook
  // IMPORTANT: Pass ALL views' design elements, not just current view
  // The hook needs all views to load them all at once with viewId tags
  const [hookInitialData, setHookInitialData] = useState(() => {
    return {
      ...initialData,
      designElements: initialData?.designElements || {}, // Pass all views' design elements
      currentView
    };
  });

  // Update hook initialData when initialData, currentView, or localDesignElements changes
  useEffect(() => {
    if (!initialData) return;
    
    // Use localDesignElements if available (has user changes), otherwise use initialData.designElements
    const allDesignElements = Object.keys(localDesignElements).length > 0 
      ? localDesignElements 
      : (initialData.designElements || {});
    
    setHookInitialData({
      ...initialData,
      designElements: allDesignElements, // Pass all views' design elements
      currentView
    });
  }, [initialData, currentView, localDesignElements]);

  const fabricFromHook = useFabricCanvas(
    fabricCanvasRef,
    productCanvasRef,
    hookInitialData, // Pass all views' design elements so hook can load them all
    setSelectedElement,
    canvasSize,
    setFabricInstance, // Callback when canvas is ready
    activeMaterial, // Pass active material for product canvas fill
    materials, // Pass materials array for productBase rendering
    handleLoadingStateChange, // Pass loading state callback
    currentView, // Pass current view for visibility management
    artwork // Pass artwork array from Supabase
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
    
    // Determine default color based on selected material
    // If Grey Granite is selected, use black; otherwise use white
    const isGreyGranite = activeMaterial?.name === 'Grey Granite' || activeMaterial?.id === 'mat-002';
    const defaultColor = isGreyGranite ? '#000000' : '#FFFFFF';
    const defaultColorId = isGreyGranite ? 'black' : 'white';
    
    // Create a new text object using IText for inline editing support
    const textObject = new IText('Edit Me', {
      left: fabricInstance.width / 2,
      top: fabricInstance.height / 2,
      fontSize: 20,
      fontFamily: 'Times New Roman',
      fill: defaultColor,
      originX: 'center',
      originY: 'center',
      editable: true, // Enable inline editing
      selectable: true // Allow selection for moving/scaling
    });

    // Store color info in customData for consistency
    textObject.customData = {
      currentColor: defaultColor,
      currentColorId: defaultColorId
    };

    // Add metadata for tracking
    textObject.elementId = `text-${Date.now()}`;
    textObject.viewId = currentView; // Tag with current view for multi-view support
    textObject.zIndex = fabricInstance.getObjects().length; // Set z-index for layer ordering

    // Add to canvas and render
    fabricInstance.add(textObject);
    fabricInstance.setActiveObject(textObject);
    fabricInstance.renderAll();
    
    console.log('Text object added:', textObject);
  }, [fabricInstance, initialData, currentView, activeMaterial]);

  /**
   * Handler: Toggle Artwork Library Visibility
   */
  const handleToggleArtworkLibrary = useCallback(() => {
    setShowArtworkLibrary(prev => !prev);
  }, []);

  /**
   * Handler: Toggle Template Library Visibility
   */
  const handleToggleTemplateLibrary = useCallback(() => {
    setShowTemplateLibrary(prev => !prev);
  }, []);

  /**
   * Handler: Load Template
   * Clears canvas and loads template design elements with material-based colors
   * Manually loads elements since the hook only loads on initial mount
   */
  const handleLoadTemplate = useCallback(async (template) => {
    if (!fabricInstance || !template) return;

    try {
      const fabric = fabricInstance || fabricFromHook;
      if (!fabric) {
        console.error('No fabric instance available');
        return;
      }

      // Change material if template has a material_id
      if (template.material_id) {
        const templateMaterial = materials.find(m => m.id === template.material_id);
        if (templateMaterial) {
          setActiveMaterial(templateMaterial);
          console.log('Changed material to template material:', templateMaterial.name);
        }
      }

      // Get design elements from template
      let designElements = [];
      if (Array.isArray(template.design_elements)) {
        designElements = template.design_elements;
      } else if (template.design_elements && typeof template.design_elements === 'object') {
        // Handle multi-view format - use current view or 'front' as default
        const viewKey = currentView || 'front';
        designElements = template.design_elements[viewKey] || template.design_elements.front || [];
      }

      if (designElements.length === 0) {
        console.warn('Template has no design elements');
        setSaveAlert({
          type: 'warning',
          message: 'Template has no design elements to load'
        });
        setShowTemplateLibrary(false);
        return;
      }

      // Use template's material for color defaults, or fall back to current active material
      const templateMaterial = template.material_id ? materials.find(m => m.id === template.material_id) : activeMaterial;
      const isGreyGranite = templateMaterial?.name === 'Grey Granite' || templateMaterial?.id === 'mat-002';
      const defaultColorId = isGreyGranite ? 'black' : 'white';
      const defaultColor = colorData.find(c => c.id === defaultColorId) || {
        fillColor: isGreyGranite ? '#000000' : '#FFFFFF',
        opacity: 1.0
      };

      // Process design elements to preserve saved colors, only applying defaults if colors are missing
      const processedElements = designElements.map(element => {
        const processed = { ...element };
        
        // Check if this is a text element
        const isTextElement = element.type === 'text' || element.type === 'i-text' || 
                              element.type === 'itext' || element.type === 'textbox';
        
        // For artwork/group/image/path elements, check if they need default colors
        // Skip panel artwork (they shouldn't get default colors)
        const isPanelArtwork = element.category && element.category.toLowerCase() === 'panels';
        const isArtworkElement = element.type === 'artwork' || element.type === 'group' || 
                                  element.type === 'image' || element.type === 'path' ||
                                  (element.imageUrl && element.artworkId);
        
        // For text elements: preserve saved colors, only apply defaults if missing
        if (isTextElement) {
          // Only apply default color if element doesn't have a saved color
          if (!processed.fill || !processed.colorId) {
            processed.fill = processed.fill || defaultColor.fillColor;
            processed.colorId = processed.colorId || defaultColorId;
          }
          if (processed.opacity === undefined) {
            processed.opacity = defaultColor.opacity;
          }
        }
        
        // For artwork elements: preserve saved colors, only apply defaults if missing
        if (isArtworkElement && !isPanelArtwork) {
          // Only apply default color if element doesn't have a saved color
          if (!processed.fill || !processed.colorId) {
            processed.fill = processed.fill || defaultColor.fillColor;
            processed.colorId = processed.colorId || defaultColorId;
          }
          if (processed.opacity === undefined) {
            processed.opacity = defaultColor.opacity;
          }
        }
        
        return processed;
      });

      // Clear canvas manually (except constraint overlay)
      const existingObjects = fabric.getObjects();
      const constraintOverlayObj = existingObjects.find(obj => obj.excludeFromExport === true);
      const objectsToRemove = existingObjects.filter(obj => obj !== constraintOverlayObj);
      if (objectsToRemove.length > 0) {
        fabric.remove(...objectsToRemove);
        fabric.renderAll();
        console.log('Canvas cleared for template load');
      }

      // Show loading state
      setLoadingState({ isLoading: true, loaded: 0, total: processedElements.length, message: 'Loading template...' });

      // Import necessary utilities for loading
      const dxfImporterModule = await import('../../utils/dxfImporter');
      const importDxfToFabric = dxfImporterModule.importDxfToFabric || dxfImporterModule.default;
      
      // Calculate scale for loading - use actual fabric canvas width (may be scaled down for portrait products)
      const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
        ? initialData.canvas.width 
        : (initialData.realWorldWidth || 24);
      const actualCanvasWidth = fabricInstance.width || 1000; // Use actual canvas width (may be < 1000 for portrait)
      const loadScale = calculateScale(canvasWidthInches, actualCanvasWidth);

      // Sort elements by zIndex
      const sortedElements = [...processedElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Load each element manually
      let loadedCount = 0;
      for (const element of sortedElements) {
        try {
          // Use pixel values directly if available
          const baseLeft = element.xPx !== undefined ? element.xPx : inchesToPixels(element.x || 0, loadScale);
          const baseTop = element.yPx !== undefined ? element.yPx : inchesToPixels(element.y || 0, loadScale);

          // Debug logging
          console.log('Loading template element:', {
            id: element.id,
            type: element.type,
            imageUrl: element.imageUrl,
            content: element.content,
            artworkId: element.artworkId,
            isDxfFile: element.isDxfFile,
            hasImageUrl: !!element.imageUrl,
            hasContent: !!element.content,
            allKeys: Object.keys(element)
          });

          if (element.type === 'text' || element.type === 'i-text' || element.type === 'itext' || element.type === 'textbox') {
            // Load text element
            const finalFontSizePx = element.fontSizePx !== undefined 
              ? element.fontSizePx 
              : inchesToPixels(element.fontSize || 12, loadScale);
            
            const textObject = new IText(element.content || 'Text', {
              left: baseLeft,
              top: baseTop,
              fontSize: finalFontSizePx,
              fontFamily: element.font || 'Arial',
              fill: element.fill || defaultColor.fillColor, // Use processed fill (already has default applied)
              opacity: element.opacity !== undefined ? element.opacity : defaultColor.opacity,
              originX: element.originX || 'center',
              originY: element.originY || 'center',
              scaleX: 1,
              scaleY: 1,
              angle: element.rotation || 0,
              editable: true,
              selectable: true,
              viewId: currentView,
              elementId: element.id,
              zIndex: element.zIndex || 0,
              customData: {
                currentColor: element.fill || defaultColor.fillColor, // Use processed fill
                currentColorId: element.colorId || defaultColorId // Use processed colorId
              }
            });
            
            fabric.add(textObject);
            } else if (element.type === 'artwork' || element.type === 'group' || element.type === 'path' || element.type === 'image' || (element.imageUrl && element.artworkId)) {
              // Resolve artworkId first (needed for multiple checks)
              let artworkId = element.artworkId || null;
              if (!artworkId && (element.imageUrl || element.content)) {
                const imageSrcForId = element.imageUrl || element.content;
                const imageUrlMatch = imageSrcForId.match(/artwork\/([^\/]+)\/image-/);
                if (imageUrlMatch && imageUrlMatch[1]) {
                  artworkId = imageUrlMatch[1].trim();
                }
              }
              
              // If we have artworkId but no imageUrl/content, look up the artwork to get imageUrl
              let resolvedImageUrl = element.imageUrl || element.content || null;
              if (!resolvedImageUrl && artworkId && artwork && artwork.length > 0) {
                // Trim artworkId to handle whitespace issues
                const trimmedArtworkId = artworkId.toString().trim();
                console.log('🔍 Looking up artwork:', {
                  elementId: element.id,
                  artworkId: artworkId,
                  trimmedArtworkId: trimmedArtworkId,
                  artworkArrayLength: artwork.length,
                  sampleArtworkIds: artwork.slice(0, 5).map(a => a.id)
                });
                
                const artworkItem = artwork.find(a => {
                  const aId = (a.id || '').toString().trim();
                  return aId === trimmedArtworkId || aId.toLowerCase() === trimmedArtworkId.toLowerCase();
                });
                
                if (artworkItem) {
                  // Check for both camelCase (imageUrl) and snake_case (image_url) properties
                  const imageUrl = artworkItem.imageUrl || artworkItem.image_url;
                  
                  console.log('✓ Found artwork item:', {
                    artworkId: artworkItem.id,
                    hasImageUrl: !!imageUrl,
                    imageUrl: imageUrl,
                    availableProperties: Object.keys(artworkItem)
                  });
                  
                  if (imageUrl) {
                    resolvedImageUrl = imageUrl;
                    console.log('✓ Resolved imageUrl from artwork lookup:', {
                      elementId: element.id,
                      artworkId: trimmedArtworkId,
                      resolvedImageUrl: resolvedImageUrl
                    });
                  } else {
                    console.warn('⚠ Artwork item found but has no imageUrl/image_url:', {
                      elementId: element.id,
                      artworkId: trimmedArtworkId,
                      artworkItem: artworkItem,
                      availableProperties: Object.keys(artworkItem)
                    });
                  }
                } else {
                  console.warn('⚠ Artwork not found in array:', {
                    elementId: element.id,
                    searchedArtworkId: trimmedArtworkId,
                    availableIds: artwork.map(a => (a.id || '').toString().trim()).slice(0, 10)
                  });
                }
              } else if (!resolvedImageUrl && artworkId) {
                console.warn('⚠ Cannot lookup artwork - missing artwork array or artworkId:', {
                  elementId: element.id,
                  artworkId: artworkId,
                  hasArtworkArray: !!artwork,
                  artworkArrayLength: artwork ? artwork.length : 0
                });
              }
              
              // Check if element has imageUrl or content - if not, skip this element (but allow DXF)
              if (!resolvedImageUrl && !element.isDxfFile) {
                console.warn('⚠ Skipping artwork element - no imageUrl, content, or dxfData:', {
                  elementId: element.id,
                  type: element.type,
                  artworkId: artworkId,
                  allKeys: Object.keys(element)
                });
                loadedCount++;
                setLoadingState({ 
                  isLoading: true, 
                  loaded: loadedCount, 
                  total: processedElements.length, 
                  message: `Loading template... (${loadedCount}/${processedElements.length})` 
                });
                continue;
              }
              
              // Set imageSrc here so it's available in all code paths below
              // Use resolvedImageUrl (from artwork lookup) if available, otherwise fall back to element properties
              let imageSrc = resolvedImageUrl || element.imageUrl || element.content;
              
              // Validate that imageSrc is a valid URL, not just an artworkId
              // If imageSrc looks like an artworkId (not a URL), try to resolve it
              if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:') && !imageSrc.startsWith('/') && artworkId && artwork && artwork.length > 0) {
                console.warn('⚠ imageSrc appears to be artworkId, not URL. Attempting to resolve:', {
                  elementId: element.id,
                  imageSrc: imageSrc,
                  artworkId: artworkId
                });
                
                // Try to resolve again if we have artworkId but imageSrc is not a URL
                const trimmedArtworkId = artworkId.toString().trim();
                const artworkItem = artwork.find(a => {
                  const aId = (a.id || '').toString().trim();
                  return aId === trimmedArtworkId || aId.toLowerCase() === trimmedArtworkId.toLowerCase();
                });
                
                if (artworkItem) {
                  const imageUrl = artworkItem.imageUrl || artworkItem.image_url;
                  if (imageUrl) {
                    resolvedImageUrl = imageUrl;
                    imageSrc = imageUrl; // Update imageSrc to the resolved URL
                    console.log('✓ Resolved imageUrl for cloned artwork:', {
                      elementId: element.id,
                      artworkId: trimmedArtworkId,
                      resolvedImageUrl: imageUrl
                    });
                  }
                }
              }
              
              console.log('✓ Artwork element passed initial check, proceeding to load:', {
                elementId: element.id,
                type: element.type,
                hasImageUrl: !!resolvedImageUrl,
                hasContent: !!element.content,
                isDxfFile: !!element.isDxfFile,
                artworkId: artworkId,
                imageSrc: imageSrc
              });
              
              // Load artwork/group element - use the same logic as handleAddArtwork
              // For DXF files, use importDxfToFabric
              if (element.isDxfFile && element.dxfData) {
                // DXF artwork - import using dxfImporter
              // Note: importDxfToFabric adds the group to the canvas automatically
              // We need to remove it first, apply properties, then re-add it
              const textureUrl = element.textureUrl || null;
              const group = await importDxfToFabric({
                dxfString: element.dxfData,
                fabricCanvas: fabric,
                importUnit: 'Inches',
                textureUrl: textureUrl
              });
              
              if (group) {
                // Remove from canvas temporarily to apply properties
                fabric.remove(group);
                
                // Check if group should be flipped (negative scaleX/scaleY indicates flip)
                const groupScaleX = element.scaleX || 1;
                const groupScaleY = element.scaleY || 1;
                const shouldFlipX = groupScaleX < 0;
                const shouldFlipY = groupScaleY < 0;
                const absScaleX = Math.abs(groupScaleX);
                const absScaleY = Math.abs(groupScaleY);
                
                // Apply saved properties
                group.set({
                  left: baseLeft,
                  top: baseTop,
                  scaleX: shouldFlipX ? -absScaleX : absScaleX,
                  scaleY: shouldFlipY ? -absScaleY : absScaleY,
                  angle: element.rotation || 0,
                  opacity: element.opacity !== undefined ? element.opacity : 1,
                  originX: element.originX || 'center',
                  originY: element.originY || 'center',
                  flipX: shouldFlipX, // Set flipX/flipY properties for groups
                  flipY: shouldFlipY,
                  viewId: currentView,
                  elementId: element.id,
                  zIndex: element.zIndex || 0
                });
                
                group.setCoords(); // Force recalculation of coordinates
                
                group.customData = {
                  artworkId: element.artworkId,
                  category: element.category,
                  currentColor: element.fill || defaultColor.fillColor,
                  currentColorId: element.colorId || defaultColorId,
                  imageUrl: element.imageUrl,
                  textureUrl: textureUrl
                };
                
                // Re-add to canvas with updated properties
                fabric.add(group);
              }
            } else if (resolvedImageUrl || element.imageUrl || element.content) {
              // Check if this is panel artwork that needs texture layer
              // Set imageSrc here (may be different from first branch)
              let imageSrc = resolvedImageUrl || element.imageUrl || element.content;
              
              // Validate that imageSrc is a valid URL, not just an artworkId
              // If imageSrc looks like an artworkId (not a URL), try to resolve it
              if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:') && !imageSrc.startsWith('/') && artworkId && artwork && artwork.length > 0) {
                console.warn('⚠ imageSrc appears to be artworkId, not URL. Attempting to resolve:', {
                  elementId: element.id,
                  imageSrc: imageSrc,
                  artworkId: artworkId
                });
                
                // Try to resolve again if we have artworkId but imageSrc is not a URL
                const trimmedArtworkId = artworkId.toString().trim();
                const artworkItem = artwork.find(a => {
                  const aId = (a.id || '').toString().trim();
                  return aId === trimmedArtworkId || aId.toLowerCase() === trimmedArtworkId.toLowerCase();
                });
                
                if (artworkItem) {
                  const imageUrl = artworkItem.imageUrl || artworkItem.image_url;
                  if (imageUrl) {
                    resolvedImageUrl = imageUrl;
                    imageSrc = imageUrl; // Update imageSrc to the resolved URL
                    console.log('✓ Resolved imageUrl for artwork in second branch:', {
                      elementId: element.id,
                      artworkId: trimmedArtworkId,
                      resolvedImageUrl: imageUrl
                    });
                  }
                }
              }
              
              let textureUrl = element.textureUrl || null;
              const isSvg = imageSrc && imageSrc.toLowerCase().endsWith('.svg');
              
              // Resolve artworkId first (needed for multiple checks)
              let artworkId = element.artworkId || null;
              if (!artworkId && imageSrc) {
                const imageUrlMatch = imageSrc.match(/artwork\/([^\/]+)\/image-/);
                if (imageUrlMatch && imageUrlMatch[1]) {
                  artworkId = imageUrlMatch[1].trim();
                }
              }
              
              // Detect panel artwork by category or artworkId (even without textureUrl)
              const isPanelArtwork = (element.category && element.category.toLowerCase() === 'panels') ||
                                     (artworkId && artworkId.toString().toLowerCase().includes('panel'));
              
              // If it's panel artwork but no textureUrl, try to resolve it from artwork data
              if (isPanelArtwork && !textureUrl && element.artworkId) {
                const artworkItem = artwork.find(a => {
                  const aId = (a.id || '').toString().trim();
                  const eId = element.artworkId.toString().trim();
                  return aId === eId || aId.toLowerCase() === eId.toLowerCase();
                });
                if (artworkItem) {
                  textureUrl = artworkItem.textureUrl || null;
                  if (!textureUrl && artworkItem.category && artworkItem.category.toLowerCase() === 'panels') {
                    textureUrl = '/images/materials/panelbg.png';
                  }
                }
              }
              
              // If still no textureUrl but it's panel artwork, use default
              if (isPanelArtwork && !textureUrl) {
                textureUrl = '/images/materials/panelbg.png';
              }
              
              // Handle panel artwork with texture layer (same logic as project load)
              if (isSvg && isPanelArtwork && textureUrl) {
                console.log('Detected panel artwork SVG with texture, loading with texture layer:', {
                  elementId: element.id,
                  imageUrl: imageSrc,
                  textureUrl: textureUrl,
                  artworkId: element.artworkId
                });
                
                try {
                  // Get artworkId from element
                  let artworkId = element.artworkId || null;
                  
                  if (!artworkId && imageSrc) {
                    const imageUrlMatch = imageSrc.match(/artwork\/([^\/]+)\/image-/);
                    if (imageUrlMatch && imageUrlMatch[1]) {
                      artworkId = imageUrlMatch[1].trim();
                    }
                  }
                  
                  // Look up artwork data to get textureUrl if not provided
                  let resolvedTextureUrl = textureUrl;
                  if (!resolvedTextureUrl && artworkId) {
                    const artworkItem = artwork.find(a => {
                      const aId = (a.id || '').toString().trim();
                      const eId = artworkId.toString().trim();
                      return aId === eId || aId.toLowerCase() === eId.toLowerCase();
                    });
                    if (artworkItem) {
                      resolvedTextureUrl = artworkItem.textureUrl || null;
                      if (!resolvedTextureUrl && artworkItem.category && artworkItem.category.toLowerCase() === 'panels') {
                        resolvedTextureUrl = '/images/materials/panelbg.png';
                      }
                    }
                  }
                  
                  if (!resolvedTextureUrl && element.category && element.category.toLowerCase() === 'panels') {
                    resolvedTextureUrl = '/images/materials/panelbg.png';
                  }
                  
                  if (!resolvedTextureUrl) {
                    console.warn('Panel artwork missing textureUrl, skipping texture layer:', {
                      elementId: element.id,
                      artworkId: artworkId
                    });
                    // Fall through to regular image loading
                  } else {
                    // Fetch SVG content
                    const response = await fetch(imageSrc);
                    if (!response.ok) {
                      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
                    }
                    const svgString = await response.text();
                    
                    // Load SVG into Fabric.js as objects
                    // Use FabricNamespace (imported at top) to avoid shadowing from 'fabric' canvas variable
                    let loadResult;
                    try {
                      // Try Promise-based API first
                      loadResult = await FabricNamespace.loadSVGFromString(svgString);
                    } catch (promiseErr) {
                      // Fallback to callback-based API
                      loadResult = await new Promise((resolve, reject) => {
                        FabricNamespace.loadSVGFromString(svgString, (objects, options) => {
                          if (objects && objects.length > 0) {
                            resolve({ objects, options });
                          } else {
                            reject(new Error('No objects loaded from SVG (callback)'));
                          }
                        }, (err) => {
                          reject(err || new Error('Failed to load SVG'));
                        });
                      });
                    }
                    
                    const svgObjects = loadResult.objects || loadResult;
                    const svgOptions = loadResult.options || {};
                    const objectsArray = Array.isArray(svgObjects) ? svgObjects : [svgObjects].filter(Boolean);
                    
                    if (objectsArray.length === 0) {
                      throw new Error('No objects loaded from SVG');
                    }
                    
                    // Create a group from SVG objects
                    // Use FabricNamespace to avoid shadowing from 'fabric' canvas variable
                    let svgGroup = objectsArray.length === 1 
                      ? objectsArray[0] 
                      : new FabricNamespace.Group(objectsArray, svgOptions || {});
                    
                    // Normalize stroke widths
                    const normalizeStrokes = (obj) => {
                      if (obj.type === 'path' || obj.type === 'path-group') {
                        obj.stroke = null;
                        obj.strokeWidth = 0;
                      }
                      if (obj._objects && Array.isArray(obj._objects)) {
                        obj._objects.forEach(child => normalizeStrokes(child));
                      }
                    };
                    normalizeStrokes(svgGroup);
                    
                    // Apply saved fill color
                    if (element.fill) {
                      const applyFill = (obj, fillColor) => {
                        if (obj.type === 'path' || obj.type === 'path-group') {
                          obj.fill = fillColor;
                        }
                        if (obj._objects && Array.isArray(obj._objects)) {
                          obj._objects.forEach(child => applyFill(child, fillColor));
                        }
                      };
                      applyFill(svgGroup, element.fill);
                    }
                    
                    // Set origin before getting bounds
                    const finalOriginX = element.originX || 'center';
                    const finalOriginY = element.originY || 'center';
                    svgGroup.set({
                      originX: finalOriginX,
                      originY: finalOriginY
                    });
                    svgGroup.setCoords();
                    
                    let finalGroup = svgGroup;
                    
                    // Create texture layer if we have a texture URL
                    if (resolvedTextureUrl) {
                      try {
                        const textureImgResult = FabricImage.fromURL(resolvedTextureUrl, { crossOrigin: 'anonymous' });
                        let textureImg;
                        
                        if (textureImgResult && typeof textureImgResult.then === 'function') {
                          textureImg = await textureImgResult;
                        } else {
                          textureImg = await new Promise((resolve, reject) => {
                            FabricImage.fromURL(resolvedTextureUrl, (loadedImg) => {
                              if (loadedImg) {
                                resolve(loadedImg);
                              } else {
                                reject(new Error('Failed to load texture image'));
                              }
                            }, { crossOrigin: 'anonymous' });
                          });
                        }
                        
                        if (textureImg) {
                          const svgBounds = svgGroup.getBoundingRect();
                          const svgWidth = svgBounds.width;
                          const svgHeight = svgBounds.height;
                          
                          // Scale texture to fit SVG bounds
                          const scaleX = svgWidth / textureImg.width;
                          const scaleY = svgHeight / textureImg.height;
                          const textureScale = Math.min(scaleX, scaleY);
                          
                          textureImg.set({
                            left: svgBounds.left,
                            top: svgBounds.top,
                            scaleX: textureScale,
                            scaleY: textureScale,
                            originX: 'left',
                            originY: 'top',
                            selectable: false,
                            evented: false
                          });
                          
                          // Create group with texture first, then SVG on top
                          // Use FabricNamespace to avoid shadowing from 'fabric' canvas variable
                          finalGroup = new FabricNamespace.Group([textureImg, svgGroup], {
                            originX: finalOriginX,
                            originY: finalOriginY
                          });
                        }
                      } catch (textureErr) {
                        console.error('Error creating texture layer for panel artwork:', textureErr);
                        // Continue with SVG group only
                      }
                    }
                    
                    // Ensure object dimensions are calculated before applying position
                    finalGroup.setCoords();
                    
                    // Check if flip state was saved (negative scaleX/scaleY indicates flip)
                    const savedScaleX = element.scaleX !== undefined ? element.scaleX : 1;
                    const savedScaleY = element.scaleY !== undefined ? element.scaleY : 1;
                    const shouldFlipX = savedScaleX < 0;
                    const shouldFlipY = savedScaleY < 0;
                    const absScaleX = Math.abs(savedScaleX);
                    const absScaleY = Math.abs(savedScaleY);
                    
                    // Recalculate scale if widthPx/heightPx are available
                    let finalScaleX = absScaleX;
                    let finalScaleY = absScaleY;
                    
                    if (element.widthPx && element.heightPx) {
                      const groupBounds = finalGroup.getBoundingRect();
                      if (groupBounds.width > 0 && groupBounds.height > 0) {
                        finalScaleX = element.widthPx / groupBounds.width;
                        finalScaleY = element.heightPx / groupBounds.height;
                      }
                    }
                    
                    // Apply saved properties - set scale/origin first, then position
                    finalGroup.set({
                      scaleX: shouldFlipX ? -finalScaleX : finalScaleX,
                      scaleY: shouldFlipY ? -finalScaleY : finalScaleY,
                      angle: element.rotation || 0,
                      opacity: element.opacity !== undefined ? element.opacity : 1,
                      originX: finalOriginX,
                      originY: finalOriginY,
                      flipX: shouldFlipX,
                      flipY: shouldFlipY
                    });
                    
                    // Update coordinates after setting scale/origin
                    finalGroup.setCoords();
                    
                    // Now set position after dimensions are calculated
                    finalGroup.set({
                      left: baseLeft,
                      top: baseTop
                    });
                    
                    // Final coordinate update to ensure position is correct
                    finalGroup.setCoords();
                    
                    // Set metadata
                    finalGroup.elementId = element.id;
                    finalGroup.artworkId = artworkId;
                    finalGroup.imageUrl = imageSrc;
                    finalGroup.viewId = currentView;
                    finalGroup.zIndex = element.zIndex || 0;
                    
                    finalGroup.customData = {
                      artworkId: artworkId,
                      category: element.category,
                      currentColor: element.fill || defaultColor.fillColor,
                      currentColorId: element.colorId || defaultColorId,
                      imageUrl: imageSrc,
                      textureUrl: resolvedTextureUrl
                    };
                    
                    fabric.add(finalGroup);
                    console.log('Panel artwork with texture loaded successfully:', {
                      elementId: element.id,
                      artworkId: artworkId,
                      hasTexture: !!resolvedTextureUrl
                    });
                    
                    // Skip to next element (don't load as regular image)
                    loadedCount++;
                    setLoadingState({ 
                      isLoading: true, 
                      loaded: loadedCount, 
                      total: processedElements.length, 
                      message: `Loading template... (${loadedCount}/${processedElements.length})` 
                    });
                    continue;
                  }
                } catch (panelErr) {
                  console.error('Error loading panel artwork with texture:', panelErr);
                  // Fall through to regular image loading as fallback
                }
              }
              
              // Regular image/artwork - load as image
              // imageSrc is already declared above, so we can use it here
              console.log('Loading artwork element:', {
                elementId: element.id,
                type: element.type,
                imageSrc: imageSrc,
                artworkId: element.artworkId,
                category: element.category,
                fill: element.fill,
                colorId: element.colorId
              });
              
              if (!imageSrc) {
                console.warn('No imageUrl or content found for artwork element:', element);
                loadedCount++;
                setLoadingState({ 
                  isLoading: true, 
                  loaded: loadedCount, 
                  total: processedElements.length, 
                  message: `Loading template... (${loadedCount}/${processedElements.length})` 
                });
                continue;
              }
              
              // Check if this is SVG artwork that needs color modification
              // Resolve artworkId if not already resolved
              let artworkIdForColor = element.artworkId || null;
              if (!artworkIdForColor && imageSrc) {
                const imageUrlMatch = imageSrc.match(/artwork\/([^\/]+)\/image-/);
                if (imageUrlMatch && imageUrlMatch[1]) {
                  artworkIdForColor = imageUrlMatch[1].trim();
                }
              }
              
              const isSvgArtwork = imageSrc && imageSrc.toLowerCase().endsWith('.svg');
              const isPanelArtworkForColor = (element.category && element.category.toLowerCase() === 'panels') ||
                                            (artworkIdForColor && artworkIdForColor.toString().toLowerCase().includes('panel'));
              
              let appliedColor = element.fill || defaultColor.fillColor;
              let appliedColorId = element.colorId || defaultColorId;
              
              let img;
              try {
                // For SVG files, load as SVG objects (same as handleAddArtwork) to avoid rectangular border
                if (isSvgArtwork) {
                  console.log('Loading SVG artwork as SVG objects (template):', imageSrc);
                  
                  // Fetch SVG content
                  const response = await fetch(imageSrc);
                  if (!response.ok) {
                    throw new Error(`Failed to fetch SVG: ${response.statusText}`);
                  }
                  const svgString = await response.text();
                  
                  // Load SVG into Fabric.js as objects (same as handleAddArtwork)
                  let loadResult;
                  try {
                    loadResult = await FabricNamespace.loadSVGFromString(svgString);
                  } catch (promiseErr) {
                    // Fallback to callback-based API
                    loadResult = await new Promise((resolve, reject) => {
                      FabricNamespace.loadSVGFromString(svgString, (objects, options) => {
                        if (objects && objects.length > 0) {
                          resolve({ objects, options });
                        } else {
                          reject(new Error('No objects loaded from SVG (callback)'));
                        }
                      }, (err) => {
                        reject(err || new Error('Failed to load SVG'));
                      });
                    });
                  }
                  
                  const svgObjects = loadResult.objects || loadResult;
                  const svgOptions = loadResult.options || {};
                  const objectsArray = Array.isArray(svgObjects) ? svgObjects : [svgObjects].filter(Boolean);
                  
                  if (objectsArray.length === 0) {
                    throw new Error('No objects loaded from SVG');
                  }
                  
                  // Create a group from SVG objects
                  const svgGroup = objectsArray.length === 1 
                    ? objectsArray[0] 
                    : new FabricNamespace.Group(objectsArray, svgOptions || {});
                  
                  // Normalize stroke widths on all paths (remove strokes, set strokeWidth to 0)
                  // This prevents thick strokes on SVG paths
                  const normalizeStrokes = (obj) => {
                    if (obj.type === 'group' && obj._objects) {
                      obj._objects.forEach(child => normalizeStrokes(child));
                    } else if (obj.type === 'path' || obj.type === 'polyline' || obj.type === 'polygon') {
                      obj.set({
                        stroke: null,
                        strokeWidth: 0
                      });
                    }
                  };
                  normalizeStrokes(svgGroup);
                  
                  // Apply default color to non-panel SVG artwork (same as handleAddArtwork)
                  if (!isPanelArtworkForColor) {
                    const applyDefaultColor = (obj) => {
                      if (obj.type === 'group' && obj._objects) {
                        obj._objects.forEach(child => applyDefaultColor(child));
                      } else if (obj.type === 'path' || obj.type === 'polyline' || obj.type === 'polygon') {
                        obj.set({
                          fill: appliedColor,
                          opacity: element.opacity !== undefined ? element.opacity : 1,
                          stroke: null,
                          strokeWidth: 0
                        });
                      }
                    };
                    
                    applyDefaultColor(svgGroup);
                    console.log('Applied default color to SVG artwork (template):', {
                      elementId: element.id,
                      artworkId: artworkId,
                      color: appliedColor,
                      colorId: appliedColorId
                    });
                  }
                  
                  img = svgGroup; // Use the SVG group instead of rasterized image
                } else {
                  // Load regular image files (PNG, JPG, etc.) as rasterized images
                  const imgResult = FabricImage.fromURL(imageSrc, { crossOrigin: 'anonymous' });
                  
                  if (imgResult && typeof imgResult.then === 'function') {
                    // Promise-based API
                    img = await imgResult;
                  } else {
                    // Callback-based API
                    img = await new Promise((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        reject(new Error(`Image loading timeout for ${imageSrc}`));
                      }, 30000);
                      
                      FabricImage.fromURL(imageSrc, (loadedImg) => {
                        clearTimeout(timeout);
                        if (loadedImg) {
                          resolve(loadedImg);
                        } else {
                          reject(new Error(`Failed to load image: ${imageSrc}`));
                        }
                      }, { crossOrigin: 'anonymous' });
                    });
                  }
                }
              } catch (imgError) {
                console.error(`Failed to load image for element ${element.id}:`, imgError);
                console.error('Image source:', imageSrc);
                // Skip this element and continue with others
                loadedCount++;
                setLoadingState({ 
                  isLoading: true, 
                  loaded: loadedCount, 
                  total: processedElements.length, 
                  message: `Loading template... (${loadedCount}/${processedElements.length})` 
                });
                continue;
              }
              
              if (img) {
                // Get saved scale values FIRST (may be negative to indicate flip)
                const savedScaleX = element.scaleX !== undefined ? element.scaleX : 1;
                const savedScaleY = element.scaleY !== undefined ? element.scaleY : 1;
                
                // Check if image should be flipped BEFORE recalculating scale
                // Negative scaleX/scaleY indicates flip state
                const shouldFlipX = savedScaleX < 0;
                const shouldFlipY = savedScaleY < 0;
                
                // Calculate scale if widthPx/heightPx are available
                // Use absolute values for calculation, then apply flip state
                let absScaleX = Math.abs(savedScaleX);
                let absScaleY = Math.abs(savedScaleY);
                
                if (element.widthPx && element.heightPx && img.width && img.height) {
                  // Recalculate scale but preserve flip state from saved values
                  absScaleX = element.widthPx / img.width;
                  absScaleY = element.heightPx / img.height;
                }
                
                console.log('Loading artwork image with flip state:', {
                  elementId: element.id,
                  savedScaleX: savedScaleX,
                  savedScaleY: savedScaleY,
                  shouldFlipX: shouldFlipX,
                  shouldFlipY: shouldFlipY,
                  absScaleX: absScaleX,
                  absScaleY: absScaleY,
                  finalScaleX: shouldFlipX ? -absScaleX : absScaleX,
                  finalScaleY: shouldFlipY ? -absScaleY : absScaleY,
                  isSvgGroup: img.type === 'group'
                });
                
                img.set({
                  left: baseLeft,
                  top: baseTop,
                  scaleX: shouldFlipX ? -absScaleX : absScaleX,
                  scaleY: shouldFlipY ? -absScaleY : absScaleY,
                  angle: element.rotation || 0,
                  opacity: element.opacity !== undefined ? element.opacity : 1,
                  originX: element.originX || 'center',
                  originY: element.originY || 'center',
                  flipX: shouldFlipX, // Set flipX/flipY properties
                  flipY: shouldFlipY,
                  viewId: currentView,
                  elementId: element.id,
                  zIndex: element.zIndex || 0
                });
                
                img.setCoords(); // Force recalculation of coordinates
                
                // Verify flip state was applied correctly
                const verifyScaleX = img.scaleX || img.get('scaleX');
                const verifyScaleY = img.scaleY || img.get('scaleY');
                const verifyFlipX = img.flipX || img.get('flipX');
                const verifyFlipY = img.flipY || img.get('flipY');
                
                console.log('Image flip state after set:', {
                  elementId: element.id,
                  scaleX: verifyScaleX,
                  scaleY: verifyScaleY,
                  flipX: verifyFlipX,
                  flipY: verifyFlipY,
                  isFlippedX: verifyFlipX || verifyScaleX < 0,
                  isFlippedY: verifyFlipY || verifyScaleY < 0
                });
                
                // If Fabric.js normalized the negative scale, apply CSS transform as fallback
                if (shouldFlipX && verifyScaleX > 0 && !verifyFlipX) {
                  console.warn('Fabric.js normalized negative scaleX, applying CSS transform fallback');
                  const imgElement = img._element || img.getElement();
                  if (imgElement) {
                    imgElement.style.transform = `scaleX(-1)`;
                  }
                  // Also try setting flipX again
                  img.set({ flipX: true });
                }
                if (shouldFlipY && verifyScaleY > 0 && !verifyFlipY) {
                  console.warn('Fabric.js normalized negative scaleY, applying CSS transform fallback');
                  const imgElement = img._element || img.getElement();
                  if (imgElement) {
                    const currentTransform = imgElement.style.transform || '';
                    imgElement.style.transform = currentTransform ? `${currentTransform} scaleY(-1)` : `scaleY(-1)`;
                  }
                  // Also try setting flipY again
                  img.set({ flipY: true });
                }
                
                img.customData = {
                  artworkId: element.artworkId,
                  category: element.category,
                  currentColor: appliedColor,
                  currentColorId: appliedColorId,
                  imageUrl: imageSrc, // Store original URL, not modified data URL
                  originalSource: imageSrc // Also store as originalSource for backward compatibility
                };
                
                fabric.add(img);
              }
            }
          }
          
          loadedCount++;
          setLoadingState({ 
            isLoading: true, 
            loaded: loadedCount, 
            total: processedElements.length, 
            message: `Loading template... (${loadedCount}/${processedElements.length})` 
          });
        } catch (err) {
          console.error(`Error loading element ${element.id}:`, err);
          console.error('Element data:', {
            type: element.type,
            id: element.id,
            imageUrl: element.imageUrl,
            content: element.content,
            artworkId: element.artworkId,
            isDxfFile: element.isDxfFile,
            scaleX: element.scaleX,
            scaleY: element.scaleY
          });
          // Continue loading other elements even if one fails
        }
      }

      // Reorder by zIndex - remove all objects, sort, then re-add in order
      const allObjects = fabric.getObjects().filter(obj => !obj.excludeFromExport);
      const constraintOverlay = fabric.getObjects().find(obj => obj.excludeFromExport === true);
      
      // Remove all design objects (keep constraint overlay)
      if (allObjects.length > 0) {
        fabric.remove(...allObjects);
      }
      
      // Sort by zIndex
      allObjects.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      // Re-add objects in sorted order (constraint overlay stays at bottom)
      allObjects.forEach((obj) => {
        fabric.add(obj);
      });

      fabric.renderAll();

      // Update local design elements state
      setLocalDesignElements({ [currentView]: processedElements });

      // Update hookInitialData for consistency
      // IMPORTANT: Preserve original initialData properties (imageUrl, floral, etc.) to prevent product canvas redraw
      // Only update designElements, don't change other properties that would trigger product canvas redraw
      const updatedHookInitialData = {
        ...initialData, // Preserve original initialData (template image, floral, etc.)
        ...hookInitialData, // Preserve any existing hook state
        designElements: { [currentView]: processedElements }, // Update only design elements
        canvasDimensions: template.customizations?.canvasDimensions || initialData?.canvasDimensions || hookInitialData?.canvasDimensions || null
      };
      setHookInitialData(updatedHookInitialData);

      // Close template library
      setShowTemplateLibrary(false);

      // Clear loading state
      setLoadingState({ isLoading: false, loaded: 0, total: 0, message: '' });

      setSaveAlert({
        type: 'success',
        message: `Template "${template.name}" loaded successfully`
      });

    } catch (error) {
      console.error('Error loading template:', error);
      setLoadingState({ isLoading: false, loaded: 0, total: 0, message: '' });
      setSaveAlert({
        type: 'danger',
        message: 'Failed to load template. Please try again.'
      });
    }
  }, [fabricInstance, fabricFromHook, activeMaterial, materials, setActiveMaterial, currentView, hookInitialData, initialData, calculateScale, inchesToPixels, artwork]);

  // Auto-load default template for new projects (only when created via wizard)
  // This effect runs after handleLoadTemplate is defined
  const hasAutoLoadedDefaultTemplate = useRef(false);
  useEffect(() => {
    // Only auto-load if:
    // 1. We haven't already auto-loaded
    // 2. Fabric instance is ready
    // 3. Initial data is loaded
    // 4. Default template ID exists
    // 5. This is a new project creation (isNewProject flag from navigation state)
    // 6. handleLoadTemplate is available
    // 7. There are NO existing design elements (project hasn't been saved yet)
    if (hasAutoLoadedDefaultTemplate.current) return;
    if (!fabricInstance) return;
    if (!initialData) return;
    if (!initialData.defaultTemplateId) return;
    if (!initialData.isNewProject) return; // Only auto-load for new projects created via wizard
    if (!handleLoadTemplate) return;
    
    // Check if there are any existing design elements
    // If there are saved elements, don't auto-load (project has been saved before)
    const designElements = initialData.designElements || {};
    const hasExistingElements = Object.keys(designElements).some(viewKey => {
      const elements = designElements[viewKey];
      return Array.isArray(elements) && elements.length > 0;
    });
    
    if (hasExistingElements) {
      console.log('Skipping auto-load: Project already has saved design elements');
      hasAutoLoadedDefaultTemplate.current = true; // Mark as handled to prevent future attempts
      return;
    }

    // Project is new (from wizard) and has no saved elements - auto-load the default template
    const loadDefaultTemplate = async () => {
      try {
        console.log('Auto-loading default template for new project:', initialData.defaultTemplateId);
        hasAutoLoadedDefaultTemplate.current = true; // Set immediately to prevent duplicate loads
        
        const result = await artworkTemplateService.getTemplateById(initialData.defaultTemplateId);
        if (result.success && result.data) {
          console.log('Default template loaded successfully:', result.data.name);
          // Use handleLoadTemplate to load the template
          await handleLoadTemplate(result.data);
        } else {
          console.warn('Failed to load default template:', result.error);
          hasAutoLoadedDefaultTemplate.current = false; // Reset on failure so it can retry
        }
      } catch (error) {
        console.error('Error auto-loading default template:', error);
        hasAutoLoadedDefaultTemplate.current = false; // Reset on error so it can retry
      }
    };

    loadDefaultTemplate();
  }, [fabricInstance, initialData, handleLoadTemplate]); // Depend on fabricInstance, initialData, and handleLoadTemplate

  /**
   * Handler: Add Artwork
   */
  const handleAddArtwork = useCallback(async (art) => {
    if (!fabricInstance || !art || !initialData) return;

        console.log('Adding artwork:', art);
        if (art.minWidth) {
          console.log('Artwork has minWidth constraint:', { artworkId: art.id, minWidth: art.minWidth });
        }
    
    // Handle image artwork (including SVG files)
      try {
        // Check if this is an SVG file - if so, load it as SVG objects instead of image
        const isSvgFile = art.imageUrl && art.imageUrl.toLowerCase().endsWith('.svg');
        
        let img;
        if (isSvgFile) {
          // Load SVG as SVG objects (not rasterized image) for better scaling and stroke control
          console.log('Loading SVG artwork as SVG objects:', art.imageUrl);
          
          // Fetch the SVG content
          const response = await fetch(art.imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG file: ${response.statusText}`);
          }
          const svgString = await response.text();
          
          // Load SVG into Fabric.js as objects
          const loadResult = await fabric.loadSVGFromString(svgString);
          const svgObjects = loadResult.objects || loadResult;
          const svgOptions = loadResult.options || {};
          
          const objectsArray = Array.isArray(svgObjects) ? svgObjects : [svgObjects].filter(Boolean);
          
          if (objectsArray.length === 0) {
            throw new Error('No objects loaded from SVG');
          }
          
          // Create a group from SVG objects
          const svgGroup = objectsArray.length === 1 
            ? objectsArray[0] 
            : new fabric.Group(objectsArray, svgOptions || {});
          
          // Normalize stroke widths on all paths (remove strokes, set strokeWidth to 0)
          // This prevents thick strokes on SVG paths
          const normalizeStrokes = (obj) => {
            if (obj.type === 'group' && obj._objects) {
              obj._objects.forEach(child => normalizeStrokes(child));
            } else if (obj.type === 'path' || obj.type === 'polyline' || obj.type === 'polygon') {
              obj.set({
                stroke: null,
                strokeWidth: 0
              });
            }
          };
          normalizeStrokes(svgGroup);
          
          // Apply default color to non-panel SVG artwork based on selected material
          // Check if this is panel artwork - panels should not get default fill
          const isPanelArtwork = art.category && art.category.toLowerCase() === 'panels';
          
          if (!isPanelArtwork) {
            // Determine default color based on selected material
            // If Grey Granite is selected, use black; otherwise use white
            const isGreyGranite = activeMaterial?.name === 'Grey Granite' || activeMaterial?.id === 'mat-002';
            const defaultColorId = isGreyGranite ? 'black' : 'white';
            const defaultColor = colorData.find(c => c.id === defaultColorId) || {
              fillColor: isGreyGranite ? '#000000' : '#FFFFFF',
              opacity: 1.0,
              strokeColor: '#000000',
              strokeWidth: 0
            };
            
            // Apply default color fill to all paths in the SVG group
            const applyDefaultColor = (obj) => {
              if (obj.type === 'group' && obj._objects) {
                obj._objects.forEach(child => applyDefaultColor(child));
              } else if (obj.type === 'path' || obj.type === 'polyline' || obj.type === 'polygon') {
                obj.set({
                  fill: defaultColor.fillColor,
                  opacity: defaultColor.opacity,
                  stroke: null,
                  strokeWidth: 0
                });
              }
            };
            
            applyDefaultColor(svgGroup);
            console.log(`Applied default ${defaultColorId} color to SVG artwork:`, art.name);
          }
          
          // Handle texture layer for SVG artwork
          // Apply default texture for panel artwork if not specified
          let textureUrl = art.textureUrl || null;
          if (!textureUrl && art.category && art.category.toLowerCase() === 'panels') {
            textureUrl = '/images/materials/panelbg.png';
            console.log('Applied default panel texture:', textureUrl);
          }
          
          let finalGroup = svgGroup;
          if (textureUrl && textureUrl.trim()) {
            console.log('Creating texture layer for SVG artwork:', {
              name: art.name,
              category: art.category,
              textureUrl: textureUrl
            });
            
            try {
              // Get SVG group bounds to size the texture image
              // First, ensure SVG group is at origin for accurate bounds calculation
              svgGroup.set({
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top'
              });
              svgGroup.setCoords();
              
              const svgBounds = svgGroup.getBoundingRect();
              console.log('SVG group bounds:', svgBounds);
              
              // Load texture image as a regular Fabric.js Image (not a pattern fill)
              // IMPORTANT: Use crossOrigin: 'anonymous' to prevent CORS/tainted canvas issues
              let textureImage;
              const textureImageResult = FabricImage.fromURL(textureUrl, { crossOrigin: 'anonymous' });
              
              if (textureImageResult && typeof textureImageResult.then === 'function') {
                // Promise-based API (Fabric.js v6)
                textureImage = await textureImageResult;
              } else {
                // Callback-based API (fallback)
                textureImage = await new Promise((resolve, reject) => {
                  FabricImage.fromURL(textureUrl, (loadedImg) => {
                    if (loadedImg) {
                      resolve(loadedImg);
                    } else {
                      reject(new Error('Failed to load texture image'));
                    }
                  }, { crossOrigin: 'anonymous' });
                });
              }
              
              if (!textureImage) {
                throw new Error('Failed to load texture image');
              }
              
              // Ensure the underlying image element has crossOrigin set
              const imageElement = textureImage.getElement();
              if (imageElement && !imageElement.crossOrigin) {
                imageElement.crossOrigin = 'anonymous';
                console.log('Set crossOrigin on texture image element');
              }
              
              console.log('Texture image loaded:', {
                width: textureImage.width,
                height: textureImage.height,
                naturalWidth: imageElement?.naturalWidth,
                naturalHeight: imageElement?.naturalHeight,
                crossOrigin: imageElement?.crossOrigin
              });
              
              // Calculate scale to fit texture image WITHIN SVG bounds (not extending beyond)
              // Use Math.min to ensure texture fits inside, not Math.max which would extend beyond
              const scaleX = svgBounds.width / textureImage.width;
              const scaleY = svgBounds.height / textureImage.height;
              
              // Use the smaller scale to ensure the image fits within the bounds
              // This prevents the texture from extending beyond the SVG
              const scale = Math.min(scaleX, scaleY);
              
              // Calculate scaled dimensions
              const scaledWidth = textureImage.width * scale;
              const scaledHeight = textureImage.height * scale;
              
              // Position texture image at SVG bounds origin (relative to group)
              // This ensures texture starts at the same point as the SVG
              const textureLeft = svgBounds.left;
              const textureTop = svgBounds.top;
              
              // Set texture image properties
              textureImage.set({
                left: textureLeft,
                top: textureTop,
                scaleX: scale,
                scaleY: scale,
                originX: 'left',
                originY: 'top',
                selectable: false,
                evented: false,
                visible: true,
                opacity: 1
              });
              textureImage.setCoords();
              
              // Verify texture bounds don't extend beyond SVG bounds
              const textureBounds = textureImage.getBoundingRect();
              const textureRight = textureBounds.left + textureBounds.width;
              const textureBottom = textureBounds.top + textureBounds.height;
              const svgRight = svgBounds.left + svgBounds.width;
              const svgBottom = svgBounds.top + svgBounds.height;
              
              console.log('Texture image positioned and scaled:', {
                left: textureImage.left,
                top: textureImage.top,
                scaleX: textureImage.scaleX,
                scaleY: textureImage.scaleY,
                scaledWidth: scaledWidth,
                scaledHeight: scaledHeight,
                svgBounds: svgBounds,
                textureBounds: textureBounds,
                extendsBeyond: {
                  right: textureRight > svgRight,
                  bottom: textureBottom > svgBottom
                }
              });
              
              // Create final group with texture image (bottom) and color layer (top)
              // Both positioned relative to group origin
              finalGroup = new fabric.Group([textureImage, svgGroup], {
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top',
                selectable: true,
                objectCaching: false
              });
              
              // The group's bounds will be automatically calculated from its children
              // Since we're using Math.min for scaling, the texture should fit within SVG bounds
              // and the group bounds should match the SVG bounds (the larger of the two)
              finalGroup.setCoords();
              
              // Store texture URL in customData
              finalGroup.textureUrl = textureUrl;
              finalGroup.dirty = true;
              
              const finalGroupBounds = finalGroup.getBoundingRect();
              
              console.log('Created texture layer group for SVG artwork:', {
                textureLayerType: textureImage.type,
                colorLayerType: svgGroup.type,
                finalGroupType: finalGroup.type,
                childrenCount: finalGroup._objects?.length,
                textureImageBounds: textureBounds,
                colorGroupBounds: svgGroup.getBoundingRect(),
                finalGroupBounds: finalGroupBounds,
                svgBounds: svgBounds,
                boundsMatch: Math.abs(finalGroupBounds.width - svgBounds.width) < 0.1 && 
                            Math.abs(finalGroupBounds.height - svgBounds.height) < 0.1
              });
            } catch (textureError) {
              console.error('Error creating texture layer for SVG:', textureError);
              // Continue without texture layer if it fails
              finalGroup = svgGroup;
            }
          } else {
            console.log('No texture URL for SVG artwork:', {
              name: art.name,
              category: art.category,
              hasTextureUrl: !!art.textureUrl,
              textureUrl: art.textureUrl
            });
          }
          
          img = finalGroup; // Use the final group (with or without texture layer)
        } else {
          // Load regular image files (PNG, JPG, etc.)
          // Fabric v6 uses fromURL as a Promise-based static method
          img = await FabricImage.fromURL(art.imageUrl);
        }
        
        if (!img) {
          console.error('Failed to load artwork:', art.imageUrl);
          return;
        }

        console.log('Artwork loaded successfully:', {
          type: img.type,
          width: img.width,
          height: img.height,
          imageUrl: art.imageUrl,
          isSvg: isSvgFile
        });

        // Calculate scale factor based on template dimensions
        const realWorldWidth = initialData.realWorldWidth || 24; // inches
        const canvasWidth = fabricInstance.width || 800;
        const scale = calculateScale(realWorldWidth, canvasWidth);
        
        // Get the artwork's width in real-world inches
        // If minWidth exists, it overrides defaultWidth
        const artworkWidthInches = art.minWidth || art.defaultWidth || 2.5; // Default to 2.5 inches
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
        // Prepare customData with default color for non-panel SVG artwork
        const isPanelArtwork = art.category && art.category.toLowerCase() === 'panels';
        
        // Determine default color based on selected material (only for non-panel artwork)
        // If Grey Granite is selected, use black; otherwise use white
        const isGreyGranite = activeMaterial?.name === 'Grey Granite' || activeMaterial?.id === 'mat-002';
        const defaultColorId = isGreyGranite ? 'black' : 'white';
        const defaultColor = colorData.find(c => c.id === defaultColorId) || {
          fillColor: isGreyGranite ? '#000000' : '#FFFFFF',
          opacity: 1.0,
          strokeColor: '#000000',
          strokeWidth: 0
        };
        
        // Resolve texture URL (with default for panels)
        let resolvedTextureUrl = art.textureUrl || null;
        if (!resolvedTextureUrl && isPanelArtwork) {
          resolvedTextureUrl = '/images/materials/panelbg.png';
        }
        
        const customDataObj = {
          type: 'artwork',
          artworkId: art.id,
          artworkName: art.name,
          category: art.category || null, // Store category for panel artwork detection
          defaultWidthInches: artworkWidthInches,
          minWidthInches: art.minWidth || null, // Store minWidth if it exists
          originalSource: art.imageUrl // Store original source URL for color changes
        };
        
        // Add texture URL if present
        if (resolvedTextureUrl) {
          customDataObj.textureUrl = resolvedTextureUrl;
        }
        
        // Add default color info for non-panel SVG artwork
        if (isSvgFile && !isPanelArtwork) {
          customDataObj.currentColor = defaultColor.fillColor;
          customDataObj.currentColorId = defaultColorId;
          customDataObj.currentOpacity = defaultColor.opacity;
          customDataObj.currentStrokeColor = null;
          customDataObj.currentStrokeWidth = 0;
        }
        
        // If minWidth exists, lock aspect ratio
        const lockUniScaling = !!art.minWidth;
        
        if (lockUniScaling) {
          console.log('Setting lockUniScaling for artwork with minWidth:', {
            artworkId: art.id,
            minWidth: art.minWidth,
            minWidthInches: customDataObj.minWidthInches,
            lockUniScaling: lockUniScaling,
            customData: customDataObj
          });
        }
        
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
          lockUniScaling: lockUniScaling, // Lock aspect ratio if minWidth exists
          // Store artwork metadata for potential export
          customData: customDataObj
        });
        
        // Verify customData was set correctly
        if (lockUniScaling) {
          console.log('Verifying customData after setting:', {
            hasCustomData: !!img.customData,
            minWidthInches: img.customData?.minWidthInches,
            artworkId: img.customData?.artworkId
          });
        }

        // Add metadata for tracking
        img.elementId = `image-${Date.now()}`;
        img.viewId = currentView; // Tag with current view for multi-view support
        img.zIndex = fabricInstance.getObjects().length; // Set z-index for layer ordering

        // Add to canvas and render
        fabricInstance.add(img);
        fabricInstance.setActiveObject(img);
        
        // No need to re-apply anything for image-based texture layers
        // The texture image is already loaded and positioned correctly
        
        fabricInstance.requestRenderAll();

        // Close the artwork library after selecting artwork
        setShowArtworkLibrary(false);

        console.log('Artwork object added to canvas:', img);
        console.log(`Artwork scaled to ${artworkWidthInches}" width (${artworkWidthPixels}px)`);
      } catch (error) {
        console.error('Error loading artwork:', error);
      }
    }, [fabricInstance, initialData, currentView, activeMaterial]);

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
      
      // Use canvas.height (in inches) for vertical scale, not realWorldHeight
      // canvas.height includes the base, while realWorldHeight is just the product
      const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
        ? initialData.canvas.height 
        : (initialData.realWorldHeight || 18);
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / canvasHeightInches;
      
      // Convert editZone coordinates from inches to pixels
      const editZoneWidth = editZone.width * scaleX;
      
      // If X position is not defined or set to "center", center horizontally relative to canvas width
      let editZoneLeft;
      if (editZone.x === undefined || editZone.x === null || editZone.x === 'center') {
        editZoneLeft = (canvasWidth - editZoneWidth) / 2;
      } else {
        editZoneLeft = editZone.x * scaleX;
      }
      
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
      // Use canvas.height (in inches) for vertical scale, not realWorldHeight
      // canvas.height includes the base, while realWorldHeight is just the product
      const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
        ? initialData.canvas.height 
        : (initialData.realWorldHeight || 18);
      
      // Calculate scale for converting inches to pixels
      const scaleX = canvasWidth / realWorldWidth;
      const scaleY = canvasHeight / canvasHeightInches;
      
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

    // Get current scaleX before flipping - use get() to ensure we get the actual value
    const currentScaleX = selectedElement.get ? selectedElement.get('scaleX') : (selectedElement.scaleX || 1);
    const currentFlipX = selectedElement.get ? selectedElement.get('flipX') : (selectedElement.flipX || false);
    
    // Determine if currently flipped (check both scaleX sign and flipX property)
    const isCurrentlyFlipped = currentScaleX < 0 || currentFlipX;
    const shouldBeFlipped = !isCurrentlyFlipped;
    const absScaleX = Math.abs(currentScaleX);
    
    console.log('=== FLIP HORIZONTAL ===', {
      type: selectedElement.type,
      elementId: selectedElement.elementId,
      currentScaleX: currentScaleX,
      currentFlipX: currentFlipX,
      isCurrentlyFlipped: isCurrentlyFlipped,
      shouldBeFlipped: shouldBeFlipped,
      absScaleX: absScaleX
    });

    if (selectedElement.type === 'group') {
      // Groups: Use flipX property (Fabric.js handles this correctly)
      selectedElement.set({
        flipX: shouldBeFlipped
      });
    } else if (selectedElement.type === 'image') {
      // Images: Use negative scaleX for flipping
      // Set negative scaleX directly - Fabric.js should preserve it for images
      const newScaleX = shouldBeFlipped ? -absScaleX : absScaleX;
      
      console.log('Setting image scaleX:', {
        shouldBeFlipped: shouldBeFlipped,
        newScaleX: newScaleX,
        absScaleX: absScaleX
      });
      
      // Set scaleX with negative value for flip
      selectedElement.set({
        scaleX: newScaleX
      });
      
      // Force coordinate recalculation
      selectedElement.setCoords();
      
      // Verify immediately after setting
      const immediateScaleX = selectedElement.get ? selectedElement.get('scaleX') : selectedElement.scaleX;
      console.log('Immediate scaleX after set:', immediateScaleX);
      
      // If Fabric.js normalized it, we need to use a different approach
      // Try setting it again with a small delay or use CSS transform
      if (immediateScaleX > 0 && shouldBeFlipped) {
        console.warn('Fabric.js normalized negative scaleX, applying CSS transform');
        // Apply CSS transform as fallback
        const element = selectedElement._element || selectedElement.getElement();
        if (element) {
          element.style.transform = `scaleX(${shouldBeFlipped ? -1 : 1})`;
        }
        // Also try setting flipX property
        selectedElement.set({
          flipX: shouldBeFlipped
        });
      }
    } else {
      // Other objects: Use flipX property
      selectedElement.set({
        flipX: shouldBeFlipped
      });
    }
    
    selectedElement.setCoords();
    fabricInstance.renderAll();
    
    // Verify the flip was applied
    const verifyFlipX = selectedElement.get ? selectedElement.get('flipX') : selectedElement.flipX;
    const verifyScaleX = selectedElement.get ? selectedElement.get('scaleX') : selectedElement.scaleX;
    console.log('=== AFTER FLIP HORIZONTAL ===', {
      flipX: verifyFlipX,
      scaleX: verifyScaleX,
      isFlipped: verifyFlipX === true || verifyScaleX < 0
    });
  }, [fabricInstance, selectedElement]);

  /**
   * Handler: Flip Selected Element Vertically
   */
  const handleFlipVertical = useCallback(() => {
    if (!fabricInstance || !selectedElement) return;

    // Get current scaleY before flipping
    const currentScaleY = selectedElement.scaleY || selectedElement.get('scaleY') || 1;
    const currentFlipY = selectedElement.flipY || selectedElement.get('flipY') || false;
    
    // Determine if currently flipped (check both scaleY sign and flipY property)
    const isCurrentlyFlipped = currentScaleY < 0 || currentFlipY;
    const shouldBeFlipped = !isCurrentlyFlipped;
    
    console.log('=== FLIP VERTICAL ===', {
      type: selectedElement.type,
      elementId: selectedElement.elementId,
      currentScaleY: currentScaleY,
      currentFlipY: currentFlipY,
      isCurrentlyFlipped: isCurrentlyFlipped,
      shouldBeFlipped: shouldBeFlipped
    });

    if (selectedElement.type === 'group') {
      // Groups: Use flipY property (Fabric.js handles this correctly)
      selectedElement.set({
        flipY: shouldBeFlipped
      });
    } else if (selectedElement.type === 'image') {
      // Images: Use negative scaleY for flipping
      // Fabric.js may normalize negative scales, so we need to ensure it's set correctly
      const absScaleY = Math.abs(currentScaleY);
      const newScaleY = shouldBeFlipped ? -absScaleY : absScaleY;
      
      // Set both flipY and scaleY together
      // Use setCoords() after to ensure coordinates are recalculated
      selectedElement.set({
        scaleY: newScaleY,
        flipY: shouldBeFlipped
      });
      
      // Force coordinate recalculation
      selectedElement.setCoords();
      
      // Verify the values were set correctly
      const verifyScaleY = selectedElement.scaleY || selectedElement.get('scaleY');
      const verifyFlipY = selectedElement.flipY || selectedElement.get('flipY');
      
      // If Fabric.js normalized the scaleY, try using transform matrix
      if (verifyScaleY > 0 && shouldBeFlipped) {
        console.warn('Fabric.js normalized negative scaleY, using transform matrix approach');
        // Use transform matrix to flip
        const matrix = selectedElement.calcTransformMatrix();
        if (matrix) {
          // Flip vertically by negating the y-scale component
          matrix[3] = -matrix[3]; // Negate vertical scale
          selectedElement.set({
            scaleY: absScaleY,
            flipY: true
          });
          selectedElement.setCoords();
        }
      }
    } else {
      // Other objects: Use flipY property
      selectedElement.set({
        flipY: shouldBeFlipped
      });
    }
    
    selectedElement.setCoords();
    fabricInstance.renderAll();
    
    // Verify the flip was applied
    const verifyFlipY = selectedElement.flipY || selectedElement.get('flipY');
    const verifyScaleY = selectedElement.scaleY || selectedElement.get('scaleY');
    console.log('=== AFTER FLIP VERTICAL ===', {
      flipY: verifyFlipY,
      scaleY: verifyScaleY,
      isFlipped: verifyFlipY === true || verifyScaleY < 0
    });
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
          // Use canvas.height (in inches) for vertical scale, not realWorldHeight
          // canvas.height includes the base, while realWorldHeight is just the product
          const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
            ? initialData.canvas.height 
            : (initialData.realWorldHeight || 18);
          
          const scaleX = canvasWidth / realWorldWidth;
          const scaleY = canvasHeight / canvasHeightInches;
          
          const editZoneWidthPx = editZone.width * scaleX;
          const editZoneHeightPx = editZone.height * scaleY;
          
          // If X position is not defined or set to "center", center horizontally relative to canvas width
          if (editZone.x === undefined || editZone.x === null || editZone.x === 'center') {
            constraintLeft = (canvasWidth - editZoneWidthPx) / 2;
          } else {
            constraintLeft = editZone.x * scaleX;
          }
          
          constraintTop = editZone.y * scaleY;
          constraintRight = constraintLeft + editZoneWidthPx;
          constraintBottom = constraintTop + editZoneHeightPx;
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
   * Helper: Serialize current canvas state to design elements
   * Extracted from handleSave to be reusable for view switching
   */
  const serializeCanvasState = useCallback((canvas, scale, canvasWidthInches, viewId = null) => {
    if (!canvas) return [];
    
    let objects = canvas.getObjects();
    
    // Filter by viewId if provided (for multi-view support)
    if (viewId) {
      objects = objects.filter(obj => {
        // Skip constraint overlay
        if (obj.excludeFromExport) return false;
        // Only include objects that match the specified viewId
        const objViewId = obj.viewId || obj.get?.('viewId');
        return objViewId === viewId;
      });
    } else {
      // If no viewId specified, only serialize visible objects (for backward compatibility)
      objects = objects.filter(obj => {
        if (obj.excludeFromExport) return false;
        const isVisible = obj.visible !== false && (obj.get ? obj.get('visible') !== false : true);
        return isVisible;
      });
    }
    
    // Convert each object to design element format
    return objects.map((obj, index) => {
      // Get actual transformed values - use get() to ensure we get current state
      const actualLeft = obj.get ? obj.get('left') : (obj.left ?? 0);
      const actualTop = obj.get ? obj.get('top') : (obj.top ?? 0);
      
      // Get scaleX/scaleY (handling flip state)
      let actualScaleX, actualScaleY;
      if (obj.type === 'group' || obj.type === 'path' || obj.type === 'path-group') {
        const directScaleX = obj.scaleX;
        const directScaleY = obj.scaleY;
        const getScaleX = obj.get ? obj.get('scaleX') : undefined;
        const getScaleY = obj.get ? obj.get('scaleY') : undefined;
        
        actualScaleX = directScaleX !== undefined && directScaleX !== null ? directScaleX : (getScaleX !== undefined ? getScaleX : 1);
        actualScaleY = directScaleY !== undefined && directScaleY !== null ? directScaleY : (getScaleY !== undefined ? getScaleY : (directScaleX !== undefined && directScaleX !== null ? directScaleX : 1));
        
        const flipX = obj.flipX || (obj.get ? obj.get('flipX') : false) || false;
        const flipY = obj.flipY || (obj.get ? obj.get('flipY') : false) || false;
        
        // Convert flipX/flipY to negative scaleX/scaleY for saving
        // Also preserve negative scaleX/scaleY if already set
        if (flipX || actualScaleX < 0) actualScaleX = -Math.abs(actualScaleX);
        if (flipY || actualScaleY < 0) actualScaleY = -Math.abs(actualScaleY);
      } else if (obj.type === 'image' || obj.type === 'imagebox') {
        const directScaleX = obj.scaleX;
        const directScaleY = obj.scaleY;
        const getScaleX = obj.get ? obj.get('scaleX') : undefined;
        const getScaleY = obj.get ? obj.get('scaleY') : undefined;
        
        actualScaleX = directScaleX !== undefined && directScaleX !== null ? directScaleX : (getScaleX !== undefined ? getScaleX : 1);
        actualScaleY = directScaleY !== undefined && directScaleY !== null ? directScaleY : (getScaleY !== undefined ? getScaleY : (directScaleX !== undefined && directScaleX !== null ? directScaleX : 1));
        
        const flipX = obj.flipX || (obj.get ? obj.get('flipX') : false) || false;
        const flipY = obj.flipY || (obj.get ? obj.get('flipY') : false) || false;
        
        if (flipX || actualScaleX < 0) actualScaleX = -Math.abs(actualScaleX);
        if (flipY || actualScaleY < 0) actualScaleY = -Math.abs(actualScaleY);
      } else {
        actualScaleX = obj.get ? obj.get('scaleX') : (obj.scaleX ?? 1);
        actualScaleY = obj.get ? obj.get('scaleY') : (obj.scaleY ?? obj.scaleX ?? 1);
      }
      
      const actualAngle = obj.get ? obj.get('angle') : (obj.angle ?? obj.rotation ?? 0);
      const actualOpacity = obj.get ? obj.get('opacity') : (obj.opacity ?? 1);
      const actualFill = obj.get ? obj.get('fill') : (obj.fill ?? '#000000');
      const actualStroke = obj.get ? obj.get('stroke') : obj.stroke;
      const actualStrokeWidth = obj.get ? obj.get('strokeWidth') : obj.strokeWidth;
      
      // Base properties for all objects
      const element = {
        id: obj.elementId || obj.id || `element-${Date.now()}-${index}`,
        type: obj.type,
        xPx: actualLeft,
        yPx: actualTop,
        x: pixelsToInches(actualLeft, scale),
        y: pixelsToInches(actualTop, scale),
        scaleX: actualScaleX,
        scaleY: actualScaleY,
        rotation: actualAngle,
        opacity: actualOpacity,
        fill: actualFill,
        zIndex: index
      };
      
      // Debug logging for image elements to track position saving
      if (obj.type === 'image' || obj.type === 'imagebox') {
        const objOriginX = obj.get ? obj.get('originX') : (obj.originX || 'center');
        const objOriginY = obj.get ? obj.get('originY') : (obj.originY || 'center');
        console.log('Saving image element position:', {
          elementId: element.id,
          artworkId: obj.artworkId || (obj.customData && obj.customData.artworkId),
          left: actualLeft,
          top: actualTop,
          xPx: element.xPx,
          yPx: element.yPx,
          originX: objOriginX,
          originY: objOriginY,
          scaleX: actualScaleX,
          scaleY: actualScaleY
        });
      }
      
      // Add stroke properties if they exist
      if (actualStroke !== undefined && actualStroke !== null) {
        element.stroke = actualStroke;
      }
      if (actualStrokeWidth !== undefined && actualStrokeWidth !== null) {
        element.strokeWidthPx = actualStrokeWidth;
        element.strokeWidth = pixelsToInches(actualStrokeWidth, scale);
      }
      
      // Capture customData properties
      const customData = (obj.get ? obj.get('customData') : obj.customData) || {};
      
      // Always save color information from customData if available (prioritize customData over direct fill)
      // This ensures colors set via OptionsPanel are preserved
      if (customData.currentColor !== undefined && customData.currentColor !== null) {
        element.fill = customData.currentColor;
      }
      if (customData.currentColorId !== undefined && customData.currentColorId !== null) {
        element.colorId = customData.currentColorId;
      }
      if (customData.currentOpacity !== undefined) element.opacity = customData.currentOpacity;
      if (customData.currentStrokeColor !== undefined && customData.currentStrokeColor !== null) {
        element.stroke = customData.currentStrokeColor;
      }
      if (customData.currentStrokeWidth !== undefined) {
        element.strokeWidthPx = customData.currentStrokeWidth;
        element.strokeWidth = pixelsToInches(customData.currentStrokeWidth, scale);
      }
      if (customData.artworkId) element.artworkId = customData.artworkId;
      if (customData.artworkName) element.artworkName = customData.artworkName;
      if (customData.category) element.category = customData.category;
      
      // Type-specific properties
      if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'itext' || obj.type === 'textbox') {
        const actualText = obj.get ? obj.get('text') : (obj.text ?? '');
        const actualFontSize = obj.get ? obj.get('fontSize') : (obj.fontSize ?? 12);
        const actualFontFamily = obj.get ? obj.get('fontFamily') : (obj.fontFamily ?? 'Arial');
        const actualFontWeight = obj.get ? obj.get('fontWeight') : (obj.fontWeight ?? 'normal');
        const actualFontStyle = obj.get ? obj.get('fontStyle') : (obj.fontStyle ?? 'normal');
        const actualTextAlign = obj.get ? obj.get('textAlign') : (obj.textAlign ?? 'left');
        const actualLineHeight = obj.get ? obj.get('lineHeight') : (obj.lineHeight ?? 1.2);
        const actualCharSpacing = obj.get ? obj.get('charSpacing') : (obj.charSpacing ?? 0);
        const actualOriginX = obj.get ? obj.get('originX') : (obj.originX || 'left');
        const actualOriginY = obj.get ? obj.get('originY') : (obj.originY || 'top');
        
        element.content = actualText;
        const finalFontSizePx = actualFontSize * actualScaleX;
        element.fontSizePx = finalFontSizePx;
        element.fontSize = pixelsToInches(finalFontSizePx, scale);
        element.scaleX = 1;
        element.scaleY = 1;
        element.originX = actualOriginX;
        element.originY = actualOriginY;
        element.font = actualFontFamily;
        element.fontWeight = actualFontWeight;
        element.fontStyle = actualFontStyle;
        element.textAlign = actualTextAlign;
        element.lineHeight = actualLineHeight;
        element.charSpacing = actualCharSpacing;
      } else if (obj.type === 'image' || obj.type === 'imagebox') {
        const imgCustomData = obj.customData || {};
        
        // Prioritize imageUrl from customData (set when loading from templates)
        // Then check originalSource, then fall back to getSrc/src
        let imageSource = null;
        if (imgCustomData.imageUrl && !imgCustomData.imageUrl.startsWith('data:')) {
          // Prefer imageUrl if it's not a data URL
          imageSource = imgCustomData.imageUrl;
        } else if (imgCustomData.originalSource && !imgCustomData.originalSource.startsWith('data:')) {
          // Use originalSource if it's not a data URL
          imageSource = imgCustomData.originalSource;
        } else if (typeof obj.getSrc === 'function') {
          const src = obj.getSrc();
          // Only use if it's not a data URL
          if (src && !src.startsWith('data:')) {
            imageSource = src;
          }
        } else if (obj.src && !obj.src.startsWith('data:')) {
          imageSource = obj.src;
        } else if (obj._element && obj._element.src && !obj._element.src.startsWith('data:')) {
          imageSource = obj._element.src;
        }
        
        // Set both content and imageUrl to preserve the URL
        if (imageSource) {
          element.content = imageSource;
          element.imageUrl = imageSource;
        } else {
          // Fallback: use whatever is available (even if data URL)
          const fallbackSrc = imgCustomData.imageUrl || imgCustomData.originalSource || 
                             (typeof obj.getSrc === 'function' ? obj.getSrc() : null) || 
                             obj.src || 
                             (obj._element && obj._element.src) || '';
          element.content = fallbackSrc;
          // Only set imageUrl if it's not a data URL
          if (fallbackSrc && !fallbackSrc.startsWith('data:')) {
            element.imageUrl = fallbackSrc;
          }
        }
        
        const objWidth = obj.get ? obj.get('width') : (obj.width ?? 0);
        const objHeight = obj.get ? obj.get('height') : (obj.height ?? 0);
        const actualWidth = objWidth * actualScaleX;
        const actualHeight = objHeight * actualScaleY;
        element.widthPx = actualWidth;
        element.heightPx = actualHeight;
        element.width = pixelsToInches(actualWidth, scale);
        element.height = pixelsToInches(actualHeight, scale);
        
        // Preserve artworkId if available (important for template artwork)
        // Check both customData and direct property (for backward compatibility)
        if (imgCustomData.artworkId || obj.artworkId) {
          element.artworkId = imgCustomData.artworkId || obj.artworkId;
        }
        if (imgCustomData.category || obj.category) {
          element.category = imgCustomData.category || obj.category;
        }
        
        // Always save color information for images/artwork (prioritize customData)
        // This ensures colors set via OptionsPanel are preserved in templates
        if (imgCustomData.currentColor !== undefined && imgCustomData.currentColor !== null) {
          element.fill = imgCustomData.currentColor;
        }
        if (imgCustomData.currentColorId !== undefined && imgCustomData.currentColorId !== null) {
          element.colorId = imgCustomData.currentColorId;
        }
        if (imgCustomData.currentOpacity !== undefined) element.opacity = imgCustomData.currentOpacity;
        if (imgCustomData.currentStrokeColor !== undefined && imgCustomData.currentStrokeColor !== null) {
          element.stroke = imgCustomData.currentStrokeColor;
        }
        if (imgCustomData.currentStrokeWidth !== undefined) {
          element.strokeWidthPx = imgCustomData.currentStrokeWidth;
          element.strokeWidth = pixelsToInches(imgCustomData.currentStrokeWidth, scale);
        }
        
        // Save origin point for image elements (important for correct positioning)
        const imgOriginX = obj.get ? obj.get('originX') : (obj.originX || 'center');
        const imgOriginY = obj.get ? obj.get('originY') : (obj.originY || 'center');
        element.originX = imgOriginX;
        element.originY = imgOriginY;
      } else if (obj.type === 'group') {
        const groupCustomData = (obj.get ? obj.get('customData') : obj.customData) || {};
        element.content = obj.name || groupCustomData.artworkName || groupCustomData.artworkId || obj.artworkId || '';
        element.category = obj.category || groupCustomData.category || '';
        element.type = 'artwork';
        
        const groupWidth = obj.get ? obj.get('width') : (obj.width || 0);
        const groupHeight = obj.get ? obj.get('height') : (obj.height || 0);
        const actualGroupWidth = Math.abs(groupWidth * actualScaleX);
        const actualGroupHeight = Math.abs(groupHeight * actualScaleY);
        element.widthPx = actualGroupWidth;
        element.heightPx = actualGroupHeight;
        element.width = pixelsToInches(actualGroupWidth, scale);
        element.height = pixelsToInches(actualGroupHeight, scale);
        
        const groupOriginX = obj.get ? obj.get('originX') : (obj.originX || 'center');
        const groupOriginY = obj.get ? obj.get('originY') : (obj.originY || 'center');
        element.originX = groupOriginX;
        element.originY = groupOriginY;
        
        const savedArtworkId = obj.artworkId || groupCustomData.artworkId;
        if (savedArtworkId) element.artworkId = savedArtworkId;
        if (obj.textureUrl || groupCustomData.textureUrl) element.textureUrl = obj.textureUrl || groupCustomData.textureUrl;
        
        const objImageUrl = obj.imageUrl && obj.imageUrl.trim() ? obj.imageUrl : null;
        const customDataImageUrl = groupCustomData.imageUrl && groupCustomData.imageUrl.trim() ? groupCustomData.imageUrl : null;
        const customDataOriginalSource = groupCustomData.originalSource && groupCustomData.originalSource.trim() ? groupCustomData.originalSource : null;
        const availableImageUrl = objImageUrl || customDataImageUrl || customDataOriginalSource;
        
        if (availableImageUrl && availableImageUrl.trim()) {
          element.imageUrl = availableImageUrl.trim();
        }
        
        if (groupCustomData.category || obj.category) {
          element.category = groupCustomData.category || obj.category;
        }
        if (groupCustomData.defaultWidthInches) element.defaultWidthInches = groupCustomData.defaultWidthInches;
        
        // Always save color information for groups (prioritize customData)
        // This ensures colors set via OptionsPanel are preserved in templates
        if (groupCustomData.currentColor !== undefined && groupCustomData.currentColor !== null) {
          element.fill = groupCustomData.currentColor;
        }
        if (groupCustomData.currentColorId !== undefined && groupCustomData.currentColorId !== null) {
          element.colorId = groupCustomData.currentColorId;
        }
        if (groupCustomData.currentOpacity !== undefined) element.opacity = groupCustomData.currentOpacity;
        if (groupCustomData.currentStrokeColor !== undefined && groupCustomData.currentStrokeColor !== null) {
          element.stroke = groupCustomData.currentStrokeColor;
        }
        if (groupCustomData.currentStrokeWidth !== undefined) {
          element.strokeWidthPx = groupCustomData.currentStrokeWidth;
          element.strokeWidth = pixelsToInches(groupCustomData.currentStrokeWidth, scale);
        }
        
        // Capture color from group's paths if customData doesn't have it (fallback)
        // This ensures we save the actual color applied to the artwork even if customData wasn't set
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
            const pathOpacity = firstPath.get ? firstPath.get('opacity') : firstPath.opacity;
            
            if (pathFill && pathFill !== '#000000') element.fill = pathFill;
            if (pathStroke) element.stroke = pathStroke;
            if (pathOpacity !== undefined) element.opacity = pathOpacity;
          }
        }
      } else if (obj.type === 'path' || obj.type === 'path-group') {
        element.content = obj.name || obj.artworkId || '';
        element.category = obj.category || '';
        const pathBounds = obj.getBoundingRect();
        element.widthPx = pathBounds.width;
        element.heightPx = pathBounds.height;
        element.width = pixelsToInches(pathBounds.width, scale);
        element.height = pixelsToInches(pathBounds.height, scale);
        
        // Preserve artworkId for path elements (important for cloned artwork and templates)
        // Check both customData and direct property (for backward compatibility)
        const pathCustomData = (obj.get ? obj.get('customData') : obj.customData) || {};
        if (pathCustomData.artworkId || obj.artworkId) {
          element.artworkId = pathCustomData.artworkId || obj.artworkId;
        }
        if (pathCustomData.category || obj.category) {
          element.category = pathCustomData.category || obj.category;
        }
        // Also preserve imageUrl if available
        if (pathCustomData.imageUrl || obj.imageUrl) {
          element.imageUrl = pathCustomData.imageUrl || obj.imageUrl;
        }
        
        // Always save color information for path elements (prioritize customData)
        // This ensures colors set via OptionsPanel are preserved in templates
        if (pathCustomData.currentColor !== undefined && pathCustomData.currentColor !== null) {
          element.fill = pathCustomData.currentColor;
        }
        if (pathCustomData.currentColorId !== undefined && pathCustomData.currentColorId !== null) {
          element.colorId = pathCustomData.currentColorId;
        }
        if (pathCustomData.currentOpacity !== undefined) element.opacity = pathCustomData.currentOpacity;
        if (pathCustomData.currentStrokeColor !== undefined && pathCustomData.currentStrokeColor !== null) {
          element.stroke = pathCustomData.currentStrokeColor;
        }
        if (pathCustomData.currentStrokeWidth !== undefined) {
          element.strokeWidthPx = pathCustomData.currentStrokeWidth;
          element.strokeWidth = pixelsToInches(pathCustomData.currentStrokeWidth, scale);
        }
        
        // Save origin point for path elements (defaults to 'center' to match how they're created)
        const pathOriginX = obj.get ? obj.get('originX') : (obj.originX || 'center');
        const pathOriginY = obj.get ? obj.get('originY') : (obj.originY || 'center');
        element.originX = pathOriginX;
        element.originY = pathOriginY;
        
        if (obj.artworkId) element.artworkId = obj.artworkId;
        if (obj.textureUrl) element.textureUrl = obj.textureUrl;
        if (obj.imageUrl) element.imageUrl = obj.imageUrl;
      } else {
        element.content = obj.name || '';
        const bounds = obj.getBoundingRect ? obj.getBoundingRect() : { width: obj.width || 0, height: obj.height || 0 };
        element.widthPx = bounds.width;
        element.heightPx = bounds.height;
        element.width = pixelsToInches(bounds.width, scale);
        element.height = pixelsToInches(bounds.height, scale);
      }
      
      return element;
    });
  }, []);
  
  /**
   * Handler: Save Project (CRITICAL)
   * 
   * Gets all objects from Fabric, converts pixels to inches, and calls onSave
   */
  const handleSave = useCallback(async () => {
    if (!fabricInstance || isSaving || canvasSize.width === 0) return;

    setIsSaving(true);

    try {
      // FIXED CANVAS SIZE: Start with 1000px width, but may scale down for portrait products
      const FIXED_CANVAS_WIDTH = 1000;
      const MAX_CANVAS_HEIGHT = 550;
      
      // Use canvas dimensions from template if available, otherwise fall back to realWorld dimensions
      const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
        ? initialData.canvas.width 
        : (initialData.realWorldWidth || 24);
      const canvasHeightInches = (initialData.canvas && initialData.canvas.height) 
        ? initialData.canvas.height 
        : (initialData.realWorldHeight || 18);
      
      // Calculate initial canvas dimensions maintaining aspect ratio
      let canvasWidth = FIXED_CANVAS_WIDTH;
      let canvasHeight = (canvasWidth / canvasWidthInches) * canvasHeightInches;
      
      // If height exceeds max, scale both dimensions proportionally to constrain height
      if (canvasHeight > MAX_CANVAS_HEIGHT) {
        const scaleFactor = MAX_CANVAS_HEIGHT / canvasHeight;
        canvasWidth = canvasWidth * scaleFactor;
        canvasHeight = MAX_CANVAS_HEIGHT;
      }
      
      // Calculate scale for display purposes only (converting pixels to inches in UI)
      // Use final canvas width for scale calculation to match the actual canvas dimensions
      const scale = calculateScale(canvasWidthInches, canvasWidth);

      // Serialize only visible elements (current view) to local state
      const currentDesignElements = serializeCanvasState(fabricInstance, scale, canvasWidthInches, currentView);
      
      // Update local state with current view's elements
      const updatedLocalDesignElements = {
        ...localDesignElements,
        [currentView]: currentDesignElements
      };
      setLocalDesignElements(updatedLocalDesignElements);
      
      console.log('=== SAVE DEBUG ===');
      console.log('Total visible objects on canvas:', currentDesignElements.length);
      console.log('Saving all views to Supabase:', Object.keys(updatedLocalDesignElements));

      // Use local design elements (all views) for saving
      const designElements = updatedLocalDesignElements;
      
      console.log('=== SAVED DESIGN ELEMENTS ===');
      console.log('Total elements for current view:', currentDesignElements.length);
      console.log('All views being saved:', Object.keys(updatedLocalDesignElements));
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

      // Save actual canvas dimensions (may be scaled down for portrait products)
      // Use actual fabric canvas dimensions to preserve the constrained size
      const actualCanvasWidth = fabricInstance.width || 1000;
      const actualCanvasHeight = fabricInstance.height || 550;
      const canvasDimensions = {
        width: actualCanvasWidth,
        height: actualCanvasHeight,
        realWorldWidth: initialData.realWorldWidth || 24,
        realWorldHeight: initialData.realWorldHeight || 18,
        canvasWidth: canvasWidthInches,
        canvasHeight: canvasHeightInches,
        timestamp: Date.now()
      };

      console.log('=== SAVE: Canvas Dimensions ===');
      console.log('Canvas dimensions:', canvasDimensions);

      // Capture preview image before saving
      let previewImageUrl = null;
      if (fabricInstance && productCanvasRef.current && currentProjectId) {
        try {
          console.log('Capturing preview image for project:', currentProjectId);
          // Capture combined canvas (product canvas + fabric canvas)
          const dataURL = await captureCombinedCanvas(fabricInstance, productCanvasRef.current, {
            format: 'image/png',
            quality: 0.9,
            multiplier: 1 // Use 1x for preview thumbnails (faster, smaller file)
          });
          
          // Convert data URL to blob
          const response = await fetch(dataURL);
          const blob = await response.blob();
          
          // Upload to Supabase Storage
          previewImageUrl = await uploadPreviewImage(blob, currentProjectId, 'preview.png');
          console.log('Preview image uploaded successfully:', previewImageUrl);
        } catch (previewError) {
          // Don't fail the save if preview capture fails, just log it
          // This can happen if the canvas is tainted (CORS issue with external images)
          if (previewError.name === 'SecurityError' || previewError.message?.includes('Tainted') || previewError.message?.includes('tainted')) {
            console.warn('Canvas is tainted (CORS issue). Preview image capture skipped. The project will still be saved.');
            console.warn('To fix this, ensure all images are loaded with proper CORS headers or use crossOrigin: "anonymous"');
          } else {
            console.warn('Failed to capture/upload preview image:', previewError);
          }
        }
      }

      // Save design elements as an object with view keys
      // Use updatedLocalDesignElements which contains all views' elements
      const updatedDesignElements = updatedLocalDesignElements;

      // Create updated project data
      const updatedProjectData = {
        ...initialData,
        designElements: updatedDesignElements, // Save as object with view keys
        canvasDimensions, // Save canvas dimensions for accurate reloading
        material: currentMaterial, // Use ref value to ensure we have the latest
        previewImageUrl, // Include preview image URL if captured
        currentView, // Save the current view
        isNewProject: false // Mark project as no longer new after first save
      };

      // Update hookInitialData to reflect that this is no longer a new project
      // This prevents auto-loading default template on subsequent loads
      setHookInitialData(prev => ({
        ...prev,
        isNewProject: false
      }));

      // Mark that we've handled the new project flag (prevents auto-load on next render)
      hasAutoLoadedDefaultTemplate.current = true;

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
  }, [fabricInstance, initialData, activeMaterial, canvasSize, isSaving, onSave, currentProjectId, currentView, localDesignElements, serializeCanvasState]);

  /**
   * Handler: Save as Template (Master Admin Only)
   * Saves current canvas artwork as a reusable template
   */
  const handleSaveAsTemplate = useCallback(async () => {
    if (!fabricInstance || isSavingTemplate || canvasSize.width === 0) return;

    if (!templateName.trim()) {
      setSaveAlert({
        type: 'danger',
        message: 'Please enter a template name'
      });
      return;
    }

    setIsSavingTemplate(true);

    try {
      // Use actual fabric canvas dimensions (may be scaled down for portrait products)
      const actualCanvasWidth = fabricInstance.width || 1000;
      
      // Use canvas dimensions from template if available, otherwise fall back to realWorld dimensions
      const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
        ? initialData.canvas.width 
        : (initialData.realWorldWidth || 24);
      
      // Calculate scale for display purposes only - use actual canvas width
      const scale = calculateScale(canvasWidthInches, actualCanvasWidth);

      // Serialize current view's design elements (includes all canvas objects)
      const designElements = serializeCanvasState(fabricInstance, scale, canvasWidthInches, currentView);
      
      // Capture full canvas preview (product + overlay + artwork/text)
      let previewBlob = null;
      try {
        if (!productCanvasRef.current) {
          throw new Error('Product canvas not available');
        }
        
        const dataURL = await captureCombinedCanvas(fabricInstance, productCanvasRef.current, {
          format: 'image/png',
          quality: 0.9,
          multiplier: 1
        });
        
        // Convert data URL to blob
        const response = await fetch(dataURL);
        previewBlob = await response.blob();
      } catch (previewError) {
        console.warn('Failed to capture full canvas preview:', previewError);
        // Continue without preview if capture fails
      }

      // Get current product ID and material ID
      const productId = initialData.productId || initialData.id || null;
      const materialId = activeMaterial?.id || null;

      // Save template with product and material association
      const result = await artworkTemplateService.createTemplate(
        {
          name: templateName.trim(),
          designElements: designElements,
          productId: productId,
          materialId: materialId,
          customizations: {
            canvasDimensions: {
              width: fabricInstance.width || 1000,
              height: fabricInstance.height || 550,
              canvasWidth: canvasWidthInches,
              canvasHeight: initialData.canvas?.height || initialData.realWorldHeight || 18
            }
          }
        },
        previewBlob
      );

      if (result.success) {
        setSaveAlert({
          type: 'success',
          message: 'Template saved successfully!'
        });
        setSaveTemplateModal({ isOpen: false });
        setTemplateName('');
      } else {
        setSaveAlert({
          type: 'danger',
          message: result.error || 'Failed to save template'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setSaveAlert({
        type: 'danger',
        message: 'Failed to save template. Please try again.'
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [fabricInstance, templateName, canvasSize, isSavingTemplate, currentView, initialData, serializeCanvasState]);

  /**
   * Handler: Open Save as Template modal
   */
  const handleOpenSaveTemplate = useCallback(() => {
    setSaveTemplateModal({ isOpen: true });
    setTemplateName('');
  }, []);

  /**
   * Handler: Close Save as Template modal
   */
  const handleCloseSaveTemplate = useCallback(() => {
    setSaveTemplateModal({ isOpen: false });
    setTemplateName('');
  }, []);

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
      
      // Use unified exporter (prototype) - can switch back to exportToDxf if needed
      await exportToDxfUnified({
        fabricCanvas: fabric,
        productCanvas: productCanvasRef.current,
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
   * Handler: Approval - Capture canvas and navigate to approval view
   * Captures snapshots for both front and back views if both have design elements
   */
  const handleApproval = useCallback(async () => {
    const fabric = fabricInstance || fabricFromHook;
    
    if (!fabric) {
      console.warn('DesignStudio handleApproval: No fabric instance available');
      alert('Canvas not ready. Please wait for the canvas to load.');
      return;
    }

    if (!currentProjectId) {
      console.warn('DesignStudio handleApproval: No project ID available');
      alert('Project ID not found. Cannot create approval proof.');
      return;
    }

    try {
      // Check which views have design elements
      const designElements = localDesignElements || {};
      const hasFrontElements = Array.isArray(designElements.front) && designElements.front.length > 0;
      const hasBackElements = Array.isArray(designElements.back) && designElements.back.length > 0;
      const hasBothViews = hasFrontElements && hasBackElements;
      
      // Get all objects on canvas
      const allObjects = fabric.getObjects().filter(obj => !obj.excludeFromExport);
      
      // Helper function to set visibility for a specific view
      const setViewVisibility = (viewId, visible) => {
        allObjects.forEach(obj => {
          const objViewId = obj.viewId || obj.get?.('viewId');
          if (objViewId) {
            const normalizedViewId = String(objViewId).toLowerCase().trim();
            const normalizedTargetView = String(viewId).toLowerCase().trim();
            const shouldBeVisible = normalizedViewId === normalizedTargetView;
            
            obj.set('visible', shouldBeVisible && visible);
            obj.set('selectable', shouldBeVisible && visible);
            obj.set('evented', shouldBeVisible && visible);
            obj.set('opacity', (shouldBeVisible && visible) ? (obj.originalOpacity || 1) : 0);
            obj.dirty = true;
            
            // Handle groups recursively
            if (obj.type === 'group' && obj._objects) {
              obj._objects.forEach(child => {
                child.set('visible', shouldBeVisible && visible);
                child.set('selectable', shouldBeVisible && visible);
                child.set('evented', shouldBeVisible && visible);
                child.set('opacity', (shouldBeVisible && visible) ? (child.originalOpacity || 1) : 0);
                child.dirty = true;
              });
            }
          } else {
            // Objects without viewId should be hidden
            obj.set('visible', false);
            obj.set('opacity', 0);
            obj.dirty = true;
          }
        });
        fabric.renderAll();
      };
      
      // Store original visibility state (recursively for groups)
      const storeOriginalState = (obj) => {
        const state = {
          obj,
          visible: obj.visible,
          opacity: obj.originalOpacity !== undefined ? obj.originalOpacity : obj.opacity,
          selectable: obj.selectable,
          evented: obj.evented,
          children: []
        };
        
        // Store children state if it's a group
        if (obj.type === 'group' && obj._objects) {
          obj._objects.forEach(child => {
            state.children.push(storeOriginalState(child));
          });
        }
        
        return state;
      };
      
      const originalVisibility = allObjects.map(obj => storeOriginalState(obj));
      
      const snapshots = {};
      
      if (hasBothViews) {
        // Capture front view
        setViewVisibility('front', true);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for render
        snapshots.front = await captureCombinedCanvas(
          fabric,
          productCanvasRef.current,
          { format: 'image/png', quality: 0.92 }
        );
        
        // Capture back view
        setViewVisibility('back', true);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for render
        snapshots.back = await captureCombinedCanvas(
          fabric,
          productCanvasRef.current,
          { format: 'image/png', quality: 0.92 }
        );
      } else if (hasFrontElements) {
        // Only front view - capture current state
        setViewVisibility('front', true);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for render
        snapshots.front = await captureCombinedCanvas(
          fabric,
          productCanvasRef.current,
          { format: 'image/png', quality: 0.92 }
        );
      } else if (hasBackElements) {
        // Only back view - capture current state
        setViewVisibility('back', true);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for render
        snapshots.back = await captureCombinedCanvas(
          fabric,
          productCanvasRef.current,
          { format: 'image/png', quality: 0.92 }
        );
      } else {
        // No elements - capture current state
        snapshots[currentView] = await captureCombinedCanvas(
          fabric,
          productCanvasRef.current,
          { format: 'image/png', quality: 0.92 }
        );
      }
      
      // Restore original visibility state (recursively for groups)
      const restoreOriginalState = ({ obj, visible, opacity, selectable, evented, children }) => {
        obj.set('visible', visible);
        obj.set('opacity', opacity);
        obj.set('selectable', selectable);
        obj.set('evented', evented);
        obj.dirty = true;
        
        // Restore group children recursively
        if (children && children.length > 0 && obj.type === 'group' && obj._objects) {
          children.forEach((childState, index) => {
            if (obj._objects[index]) {
              restoreOriginalState(childState);
            }
          });
        }
      };
      
      originalVisibility.forEach(state => restoreOriginalState(state));
      fabric.renderAll();

      // Navigate to approval view with snapshots in state
      navigate(`/projects/${currentProjectId}/approval`, {
        state: { designSnapshots: snapshots, hasMultipleViews: hasBothViews }
      });
    } catch (error) {
      console.error('DesignStudio: Error capturing canvas for approval:', error);
      alert('Failed to capture design snapshot. Please try again.');
    }
  }, [fabricInstance, fabricFromHook, currentProjectId, navigate, localDesignElements, currentView]);

  /**
   * Handler: Close Studio
   */
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  /**
   * Handler: Change View (Front/Back/Top)
   * Saves current canvas state to local storage before switching
   */
  // Use a ref to track if a view change is in progress to prevent recursive calls
  const isViewChangingRef = useRef(false);
  
  const handleViewChange = useCallback((newView) => {
    // Prevent recursive calls
    if (isViewChangingRef.current) {
      console.warn('View change already in progress, ignoring duplicate call');
      return;
    }
    
    if (!availableViews.includes(newView)) {
      console.warn(`View ${newView} is not available. Available views:`, availableViews);
      return;
    }
    
    if (currentView === newView) {
      return; // Already on this view
    }
    
    isViewChangingRef.current = true;
    console.log('Switching view from', currentView, 'to', newView);
    
    // Save current canvas state to local storage before switching
    // Only serialize visible elements (current view)
    if (fabricInstance && canvasSize.width > 0) {
      // Use actual fabric canvas width (may be scaled down for portrait products)
      const actualCanvasWidth = fabricInstance.width || 1000;
      const canvasWidthInches = (initialData.canvas && initialData.canvas.width) 
        ? initialData.canvas.width 
        : (initialData.realWorldWidth || 24);
      const scale = calculateScale(canvasWidthInches, actualCanvasWidth);
      
      // Serialize only visible elements (current view)
      const currentDesignElements = serializeCanvasState(fabricInstance, scale, canvasWidthInches, currentView);
      
      // Save to local state for current view
      setLocalDesignElements(prev => ({
        ...prev,
        [currentView]: currentDesignElements
      }));
      
      console.log(`Saved ${currentDesignElements.length} visible elements to local state for view: ${currentView}`);
    }
    
    // Clear selection when switching views (visibility toggle happens in useFabricCanvas)
    if (fabricInstance) {
      fabricInstance.discardActiveObject();
      fabricInstance.renderAll();
    }
    setSelectedElement(null);
    
    // Switch to new view - useFabricCanvas will toggle visibility
    setCurrentView(newView);
    
    // Reset the flag after a short delay to allow state updates to complete
    setTimeout(() => {
      isViewChangingRef.current = false;
    }, 100);
  }, [availableViews, fabricInstance, currentView, initialData, canvasSize, serializeCanvasState]);

  // Expose handlers to parent component (for AppHeader integration)
  // Store handlers in ref to always have latest version without causing re-renders
  const handlersRef = useRef({ 
    onSave: handleSave, 
    onExport: handleExport, 
    onApproval: handleApproval, 
    projectTitle,
    onViewChange: handleViewChange,
    currentView,
    availableViews
  });
  const prevStateRef = useRef({ 
    isSaving: false, 
    isExporting: false, 
    canvasReady: false, 
    initialized: false,
    currentView: currentView || 'front',
    availableViews: availableViews || ['front']
  });
  
  // Update handlers ref when they change (without triggering effects)
  useEffect(() => {
    handlersRef.current = { 
      onSave: handleSave, 
      onExport: handleExport, 
      onApproval: handleApproval, 
      projectTitle,
      onViewChange: handleViewChange,
      currentView,
      availableViews
    };
  }, [handleSave, handleExport, handleApproval, projectTitle, handleViewChange, currentView, availableViews]);
  
  // Only expose handlers when state changes or on initial mount
  useEffect(() => {
    if (!onHandlersReady) return;
    
    // Check if state changed
    const stateChanged = 
      prevStateRef.current.isSaving !== isSaving ||
      prevStateRef.current.isExporting !== isExporting;
    
    // Check if view state changed
    const viewStateChanged = 
      prevStateRef.current.currentView !== currentView ||
      JSON.stringify(prevStateRef.current.availableViews) !== JSON.stringify(availableViews);
    
    // Check if canvas readiness changed
    const canvasReady = canvasSize.width > 0 && (!!fabricInstance || !!fabricFromHook);
    const prevCanvasReady = prevStateRef.current.canvasReady || false;
    const canvasReadinessChanged = canvasReady !== prevCanvasReady;
    
    // Update prevStateRef
    prevStateRef.current = {
      isSaving,
      isExporting,
      canvasReady,
      currentView,
      availableViews,
      initialized: prevStateRef.current.initialized || true
    };
    
    // Also call on initial mount
    const isInitial = !prevStateRef.current.initialized;
    
    console.log('DesignStudio: Checking if handlers should be exposed', {
      stateChanged,
      viewStateChanged,
      canvasReadinessChanged,
      isInitial,
      isSaving,
      isExporting,
      canvasReady,
      prevCanvasReady,
      currentView,
      availableViews,
      canvasSizeWidth: canvasSize.width,
      hasFabricInstance: !!fabricInstance,
      hasFabricFromHook: !!fabricFromHook
    });
    
    if (stateChanged || viewStateChanged || canvasReadinessChanged || isInitial) {
      // prevStateRef.current is already updated above, no need to update again
      
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
        availableViews: handlersRef.current.availableViews,
        currentView: handlersRef.current.currentView,
        hasOnViewChange: !!handlersRef.current.onViewChange,
        hasFabricInstance: !!fabricInstance,
        hasFabricFromHook: !!fabricFromHook,
        '*** isCanvasReady VALUE': canvasReady
      });
      onHandlersReady({
        onSave: handlersRef.current.onSave,
        onExport: handlersRef.current.onExport,
        onApproval: handlersRef.current.onApproval,
        isSaving,
        isExporting,
        isCanvasReady: canvasReady,
        projectTitle: handlersRef.current.projectTitle,
        availableViews: handlersRef.current.availableViews,
        currentView: handlersRef.current.currentView,
        onViewChange: handlersRef.current.onViewChange
      });
    }
  }, [onHandlersReady, isSaving, isExporting, canvasSize.width, fabricInstance, fabricFromHook, currentView, availableViews]); // Re-expose when canvas becomes ready or view changes

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
        onSaveAsTemplate={isMasterAdmin ? handleOpenSaveTemplate : null}
        onToggleTemplateLibrary={handleToggleTemplateLibrary}
      />

        {/* Left Panel: Artwork (only show when toggled) */}
        {showArtworkLibrary && (
            
            <ArtworkLibrary
              artwork={artwork}
              onSelectArtwork={handleAddArtwork}
              onClose={handleToggleArtworkLibrary}
            />
          
        )}

        {/* Left Panel: Template Library (only show when toggled) */}
        {showTemplateLibrary && (
            <ArtworkTemplatesLibrary
              onSelectTemplate={handleLoadTemplate}
              onClose={handleToggleTemplateLibrary}
              availableTemplateIds={Array.isArray(initialData?.availableTemplates) ? initialData.availableTemplates : []}
              defaultTemplateId={initialData?.defaultTemplateId || null}
              productId={initialData?.productId || initialData?.id || null}
            />
        )}

        {/* Main/Center: Canvas */}
        <div className="design-studio-canvas-container" ref={canvasContainerRef}>
          
          {/* Canvas Stack */}
          <div className="canvas-stack" style={{ opacity: loadingState.isLoading ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
            
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

          {/* Loading Overlay */}
          {loadingState.isLoading && (
            <div className="loading-overlay">
              <LoadingSpinner
                message={loadingState.message || 'Loading project...'}
                progress={loadingState.total > 0 ? (loadingState.loaded / loadingState.total) * 100 : null}
                size="large"
              />
            </div>
          )}
          

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
              initialData={initialData}
              artwork={artwork}
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

      {/* Save as Template Modal */}
      <Modal
        isOpen={saveTemplateModal.isOpen}
        onClose={handleCloseSaveTemplate}
        className="save-template-modal"
      >
        <div className="save-template-modal-content">
          <h3 className="save-template-modal-title">Save as Template</h3>
          <p className="save-template-modal-description">
            Save the current artwork design as a reusable template. This will save only the artwork elements (text and artwork), not the product template.
          </p>
          
          <div className="save-template-form">
            <div className="form-group">
              <label htmlFor="template-name" className="form-label">Template Name</label>
              <input
                id="template-name"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="form-input"
                placeholder="Enter template name"
                autoFocus
                disabled={isSavingTemplate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim() && !isSavingTemplate) {
                    handleSaveAsTemplate();
                  }
                }}
              />
            </div>
          </div>

          <div className="save-template-modal-actions">
            <Button
              variant="secondary"
              onClick={handleCloseSaveTemplate}
              disabled={isSavingTemplate}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAsTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
            >
              {isSavingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DesignStudio;
