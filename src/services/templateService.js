// Template service for managing memorial templates
class TemplateService {
  constructor() {
    this.templates = null;
    this.loaded = false;
  }

  // Load templates from JSON configuration
  async loadTemplates() {
    if (this.loaded && this.templates) {
      return this.templates;
    }

    try {
      console.log('Loading templates from /templates.json');
      const response = await fetch('/templates.json');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`);
      }
      
      const config = await response.json();
      console.log('Raw config:', config);
      this.templates = config.templates;
      this.loaded = true;
      
      console.log('Templates loaded successfully:', this.templates);
      return this.templates;
    } catch (error) {
      console.error('Error loading templates:', error);
      // Return empty array as fallback
      this.templates = [];
      this.loaded = true;
      return this.templates;
    }
  }

  // Get all available templates
  async getAllTemplates() {
    await this.loadTemplates();
    return this.templates || [];
  }

  // Get templates by type and style
  async getTemplatesByTypeAndStyle(type, style) {
    const templates = await this.getAllTemplates();
    console.log('All templates:', templates);
    console.log('Filtering by type:', type, 'style:', style);
    
    // Log each template's properties for debugging
    templates.forEach((template, index) => {
      console.log(`Template ${index + 1}:`, {
        id: template.id,
        name: template.name,
        type: template.type,
        style: template.style,
        available: template.available
      });
    });
    
    const filteredTemplates = templates.filter(template => {
      // Ensure we're doing strict string comparison
      const templateType = String(template.type).trim();
      const templateStyle = String(template.style).trim();
      const searchType = String(type).trim();
      const searchStyle = String(style).trim();
      
      const matchesType = templateType === searchType;
      const matchesStyle = templateStyle === searchStyle;
      const isAvailable = template.available === true;
      
      console.log(`Template ${template.id}:`, {
        templateType: templateType,
        templateStyle: templateStyle,
        searchType: searchType,
        searchStyle: searchStyle,
        typeMatch: matchesType,
        styleMatch: matchesStyle,
        available: isAvailable,
        willInclude: matchesType && matchesStyle && isAvailable
      });
      
      return matchesType && matchesStyle && isAvailable;
    });
    
    console.log('Filtered templates:', filteredTemplates);
    return filteredTemplates;
  }

  // Get a specific template by ID
  async getTemplateById(id) {
    const templates = await this.getAllTemplates();
    return templates.find(template => template.id === id);
  }

  // Get available templates (where available: true)
  async getAvailableTemplates() {
    const templates = await this.getAllTemplates();
    return templates.filter(template => template.available);
  }

  // Get templates for a specific memorial style (legacy support)
  async getTemplatesForStyle(style) {
    const templates = await this.getAllTemplates();
    return templates.filter(template => template.style === style);
  }

  // Get templates for a specific memorial type and style
  async getTemplatesForMemorial(type, style) {
    return await this.getTemplatesByTypeAndStyle(type, style);
  }

  // Initialize project with default templates
  async initializeProjectTemplates(projectId) {
    const availableTemplates = await this.getAvailableTemplates();
    
    // Limit to 6 templates as specified
    const projectTemplates = availableTemplates.slice(0, 6).map(template => ({
      templateId: template.id,
      templateName: template.name,
      baseImage: template.baseImage,
      previewImage: template.previewImage,
      text: template.text,
      type: template.type,
      style: template.style,
      category: template.category, // Legacy support
      selected: false,
      configured: false,
      customizations: {
        text: template.text,
        colors: {},
        fonts: {},
        layout: {}
      }
    }));

    return projectTemplates;
  }

  // Update template configuration for a project
  updateTemplateConfiguration(projectTemplates, templateId, updates) {
    return projectTemplates.map(template => {
      if (template.templateId === templateId) {
        return {
          ...template,
          ...updates,
          configured: true
        };
      }
      return template;
    });
  }

  // Select a template for a project
  selectTemplate(projectTemplates, templateId) {
    return projectTemplates.map(template => ({
      ...template,
      selected: template.templateId === templateId
    }));
  }

  // Get selected template from project
  getSelectedTemplate(projectTemplates) {
    return projectTemplates.find(template => template.selected);
  }

  // Get template image path
  getTemplateImagePath(imageName) {
    return `/images/templates/${imageName}`;
  }

  // Get preview image path
  getPreviewImagePath(imageName) {
    return `/images/templates/${imageName}`;
  }
}

// Create and export a singleton instance
const templateService = new TemplateService();
export default templateService;
