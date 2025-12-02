import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import DesignStudio from '../features/DesignStudio/DesignStudio';
import { materials } from '../data/MaterialsData.js';
import { artwork } from '../data/ArtworkData.js';
import { products } from '../data/ProductData';

const EditModeView = ({ onHandlersReady }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
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
        if (result.data.template) {
          // New format: single product object (still called template in DB for backward compatibility)
          setSelectedProduct(result.data.template);
        } else if (result.data.templates && result.data.templates.length > 0) {
          // Legacy format: use first product from array
          console.log('EditModeView - Using first product from legacy templates array');
          setSelectedProduct(result.data.templates[0]);
        } else {
          setError('No product found for this project');
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

  // Prepare initial data for Design Studio
  const getInitialData = () => {
    if (!selectedProduct || !project) return null;

    // Find the product configuration from products data using templateId (ID format kept for backward compatibility)
    const productConfig = products[selectedProduct.templateId];
    
    if (!productConfig) {
      console.error('Product config not found for templateId:', selectedProduct.templateId);
      return null;
    }
    
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
    
    // Merge product config with any saved customizations
    return {
      ...productConfig,
      realWorldWidth: productConfig.realWorldWidth || 24,
      realWorldHeight: productConfig.realWorldHeight || 18,
      editZones: productConfig.editZones || [],
      designElements: selectedProduct.customizations?.designElements || [],
      canvasDimensions: selectedProduct.customizations?.canvasDimensions || null, // Include saved canvas dimensions
      material: savedMaterial // Include saved material in initial data
    };
  };

  const handleSave = async (updatedProjectData) => {
    console.log('Saving project:', updatedProjectData);
    
    try {
      // Update the single product's customizations with the saved design elements
      const updatedProduct = {
        ...selectedProduct,
        customizations: {
          ...selectedProduct.customizations,
          designElements: updatedProjectData.designElements || [],
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
        // Update local project state
        setProject(result.data);
        // Update selectedProduct with the new material from the saved result
        const updatedProductFromResult = {
          ...(result.data.template || updatedProduct),
          selectedMaterialId: updatedProjectData.material?.id,
          selectedMaterialName: updatedProjectData.material?.name,
          selectedMaterial: updatedProjectData.material // Include full material object
        };
        setSelectedProduct(updatedProductFromResult);
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

  const initialData = getInitialData();

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
