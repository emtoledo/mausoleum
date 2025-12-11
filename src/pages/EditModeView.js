import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import DesignStudio from '../features/DesignStudio/DesignStudio';
import { materials } from '../data/MaterialsData.js';
import artworkService from '../services/artworkService';
import productService from '../services/productService';

const EditModeView = ({ onHandlersReady }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productConfig, setProductConfig] = useState(null);
  const [artwork, setArtwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [designStudioHandlers, setDesignStudioHandlers] = useState(null);

  // Forward handlers to parent (BaseScreenLayout)
  useEffect(() => {
    if (onHandlersReady && designStudioHandlers) {
      onHandlersReady(designStudioHandlers);
    }
  }, [onHandlersReady, designStudioHandlers]);

  useEffect(() => {
    loadProject();
    loadArtwork();
  }, [projectId]);

  const loadArtwork = async () => {
    try {
      const result = await artworkService.getAllArtwork(false); // Only active artwork
      if (result.success) {
        // Transform database format to match ArtworkData.js format
        const transformedArtwork = (result.data || []).map(item => {
          // Default texture for panel artwork if not specified
          let textureUrl = item.texture_url || null;
          if (!textureUrl && item.category && item.category.toLowerCase() === 'panels') {
            // Use default panel texture
            textureUrl = '/images/materials/panelbg.png';
          }
          
          return {
            id: item.id,
            name: item.name,
            category: item.category,
            imageUrl: item.image_url,
            textureUrl: textureUrl,
            defaultWidth: item.default_width || 5.0,
            minWidth: item.min_width || null,
            featured: item.featured || false
          };
        });
        setArtwork(transformedArtwork);
      } else {
        console.warn('Failed to load artwork:', result.error);
        // Fallback to empty array if loading fails
        setArtwork([]);
      }
    } catch (err) {
      console.error('Error loading artwork:', err);
      // Fallback to empty array if loading fails
      setArtwork([]);
    }
  };

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(projectId);
      if (result.success) {
        setProject(result.data);
        
        // If project is approved, redirect to approved view (cannot edit approved projects)
        if (result.data.status === 'approved') {
          navigate(`/projects/${projectId}/approved`);
          return;
        }
        
        // Get the single product for this project
        let product = null;
        if (result.data.template) {
          // New format: single product object (still called template in DB for backward compatibility)
          product = result.data.template;
        } else if (result.data.templates && result.data.templates.length > 0) {
          // Legacy format: use first product from array
          console.log('EditModeView - Using first product from legacy templates array');
          product = result.data.templates[0];
        } else {
          setError('No product found for this project');
          setLoading(false);
          return;
        }

        setSelectedProduct(product);

        // Load product configuration from database using product ID
        if (product.templateId || product.id) {
          const productId = product.templateId || product.id;
          const productResult = await productService.getProductById(productId);
          
          if (productResult.success && productResult.data) {
            // Transform database format to match expected format
            const dbProduct = productResult.data;
            
            // Helper function to normalize floral image URLs
            // Converts webpack-processed paths to static paths for production compatibility
            const normalizeFloralImageUrl = (imageUrl) => {
              // Handle null/undefined
              if (!imageUrl) return imageUrl;
              
              // If it's not a string, try to convert it
              let urlString = imageUrl;
              if (typeof imageUrl !== 'string') {
                // If it's a webpack module object, try to get the default export
                if (imageUrl.default) {
                  urlString = imageUrl.default;
                } else if (typeof imageUrl === 'object' && imageUrl.toString) {
                  urlString = imageUrl.toString();
                } else {
                  // Can't normalize, return as-is
                  return imageUrl;
                }
              }
              
              // If it's already a static path, return as-is
              if (urlString.startsWith('/images/floral/')) {
                return urlString;
              }
              
              // Convert webpack-processed paths to static paths
              // Pattern: /static/media/floral1.xxx.png or /static/media/floral2.xxx.png
              // Check floral2 first because "floral1" is a substring of "floral2"
              if (urlString.includes('floral2')) {
                return '/images/floral/floral2.png';
              } else if (urlString.includes('/static/media/floral') || urlString.includes('floral1')) {
                return '/images/floral/floral1.png';
              }
              
              // Return original if no match
              return urlString;
            };
            
            // Normalize floral array imageUrls
            const normalizedFloral = (dbProduct.floral || []).map(floralItem => ({
              ...floralItem,
              imageUrl: normalizeFloralImageUrl(floralItem.imageUrl)
            }));
            const config = {
              id: dbProduct.id,
              name: dbProduct.name,
              productCategory: dbProduct.product_category,
              previewImage: dbProduct.preview_image_url,
              imageUrl: dbProduct.product_image_url,
              overlayUrl: dbProduct.product_overlay_url,
              realWorldWidth: dbProduct.real_world_width,
              realWorldHeight: dbProduct.real_world_height,
              canvas: dbProduct.canvas_width || dbProduct.canvas_height ? {
                width: dbProduct.canvas_width,
                height: dbProduct.canvas_height
              } : null,
              availableMaterials: dbProduct.available_materials || [],
              defaultMaterialId: dbProduct.default_material_id,
              editZones: dbProduct.edit_zones || [],
              productBase: dbProduct.product_base || [],
              floral: normalizedFloral,
              vaseDimensions: dbProduct.vase_dimensions || {},
              availableViews: dbProduct.available_views || ['front']
            };
            setProductConfig(config);
          } else {
            console.warn('Product config not found in database for productId:', productId);
            setError(`Product configuration not found for product: ${productId}`);
          }
        } else {
          setError('Product ID not found in project data');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/projects');
  };

  const handleProjectTitleClick = () => {
    navigate('/projects');
  };

  // Prepare initial data for Design Studio - memoized to prevent unnecessary recalculations
  const initialData = useMemo(() => {
    if (!selectedProduct || !project || !productConfig) return null;
    
    // Get saved material from product or project
    // Always look up the full material object from the materials array using the ID
    const savedMaterialId = selectedProduct.selectedMaterialId || 
                            (selectedProduct.selectedMaterial && selectedProduct.selectedMaterial.id);
    const savedMaterial = savedMaterialId ? materials.find(m => m.id === savedMaterialId) : null;
    
    console.log('Loading saved material:', {
      selectedProductId: selectedProduct.selectedMaterialId,
      selectedMaterial: selectedProduct.selectedMaterial,
      savedMaterialId,
      savedMaterial
    });
    
    // Get current view from project, but always default to 'front' on initial load
    // This ensures we always start with the front view, regardless of what was saved
    const availableViewsList = productConfig?.availableViews || ['front'];
    // Always default to 'front' if it's available, otherwise use the first available view
    const currentView = availableViewsList.includes('front') ? 'front' : (availableViewsList[0] || 'front');
    
    // Get design elements (new structure: { "front": [...], "back": [...] })
    // Support both new format (object with view keys) and old format (array)
    let designElements = {};
    if (selectedProduct.customizations?.designElements) {
      console.log('EditModeView: Raw designElements from DB:', selectedProduct.customizations.designElements);
      console.log('EditModeView: designElements type:', typeof selectedProduct.customizations.designElements);
      console.log('EditModeView: designElements isArray:', Array.isArray(selectedProduct.customizations.designElements));
      
      if (Array.isArray(selectedProduct.customizations.designElements)) {
        // Old format: array - convert to new format with front view
        designElements = { front: selectedProduct.customizations.designElements };
        console.log('EditModeView: Converted array to object format:', designElements);
      } else if (typeof selectedProduct.customizations.designElements === 'object' && selectedProduct.customizations.designElements !== null) {
        // New format: object with view keys - use as-is, but fix nested structure if needed
        designElements = { ...selectedProduct.customizations.designElements };
        
        // Fix nested structure: if back.front exists, it means back was saved incorrectly
        // Check if any view key contains an object instead of an array
        Object.keys(designElements).forEach(viewKey => {
          const viewElements = designElements[viewKey];
          if (viewElements && typeof viewElements === 'object' && !Array.isArray(viewElements)) {
            // This is a nested object - check if it has view keys
            if (viewElements.back || viewElements.front) {
              console.warn(`EditModeView: Found nested structure for view "${viewKey}", fixing...`);
              // Use the matching key if it exists, otherwise use the first array found
              if (viewElements[viewKey] && Array.isArray(viewElements[viewKey])) {
                designElements[viewKey] = viewElements[viewKey];
              } else {
                // Try to find any array in the nested object
                const arrayValue = Object.values(viewElements).find(v => Array.isArray(v));
                if (arrayValue) {
                  designElements[viewKey] = arrayValue;
                } else {
                  designElements[viewKey] = [];
                }
              }
            }
          }
        });
        
        console.log('EditModeView: Using object format (after fix):', designElements);
        console.log('EditModeView: Back elements:', designElements.back);
        console.log('EditModeView: Back elements length:', designElements.back?.length);
        console.log('EditModeView: Back elements isArray:', Array.isArray(designElements.back));
      }
    } else {
      // No design elements - initialize with empty object
      designElements = {};
      console.log('EditModeView: No design elements found, initializing empty object');
    }
    
    // Merge product config with any saved customizations
    const data = {
      ...productConfig,
      realWorldWidth: productConfig.realWorldWidth || 24,
      realWorldHeight: productConfig.realWorldHeight || 18,
      editZones: productConfig.editZones || [],
      designElements, // Pass full object with view keys, not just current view
      currentView,
      availableViews: productConfig.availableViews || ['front'], // Include available views from product
      canvasDimensions: selectedProduct.customizations?.canvasDimensions || null, // Include saved canvas dimensions
      material: savedMaterial // Include saved material in initial data
    };
    
    console.log('EditModeView: getInitialData - availableViews:', data.availableViews, 'from productConfig:', productConfig.availableViews);
    
    return data;
  }, [selectedProduct, project, productConfig]); // Only recalculate when these dependencies change

  const handleSave = async (updatedProjectData) => {
    console.log('Saving project:', updatedProjectData);
    
    try {
      // Update the single product's customizations with the saved design elements
      const updatedProduct = {
        ...selectedProduct,
        currentView: updatedProjectData.currentView || 'front', // Save current view
        customizations: {
          ...selectedProduct.customizations,
          designElements: updatedProjectData.designElements || [], // Now an object with view keys
          canvasDimensions: updatedProjectData.canvasDimensions || null // Save canvas dimensions
        },
        configured: true
      };

      const result = await updateProject(projectId, {
        template: updatedProduct, // Still called 'template' in DB for backward compatibility
        material: updatedProjectData.material, // Include selected material
        previewImageUrl: updatedProjectData.previewImageUrl, // Include preview image URL if captured
        lastEdited: new Date().toISOString()
      });

      if (result.success) {
        // Optimized: Don't update selectedProduct after save to prevent unnecessary repopulation
        // The canvas already has the latest data, and the database has been updated
        // Only update if preview image changed (for thumbnail updates)
        // The selectedProduct will be refreshed if the user reloads the page
        
        // Only update project if preview image changed (for thumbnail updates in project list)
        if (result.data?.previewImageUrl && project && result.data.previewImageUrl !== project.previewImageUrl) {
          setProject(prevProject => ({
            ...prevProject,
            previewImageUrl: result.data.previewImageUrl,
            updatedAt: result.data.updatedAt || prevProject.updatedAt
          }));
        }
        
        // Success message is handled by AlertMessage component in DesignStudio
      } else {
        // Error message is handled by AlertMessage component in DesignStudio
      }
    } catch (error) {
      console.error('Error saving project:', error);
      // Error message is handled by AlertMessage component in DesignStudio
    }
  };

  const handleClose = () => {
    handleBack();
  };

  if (loading) {
    return (
      <div className="canvas-layout">
        <div className="loading-message">Loading product...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Error: {error}</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  if (!project || !selectedProduct) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Product not found</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  if (!productConfig) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Loading product configuration...</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Failed to load product data</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  // Render Design Studio
  return (
    <DesignStudio
      initialData={initialData}
      materials={materials}
      artwork={artwork}
      onSave={handleSave}
      onClose={handleClose}
      onHandlersReady={setDesignStudioHandlers}
      projectTitle={project?.title}
      projectId={projectId}
    />
  );
};

export default EditModeView;
