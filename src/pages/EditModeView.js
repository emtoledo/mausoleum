import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import DesignStudio from '../features/DesignStudio/DesignStudio';
import { materials } from '../data/MaterialsData.js';
import { artwork } from '../data/ArtworkData.js';
import productService from '../services/productService';

const EditModeView = ({ onHandlersReady }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productConfig, setProductConfig] = useState(null);
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
  }, [projectId]);

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
              floral: dbProduct.floral || [],
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
    
    // Get current view from project or default to 'front'
    const currentView = selectedProduct.currentView || 'front';
    
    // Get design elements (new structure: { "front": [...], "back": [...] })
    // Support both new format (object with view keys) and old format (array)
    let designElements = {};
    if (selectedProduct.customizations?.designElements) {
      if (Array.isArray(selectedProduct.customizations.designElements)) {
        // Old format: array - convert to new format with front view
        designElements = { front: selectedProduct.customizations.designElements };
      } else if (typeof selectedProduct.customizations.designElements === 'object') {
        // New format: object with view keys - use as-is
        designElements = selectedProduct.customizations.designElements;
      }
    } else {
      // No design elements - initialize with empty object
      designElements = {};
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
        // Update local project state - batch updates to minimize re-renders
        // Only update if the data actually changed
        const updatedProject = result.data;
        const updatedProductFromResult = {
          ...(updatedProject.template || updatedProduct),
          selectedMaterialId: updatedProjectData.material?.id,
          selectedMaterialName: updatedProjectData.material?.name,
          selectedMaterial: updatedProjectData.material // Include full material object
        };
        
        // Use functional updates to batch state changes
        setProject(prevProject => {
          // Only update if data actually changed
          if (prevProject?.id === updatedProject.id) {
            return updatedProject;
          }
          return prevProject;
        });
        
        setSelectedProduct(prevProduct => {
          // Only update if data actually changed
          if (prevProduct?.templateId === updatedProductFromResult.templateId ||
              prevProduct?.id === updatedProductFromResult.id) {
            return updatedProductFromResult;
          }
          return prevProduct;
        });
        
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
