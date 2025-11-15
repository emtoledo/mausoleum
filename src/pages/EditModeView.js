import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useProjectMutations } from '../hooks/useProjectMutations';
import DesignStudio from '../features/DesignStudio/DesignStudio';
import { materials } from '../data/MaterialsData.js';
import { artwork } from '../data/ArtworkData.js';
import { templates } from '../data/TemplateData.js';

const EditModeView = ({ onHandlersReady }) => {
  const { projectId, templateId } = useParams();
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
        
        // Find the selected template
        if (result.data.templates) {
          const template = result.data.templates.find(t => t.templateId === templateId);
          if (template) {
            setSelectedTemplate(template);
          } else {
            console.log('Template not found. Available templates:', result.data.templates);
            console.log('Looking for templateId:', templateId);
            setError('Template not found');
          }
        } else {
          setError('No templates found for this project');
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
    navigate(`/projects/${projectId}/templates`);
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
    
    // Merge template config with any saved customizations
    return {
      ...templateConfig,
      realWorldWidth: templateConfig.realWorldWidth || 24,
      realWorldHeight: templateConfig.realWorldHeight || 18,
      editZones: templateConfig.editZones || [],
      designElements: selectedTemplate.customizations?.designElements || templateConfig.designElements || []
    };
  };

  const handleSave = async (updatedProjectData) => {
    console.log('Saving project:', updatedProjectData);
    
    try {
      // Update the template's customizations with the saved design elements
      const updatedTemplates = project.templates.map(t => {
        if (t.templateId === selectedTemplate.templateId) {
          return {
            ...t,
            customizations: {
              ...t.customizations,
              designElements: updatedProjectData.designElements || []
            },
            configured: true
          };
        }
        return t;
      });

      const result = await updateProject(projectId, {
        templates: updatedTemplates,
        lastEdited: new Date().toISOString()
      });

      if (result.success) {
        // Update local project state
        setProject(result.data);
        alert('Project saved successfully!');
      } else {
        alert('Failed to save project. Please try again.');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('An error occurred while saving the project.');
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
        <Button onClick={handleBack}>Back to Templates</Button>
      </div>
    );
  }

  if (!project || !selectedTemplate) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Template not found</div>
        <Button onClick={handleBack}>Back to Templates</Button>
      </div>
    );
  }

  const initialData = getInitialData();

  if (!initialData) {
    return (
      <div className="canvas-layout">
        <div className="error-message">Failed to load template data</div>
        <Button onClick={handleBack}>Back to Templates</Button>
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
    />
  );
};

export default EditModeView;
