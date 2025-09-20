# Template Configuration System

## Overview
This folder contains configuration files for the Valhalla Memorial template system.

## Files

### `templates.json`
This file defines all available memorial templates for the system.

**Location:** `/public/templates.json`

**Structure:**
```json
{
  "templates": [
    {
      "id": "template_1",
      "name": "Template 1",
      "baseImage": "template_1.png",
      "previewImage": "template_preview_sm_1.png",
      "text": "Template 1 Description",
      "category": "traditional",
      "available": true
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2024-01-01T00:00:00Z",
    "description": "Memorial template configurations"
  }
}
```

**Template Properties:**
- `id`: Unique identifier for the template
- `name`: Display name for the template
- `baseImage`: Main template image file (stored in `/public/images/template/`)
- `previewImage`: Small preview image file (stored in `/public/images/template/`)
- `text`: Description or default text for the template
- `category`: Template category ("traditional" or "custom")
- `available`: Whether the template is available for selection

## Image Files
Template images should be stored in `/public/images/template/`:

**Required Files:**
- `template_1.png` - Base image for Template 1
- `template_preview_sm_1.png` - Preview image for Template 1
- `template_2.png` - Base image for Template 2
- `template_preview_sm_2.png` - Preview image for Template 2
- ... (continues for templates 3-6)

## Project Data Structure
Each project can hold up to 6 templates with the following structure:

```javascript
{
  id: "project_id",
  title: "Customer Name",
  markerHeadline: "Marker Headline",
  year: "Year",
  epitaph: "Epitaph text",
  memorialType: "upright" | "flat",
  memorialStyle: "traditional" | "custom",
  templates: [
    {
      templateId: "template_1",
      templateName: "Template 1",
      baseImage: "template_1.png",
      previewImage: "template_preview_sm_1.png",
      text: "Template 1 Description",
      category: "traditional",
      selected: false,
      configured: false,
      customizations: {
        text: "Template 1 Description",
        colors: {},
        fonts: {},
        layout: {}
      }
    }
    // ... up to 6 templates
  ],
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## Usage
The template system is managed through:
- `templateService.js` - Loads and manages template configurations
- `dataService.js` - Manages project templates and selections

## Adding New Templates
1. Add template images to `/public/images/template/`
2. Update `templates.json` with new template configuration
3. Templates will be automatically available in new projects
