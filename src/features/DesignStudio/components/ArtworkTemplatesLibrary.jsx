/**
 * ArtworkTemplatesLibrary Component
 * 
 * Displays saved artwork templates for selection and loading into the design studio.
 * Similar to ArtworkLibrary but shows templates instead of individual artwork items.
 */

import React, { useState, useEffect } from 'react';
import artworkTemplateService from '../../../services/artworkTemplateService';

/**
 * @param {Function} onSelectTemplate - Callback fired when a template is selected
 * @param {Function} onClose - Callback fired when the close button is clicked
 * @returns {JSX.Element}
 */
const ArtworkTemplatesLibrary = ({ onSelectTemplate, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const result = await artworkTemplateService.getAllTemplates();
        if (result.success) {
          setTemplates(result.data || []);
        } else {
          console.error('Failed to load templates:', result.error);
          setTemplates([]);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  /**
   * Filter templates based on search term
   */
  const filteredTemplates = templates.filter(template => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return template.name.toLowerCase().includes(searchLower);
  });

  /**
   * Handle template item click
   */
  const handleTemplateClick = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="artwork-library add-panel-container">
      {/* Sticky Header */}
      <div className="artwork-library-header">
        <div className="artwork-library-title-row">
          <h3 className="artwork-library-title">Artwork Templates</h3>
          {onClose && (
            <button
              className="artwork-library-close"
              onClick={onClose}
              aria-label="Close Template Library"
              type="button"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="artwork-library-controls">
          <div className="control-group">
            <label htmlFor="search-templates" className="control-label">
              Search
            </label>
            <input
              id="search-templates"
              type="text"
              className="control-input"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={handleSearchChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Results Count */}
        {searchTerm.trim() !== '' && !loading && (
          <div className="artwork-library-results">
            Showing {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
          </div>
        )}
      </div>

      {/* Templates Grid */}
      <div className="artwork-library-grid">
        {loading ? (
          <div className="artwork-library-empty">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="artwork-library-empty-search">
            {searchTerm.trim() ? 'No templates found matching your search.' : 'No templates available. Create templates using "Save as Template" in the design studio.'}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="artwork-item"
              onClick={() => handleTemplateClick(template)}
              role="button"
              tabIndex={0}
              aria-label={`Select template ${template.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTemplateClick(template);
                }
              }}
            >
              <div className="artwork-item-image">
                {template.preview_image_url ? (
                  <img 
                    src={template.preview_image_url} 
                    alt={template.name}
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Image load error for template ${template.name}:`, {
                        src: template.preview_image_url?.substring(0, 100)
                      });
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="template-preview-placeholder">No Preview</div>
                )}
              </div>
              <div className="artwork-item-info">
                <div className="artwork-item-name">{template.name}</div>
                <div className="artwork-item-category">
                  {Array.isArray(template.design_elements) 
                    ? `${template.design_elements.length} element${template.design_elements.length !== 1 ? 's' : ''}`
                    : '0 elements'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArtworkTemplatesLibrary;

