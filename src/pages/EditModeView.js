import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import DesignStudio from '../features/DesignStudio/DesignStudio';
import { materials } from '../data/MaterialsData.js';
import { artwork } from '../data/ArtworkData.js';
import { templates } from '../data/TemplateData';

const EditModeView = ({ onHandlersReady }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
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
        
        // Get the single template for this project
        if (result.data.template) {
          // New format: single template object
          setSelectedTemplate(result.data.template);
        } else if (result.data.templates && result.data.templates.length > 0) {
          // Legacy format: use first template from array
          console.log('EditModeView - Using first template from legacy templates array');
          setSelectedTemplate(result.data.templates[0]);
        } else {
          setError('No template found for this project');
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
    if (!selectedTemplate || !project) return null;

    // Find the template configuration from templates data using templateId
    const templateConfig = templates[selectedTemplate.templateId];
    
    if (!templateConfig) {
      console.error('Template config not found for templateId:', selectedTemplate.templateId);
      return null;
    }
    
    // Get saved material from template or project
    // Always look up the full material object from the materials array using the ID
    const savedMaterialId = selectedTemplate.selectedMaterialId || 
                            (selectedTemplate.selectedMaterial && selectedTemplate.selectedMaterial.id);
    const savedMaterial = savedMaterialId ? materials.find(m => m.id === savedMaterialId) : null;
    
    console.log('Loading saved material:', {
      selectedTemplateId: selectedTemplate.selectedMaterialId,
      selectedMaterial: selectedTemplate.selectedMaterial,
      savedMaterialId,
      savedMaterial
    });
    
    // Merge template config with any saved customizations
    return {
      ...templateConfig,
      realWorldWidth: templateConfig.realWorldWidth || 24,
      realWorldHeight: templateConfig.realWorldHeight || 18,
      editZones: templateConfig.editZones || [],
      designElements: selectedTemplate.customizations?.designElements || [],
      canvasDimensions: selectedTemplate.customizations?.canvasDimensions || null, // Include saved canvas dimensions
      material: savedMaterial // Include saved material in initial data
    };
  };

  const handleSave = async (updatedProjectData) => {
    console.log('Saving project:', updatedProjectData);
    
    try {
      // Update the single template's customizations with the saved design elements
      const updatedTemplate = {
        ...selectedTemplate,
        customizations: {
          ...selectedTemplate.customizations,
          designElements: updatedProjectData.designElements || [],
          canvasDimensions: updatedProjectData.canvasDimensions || null // Save canvas dimensions
        },
        configured: true
      };

      const result = await updateProject(projectId, {
        template: updatedTemplate,
        material: updatedProjectData.material, // Include selected material
        lastEdited: new Date().toISOString()
      });

      if (result.success) {
        // Update local project state
        setProject(result.data);
        // Update selectedTemplate with the new material from the saved result
        const updatedTemplateFromResult = {
          ...(result.data.template || updatedTemplate),
          selectedMaterialId: updatedProjectData.material?.id,
          selectedMaterialName: updatedProjectData.material?.name,
          selectedMaterial: updatedProjectData.material // Include full material object
        };
        setSelectedTemplate(updatedTemplateFromResult);
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
        <div className="loading-message">Loading template...</div>
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

  if (!project || !selectedTemplate) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Template not found</div>
        <Button onClick={handleBack}>Back to Projects</Button>
      </div>
    );
  }

  const initialData = getInitialData();

  if (!initialData) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Failed to load template data</div>
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
