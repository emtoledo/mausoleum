import React, { useState, useEffect } from 'react';
import './ProductEditForm.css';

const ProductEditForm = ({ product, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    productCategory: '',
    previewImage: '',
    imageUrl: '',
    overlayUrl: '',
    realWorldWidth: '',
    realWorldHeight: '',
    canvasWidth: '',
    canvasHeight: '',
    availableMaterials: [],
    defaultMaterialId: '',
    isActive: true,
    editZones: [],
    productBase: [],
    floral: [],
    vaseDimensions: { width: '', height: '' }
  });

  const [materialsInput, setMaterialsInput] = useState('');
  const [editZonesJson, setEditZonesJson] = useState('');
  const [productBaseJson, setProductBaseJson] = useState('');
  const [floralJson, setFloralJson] = useState('');

  useEffect(() => {
    if (product) {
      // Convert database format to form format
      setFormData({
        id: product.id || '',
        name: product.name || '',
        productCategory: product.product_category || '',
        previewImage: product.preview_image_url || '',
        imageUrl: product.product_image_url || '',
        overlayUrl: product.product_overlay_url || '',
        realWorldWidth: product.real_world_width?.toString() || '',
        realWorldHeight: product.real_world_height?.toString() || '',
        canvasWidth: product.canvas_width?.toString() || '',
        canvasHeight: product.canvas_height?.toString() || '',
        availableMaterials: product.available_materials || [],
        defaultMaterialId: product.default_material_id || '',
        isActive: product.is_active !== undefined ? product.is_active : true,
        editZones: product.edit_zones || [],
        productBase: product.product_base || [],
        floral: product.floral || [],
        vaseDimensions: product.vase_dimensions || { width: '', height: '' }
      });

      setMaterialsInput((product.available_materials || []).join(', '));
      setEditZonesJson(JSON.stringify(product.edit_zones || [], null, 2));
      setProductBaseJson(JSON.stringify(product.product_base || [], null, 2));
      setFloralJson(JSON.stringify(product.floral || [], null, 2));
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMaterialsChange = (e) => {
    setMaterialsInput(e.target.value);
    const materials = e.target.value.split(',').map(m => m.trim()).filter(m => m);
    setFormData(prev => ({ ...prev, availableMaterials: materials }));
  };

  const handleJsonChange = (field, value) => {
    try {
      const parsed = JSON.parse(value);
      setFormData(prev => ({ ...prev, [field]: parsed }));
    } catch (e) {
      // Invalid JSON, but allow editing
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate JSON fields
    let editZones, productBase, floral;
    try {
      editZones = JSON.parse(editZonesJson);
    } catch (e) {
      alert('Invalid JSON in Edit Zones');
      return;
    }

    try {
      productBase = JSON.parse(productBaseJson);
    } catch (e) {
      alert('Invalid JSON in Product Base');
      return;
    }

    try {
      floral = JSON.parse(floralJson);
    } catch (e) {
      alert('Invalid JSON in Floral');
      return;
    }

    const productData = {
      ...formData,
      realWorldWidth: parseFloat(formData.realWorldWidth),
      realWorldHeight: parseFloat(formData.realWorldHeight),
      canvasWidth: formData.canvasWidth ? parseFloat(formData.canvasWidth) : null,
      canvasHeight: formData.canvasHeight ? parseFloat(formData.canvasHeight) : null,
      canvas: formData.canvasWidth || formData.canvasHeight ? {
        width: formData.canvasWidth ? parseFloat(formData.canvasWidth) : null,
        height: formData.canvasHeight ? parseFloat(formData.canvasHeight) : null
      } : null,
      editZones,
      productBase,
      floral,
      vaseDimensions: {
        width: formData.vaseDimensions.width ? parseFloat(formData.vaseDimensions.width) : null,
        height: formData.vaseDimensions.height ? parseFloat(formData.vaseDimensions.height) : null
      }
    };

    onSave(productData);
  };

  return (
    <div className="product-edit-form">
      <div className="form-header">
        <h3>{product ? 'Edit Product' : 'Add New Product'}</h3>
        <div className="form-actions-header">
          {product && onDelete && (
            <button
              type="button"
              className="delete-button"
              onClick={() => onDelete(product.id)}
            >
              Delete
            </button>
          )}
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="save-button">
            Save
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-section">
            <h4>Basic Information</h4>
            
            <div className="form-group">
              <label>Product ID *</label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                required
                disabled={!!product}
                placeholder="product-001"
              />
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Estate Collection 1"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                name="productCategory"
                value={formData.productCategory}
                onChange={handleChange}
                required
                placeholder="Estate Collection"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                Active
              </label>
            </div>
          </div>

          <div className="form-section">
            <h4>Images</h4>
            
            <div className="form-group">
              <label>Preview Image URL</label>
              <input
                type="text"
                name="previewImage"
                value={formData.previewImage}
                onChange={handleChange}
                placeholder="/images/previews/estate1.png"
              />
              {formData.previewImage && (
                <img src={formData.previewImage} alt="Preview" className="preview-image" />
              )}
            </div>

            <div className="form-group">
              <label>Product Image URL</label>
              <input
                type="text"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="/images/products/estate1.svg"
              />
            </div>

            <div className="form-group">
              <label>Overlay Image URL</label>
              <input
                type="text"
                name="overlayUrl"
                value={formData.overlayUrl}
                onChange={handleChange}
                placeholder="/images/products/estate1_overlay.svg"
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Dimensions</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Real World Width (inches) *</label>
                <input
                  type="number"
                  name="realWorldWidth"
                  value={formData.realWorldWidth}
                  onChange={handleChange}
                  required
                  step="0.01"
                  placeholder="84"
                />
              </div>

              <div className="form-group">
                <label>Real World Height (inches) *</label>
                <input
                  type="number"
                  name="realWorldHeight"
                  value={formData.realWorldHeight}
                  onChange={handleChange}
                  required
                  step="0.01"
                  placeholder="32"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Canvas Width (inches)</label>
                <input
                  type="number"
                  name="canvasWidth"
                  value={formData.canvasWidth}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="84"
                />
              </div>

              <div className="form-group">
                <label>Canvas Height (inches)</label>
                <input
                  type="number"
                  name="canvasHeight"
                  value={formData.canvasHeight}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="36"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Materials</h4>
            
            <div className="form-group">
              <label>Available Materials (comma-separated)</label>
              <input
                type="text"
                value={materialsInput}
                onChange={handleMaterialsChange}
                placeholder="mat-001, mat-002, mat-003"
              />
            </div>

            <div className="form-group">
              <label>Default Material ID</label>
              <input
                type="text"
                name="defaultMaterialId"
                value={formData.defaultMaterialId}
                onChange={handleChange}
                placeholder="mat-002"
              />
            </div>
          </div>

          <div className="form-section full-width">
            <h4>Vase Dimensions</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Width</label>
                <input
                  type="number"
                  value={formData.vaseDimensions.width}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vaseDimensions: { ...prev.vaseDimensions, width: e.target.value }
                  }))}
                  step="0.01"
                  placeholder="8"
                />
              </div>
              <div className="form-group">
                <label>Height</label>
                <input
                  type="number"
                  value={formData.vaseDimensions.height}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vaseDimensions: { ...prev.vaseDimensions, height: e.target.value }
                  }))}
                  step="0.01"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div className="form-section full-width">
            <h4>Edit Zones (JSON)</h4>
            <textarea
              value={editZonesJson}
              onChange={(e) => {
                setEditZonesJson(e.target.value);
                handleJsonChange('editZones', e.target.value);
              }}
              rows={6}
              className="json-textarea"
              placeholder='[{"id": "main-zone", "x": 13, "y": 3.5, "width": 58, "height": 22}]'
            />
          </div>

          <div className="form-section full-width">
            <h4>Product Base (JSON)</h4>
            <textarea
              value={productBaseJson}
              onChange={(e) => {
                setProductBaseJson(e.target.value);
                handleJsonChange('productBase', e.target.value);
              }}
              rows={6}
              className="json-textarea"
              placeholder='[{"id": "default-base", "x": 0, "y": 32, "width": 84, "height": 4, "material": "mat-006"}]'
            />
          </div>

          <div className="form-section full-width">
            <h4>Floral (JSON)</h4>
            <textarea
              value={floralJson}
              onChange={(e) => {
                setFloralJson(e.target.value);
                handleJsonChange('floral', e.target.value);
              }}
              rows={6}
              className="json-textarea"
              placeholder='[{"id": "floral1", "imageUrl": "/images/floral/floral1.png", "x": 1, "y": 8.5, "width": 10, "height": 15}]'
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductEditForm;

