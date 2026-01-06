import React, { useState, useEffect } from 'react';
import artworkTemplateService from '../../services/artworkTemplateService';
import productService from '../../services/productService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';

const ArtworkTemplatesManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]); // Store all templates for filtering
  const [products, setProducts] = useState([]); // Products that have templates
  const [selectedProductId, setSelectedProductId] = useState('all'); // Filter state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState({ isOpen: false, template: null });
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, template: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Load products that have associated templates
  useEffect(() => {
    const loadProducts = async () => {
      if (allTemplates.length === 0) {
        setProducts([]);
        return;
      }

      // Get unique product IDs from templates
      const productIds = [...new Set(
        allTemplates
          .map(t => t.product_id)
          .filter(id => id !== null && id !== undefined)
      )];

      if (productIds.length === 0) {
        setProducts([]);
        return;
      }

      try {
        // Load all products and filter to only those with templates
        const result = await productService.getAllProducts(true); // Include inactive products
        if (result.success && result.data) {
          const productsWithTemplates = result.data.filter(p => productIds.includes(p.id));
          // Sort by name
          productsWithTemplates.sort((a, b) => a.name.localeCompare(b.name));
          setProducts(productsWithTemplates);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setProducts([]);
      }
    };

    loadProducts();
  }, [allTemplates]);

  // Filter templates based on selected product
  useEffect(() => {
    if (selectedProductId === 'all') {
      setTemplates(allTemplates);
    } else {
      const filtered = allTemplates.filter(t => t.product_id === selectedProductId);
      setTemplates(filtered);
    }
  }, [selectedProductId, allTemplates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await artworkTemplateService.getAllTemplates();
      if (result.success) {
        const loadedTemplates = result.data || [];
        setAllTemplates(loadedTemplates);
        // Apply current filter
        if (selectedProductId === 'all') {
          setTemplates(loadedTemplates);
        } else {
          setTemplates(loadedTemplates.filter(t => t.product_id === selectedProductId));
        }
      } else {
        setError(result.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (template) => {
    setEditModal({ isOpen: true, template });
    setEditName(template.name || '');
  };

  const handleCloseEdit = () => {
    setEditModal({ isOpen: false, template: null });
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editModal.template || !editName.trim()) return;

    try {
      setSaving(true);
      const result = await artworkTemplateService.updateTemplate(editModal.template.id, {
        name: editName.trim()
      });

      if (result.success) {
        await loadTemplates();
        handleCloseEdit();
      } else {
        alert(result.error || 'Failed to update template');
      }
    } catch (err) {
      console.error('Error updating template:', err);
      alert('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (template) => {
    setDeleteConfirm({ isOpen: true, template });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.template) return;

    try {
      setDeleting(true);
      const result = await artworkTemplateService.deleteTemplate(deleteConfirm.template.id);

      if (result.success) {
        await loadTemplates();
        setDeleteConfirm({ isOpen: false, template: null });
      } else {
        alert(result.error || 'Failed to delete template');
        setDeleteConfirm({ isOpen: false, template: null });
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
      setDeleteConfirm({ isOpen: false, template: null });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, template: null });
  };

  if (loading) {
    return <div className="admin-loading">Loading artwork templates...</div>;
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>Error: {error}</p>
        <Button onClick={loadTemplates}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="artwork-templates-management">
      <div className="admin-section-header">
        <h2>Artwork Templates</h2>
        <p className="admin-section-description">
          Manage reusable artwork templates created from the design studio.
        </p>
      </div>

      {/* Product Filter Dropdown */}
      {products.length > 0 && (
        <div className="artwork-templates-filter" style={{ marginBottom: '20px' }}>
          <label htmlFor="product-filter" style={{ marginRight: '10px', fontWeight: '500' }}>
            Filter by Product:
          </label>
          <select
            id="product-filter"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              minWidth: '200px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          {selectedProductId !== 'all' && (
            <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>
              ({templates.length} template{templates.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="admin-empty-state">
          <p>
            {selectedProductId === 'all' 
              ? 'No artwork templates found.'
              : `No templates found for the selected product.`}
          </p>
          <p className="admin-empty-hint">
            {selectedProductId === 'all'
              ? 'Create templates by using "Save as Template" in the design studio.'
              : 'Try selecting a different product or create templates for this product.'}
          </p>
        </div>
      ) : (
        <div className="artwork-templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="artwork-template-card">
              <div className="artwork-template-preview">
                {template.preview_image_url ? (
                  <img
                    src={template.preview_image_url}
                    alt={template.name}
                    className="template-preview-image"
                  />
                ) : (
                  <div className="template-preview-placeholder">No Preview</div>
                )}
              </div>
              <div className="artwork-template-info">
                <h3 className="artwork-template-name">{template.name}</h3>
                {template.product_id && (
                  <p className="artwork-template-meta" style={{ fontWeight: '500', color: '#008FF0' }}>
                    Product: {products.find(p => p.id === template.product_id)?.name || template.product_id}
                  </p>
                )}
                <p className="artwork-template-meta">
                  Created: {new Date(template.created_at).toLocaleDateString()}
                </p>
                <p className="artwork-template-meta">
                  Elements: {Array.isArray(template.design_elements) ? template.design_elements.length : 0}
                </p>
              </div>
              <div className="artwork-template-actions">
 
                <Button
                  variant="danger"
                  size="small"
                  className="button--secondary"
                  onClick={() => handleDeleteClick(template)}
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleOpenEdit(template)}
                >
                  Edit
                </Button>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Template Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={handleCloseEdit}
        className="edit-template-modal"
      >
        <div className="edit-template-modal-content">
          <h3 className="edit-template-modal-title">Edit Template Name</h3>
          
          <div className="edit-template-form">
            <div className="form-group">
              <label htmlFor="template-name-edit" className="form-label">Template Name</label>
              <input
                id="template-name-edit"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="form-input"
                placeholder="Enter template name"
                autoFocus
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim() && !saving) {
                    handleSaveEdit();
                  }
                }}
              />
            </div>
          </div>

          <div className="edit-template-modal-actions">
            <Button
              variant="secondary"
              onClick={handleCloseEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Template"
        message={`Are you sure you want to delete template "${deleteConfirm.template?.name || ''}"? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Yes, Delete'}
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default ArtworkTemplatesManagement;

