import React, { useState, useEffect } from 'react';
import locationService from '../../services/locationService';
import './Admin.css';

/**
 * Generate a URL-friendly slug from a name
 */
const generateSlug = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
};

const LocationEditForm = ({ location, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    brand_title: '',
    projects_title: '',
    approval_proof_title: '',
    background_video_url: '',
    address: '',
    is_active: true
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = !!location;

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        slug: location.slug || '',
        brand_title: location.brand_title || '',
        projects_title: location.projects_title || '',
        approval_proof_title: location.approval_proof_title || '',
        background_video_url: location.background_video_url || '',
        address: location.address || '',
        is_active: location.is_active !== false
      });
      setSlugEdited(true); // Don't auto-generate slug when editing
    } else {
      setFormData({
        name: '',
        slug: '',
        brand_title: '',
        projects_title: '',
        approval_proof_title: '',
        background_video_url: '',
        address: '',
        is_active: true
      });
      setSlugEdited(false);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // Auto-generate slug from name if slug hasn't been manually edited
      if (name === 'name' && !slugEdited) {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
  };

  const handleSlugChange = (e) => {
    const { value } = e.target;
    // Sanitize slug input
    const sanitizedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    
    setFormData(prev => ({ ...prev, slug: sanitizedSlug }));
    setSlugEdited(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Location name is required');
      }
      if (!formData.slug.trim()) {
        throw new Error('Location slug is required');
      }

      let result;
      if (isEditMode) {
        result = await locationService.updateLocation(location.id, formData);
      } else {
        result = await locationService.createLocation(formData);
      }

      if (result.success) {
        onSave(result.data);
      } else {
        throw new Error(result.error || 'Failed to save location');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-edit-form location-edit-form">
      <div className="form-header">
        <h3>{isEditMode ? 'Edit Location' : 'Add New Location'}</h3>
        <button onClick={onClose} className="close-btn" title="Close">×</button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* Basic Info Section */}
        <div className="form-section">
          <h4>Basic Information</h4>
          
          <div className="form-group">
            <label htmlFor="name">Location Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Arlington Memorial"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">URL Slug *</label>
            <div className="slug-input-wrapper">
              <span className="slug-prefix">/</span>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="arlington-memorial"
                required
              />
            </div>
            <small className="form-help">
              URL path for this location (e.g., /arlington-memorial/login)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Memorial Drive&#10;City, State 12345"
              rows={3}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span>Active</span>
            </label>
            <small className="form-help">
              Inactive locations cannot be accessed
            </small>
          </div>
        </div>

        {/* Branding Section */}
        <div className="form-section">
          <h4>Branding</h4>
          
          <div className="form-group">
            <label htmlFor="brand_title">Brand Title</label>
            <input
              type="text"
              id="brand_title"
              name="brand_title"
              value={formData.brand_title}
              onChange={handleChange}
              placeholder="ARLINGTON MEMORIAL"
            />
            <small className="form-help">
              Displayed on login and signup pages
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="projects_title">Projects Title</label>
            <input
              type="text"
              id="projects_title"
              name="projects_title"
              value={formData.projects_title}
              onChange={handleChange}
              placeholder="ARLINGTON MEMORIAL"
            />
            <small className="form-help">
              Displayed on the All Projects page
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="approval_proof_title">Approval Proof Title</label>
            <input
              type="text"
              id="approval_proof_title"
              name="approval_proof_title"
              value={formData.approval_proof_title}
              onChange={handleChange}
              placeholder="ARLINGTON MEMORIAL PARK"
            />
            <small className="form-help">
              Displayed on approval proof documents
            </small>
          </div>
        </div>

        {/* Media Section */}
        <div className="form-section">
          <h4>Media</h4>
          
          <div className="form-group">
            <label htmlFor="background_video_url">Background Video URL</label>
            <input
              type="text"
              id="background_video_url"
              name="background_video_url"
              value={formData.background_video_url}
              onChange={handleChange}
              placeholder="/videos/custom_bg.mp4"
            />
            <small className="form-help">
              Video shown on login/signup pages (leave empty for default)
            </small>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="admin-btn primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEditMode ? 'Update Location' : 'Create Location')}
          </button>
          
          <button
            type="button"
            className="admin-btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          {isEditMode && onDelete && (
            <button
              type="button"
              className="admin-btn danger"
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LocationEditForm;
