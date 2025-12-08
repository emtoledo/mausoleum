import React, { useState, useEffect } from 'react';
import { uploadProductImage } from '../../utils/storageService';
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
    dimensionsForDisplay: '',
    availableViews: ['front']
  });

  const [materialsInput, setMaterialsInput] = useState('');
  const [editZonesJson, setEditZonesJson] = useState('[]');
  const [productBaseJson, setProductBaseJson] = useState('[]');
  const [floralJson, setFloralJson] = useState('[]');
  const [uploadingImages, setUploadingImages] = useState({
    preview: false,
    product: false,
    overlay: false
  });
  const [imageFiles, setImageFiles] = useState({
    preview: null,
    product: null,
    overlay: null
  });

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
        dimensionsForDisplay: product.dimensions_for_display || '',
        availableViews: product.available_views || ['front']
      });

      setMaterialsInput((product.available_materials || []).join(', '));
      setEditZonesJson(JSON.stringify(product.edit_zones || [], null, 2));
      setProductBaseJson(JSON.stringify(product.product_base || [], null, 2));
      setFloralJson(JSON.stringify(product.floral || [], null, 2));
    } else {
      // Default values for new product
      const defaultEditZones = [
        {
          id: 'main-zone',
          x: 10,
          y: 2.5,
          width: 46,
          height: 21
        }
      ];

      const defaultFloral = [
        {
          id: 'floral1',
          imageUrl: '/images/floral/floral2.png', // Using public path since floral images are still in repo
          x: 0,
          y: 7,
          width: 9,
          height: 11
        },
        {
          id: 'floral2',
          imageUrl: '/images/floral/floral2.png',
          x: 57,
          y: 7,
          width: 9,
          height: 11
        }
      ];

      const defaultVaseDimensions = {
        width: 6,
        height: 10
      };

      const defaultProductBase = [
        {
          id: 'default-base',
          x: 0,
          y: 30,
          width: 66,
          height: 4,
          material: 'mat-006'
        }
      ];

      // Reset form for new product with default values
      setFormData({
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
        availableMaterials: ['mat-001', 'mat-002', 'mat-003', 'mat-004', 'mat-005'],
        defaultMaterialId: 'mat-001',
        isActive: true,
        editZones: defaultEditZones,
        productBase: defaultProductBase,
        floral: defaultFloral,
        dimensionsForDisplay: defaultDimensionsForDisplay,
        availableViews: ['front']
      });
      setMaterialsInput('mat-001, mat-002, mat-003, mat-004, mat-005');
      setEditZonesJson(JSON.stringify(defaultEditZones, null, 2));
      setProductBaseJson(JSON.stringify(defaultProductBase, null, 2));
      setFloralJson(JSON.stringify(defaultFloral, null, 2));
      setImageFiles({ preview: null, product: null, overlay: null });
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
      id: formData.id,
      name: formData.name,
      productCategory: formData.productCategory,
      previewImage: formData.previewImage || null,
      imageUrl: formData.imageUrl || null,
      overlayUrl: formData.overlayUrl || null,
      realWorldWidth: parseFloat(formData.realWorldWidth),
      realWorldHeight: parseFloat(formData.realWorldHeight),
      canvasWidth: formData.canvasWidth ? parseFloat(formData.canvasWidth) : null,
      canvasHeight: formData.canvasHeight ? parseFloat(formData.canvasHeight) : null,
      canvas: formData.canvasWidth || formData.canvasHeight ? {
        width: formData.canvasWidth ? parseFloat(formData.canvasWidth) : null,
        height: formData.canvasHeight ? parseFloat(formData.canvasHeight) : null
      } : null,
      availableMaterials: materialsInput.split(',').map(m => m.trim()).filter(m => m),
      defaultMaterialId: formData.defaultMaterialId || null,
      isActive: formData.isActive,
      editZones,
      productBase,
      floral,
      dimensionsForDisplay: formData.dimensionsForDisplay || null,
      availableViews: formData.availableViews || ['front']
    };

    onSave(productData);
  };

  return (
    <div className="product-edit-form">
      <div className="form-header">
        <h3>{product ? 'Edit Product' : 'Add New Product'}</h3>
        <div className="form-actions-header">
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
            <label className="form-group-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>Active</span>
              </label>
            </div>

            <div className="form-group">
              <label>Select available views for this product:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label className="form-group-label">
                  <input
                    type="checkbox"
                    checked={formData.availableViews.includes('front')}
                    disabled={formData.availableViews.includes('top')}
                    onChange={(e) => {
                      const views = e.target.checked
                        ? [...formData.availableViews.filter(v => v !== 'top'), 'front']
                        : formData.availableViews.filter(v => v !== 'front');
                      setFormData({ ...formData, availableViews: views.length > 0 ? views : ['front'] });
                    }}
                  />
                  <span>Front</span>
                </label>
                <label className="form-group-label">
                  <input
                    type="checkbox"
                    checked={formData.availableViews.includes('back')}
                    disabled={formData.availableViews.includes('top')}
                    onChange={(e) => {
                      const views = e.target.checked
                        ? [...formData.availableViews.filter(v => v !== 'top'), 'back']
                        : formData.availableViews.filter(v => v !== 'back');
                      setFormData({ ...formData, availableViews: views.length > 0 ? views : ['front'] });
                    }}
                  />
                  <span>Back</span>
                </label>
                <label className="form-group-label">
                  <input
                    type="checkbox"
                    checked={formData.availableViews.includes('top')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // If Top is selected, only allow Top (clear Front/Back)
                        setFormData({ ...formData, availableViews: ['top'] });
                      } else {
                        // If Top is deselected, default to Front
                        setFormData({ ...formData, availableViews: ['front'] });
                      }
                    }}
                  />
                  <span>Top</span>
                </label>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Note: Selecting "Top" will disable Front/Back options. Products with Front + Back allow switching between views in the design studio.
                </p>
              </div>
            </div>



          </div>



          <div className="form-section">
            <h4>Images</h4>
            
            <div className="form-group">
              <label>Preview Image</label>
              <div className="image-upload-container">
              {formData.previewImage && (
                <img src={formData.previewImage} alt="Preview" className="preview-image" />
              )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFiles(prev => ({ ...prev, preview: file }));
                    }
                  }}
                  className="file-input"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.id) {
                      alert('Please enter a Product ID first');
                      return;
                    }
                    if (!imageFiles.preview) {
                      alert('Please select an image file');
                      return;
                    }
                    setUploadingImages(prev => ({ ...prev, preview: true }));
                    try {
                      const url = await uploadProductImage(imageFiles.preview, formData.id, 'preview');
                      setFormData(prev => ({ ...prev, previewImage: url }));
                      setImageFiles(prev => ({ ...prev, preview: null }));
                    } catch (error) {
                      alert('Error uploading image: ' + error.message);
                    } finally {
                      setUploadingImages(prev => ({ ...prev, preview: false }));
                    }
                  }}
                  disabled={uploadingImages.preview || !imageFiles.preview || !formData.id}
                  className="upload-button"
                >
                  {uploadingImages.preview ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <input
                type="text"
                name="previewImage"
                value={formData.previewImage}
                onChange={handleChange}
                placeholder="Or enter image URL directly"
                style={{ marginTop: '8px' }}
              />
              
            </div>

            <div className="form-group">
              <label>Product Image</label>
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFiles(prev => ({ ...prev, product: file }));
                    }
                  }}
                  className="file-input"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.id) {
                      alert('Please enter a Product ID first');
                      return;
                    }
                    if (!imageFiles.product) {
                      alert('Please select an image file');
                      return;
                    }
                    setUploadingImages(prev => ({ ...prev, product: true }));
                    try {
                      const url = await uploadProductImage(imageFiles.product, formData.id, 'product');
                      setFormData(prev => ({ ...prev, imageUrl: url }));
                      setImageFiles(prev => ({ ...prev, product: null }));
                    } catch (error) {
                      alert('Error uploading image: ' + error.message);
                    } finally {
                      setUploadingImages(prev => ({ ...prev, product: false }));
                    }
                  }}
                  disabled={uploadingImages.product || !imageFiles.product || !formData.id}
                  className="upload-button"
                >
                  {uploadingImages.product ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <input
                type="text"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Or enter image URL directly"
                style={{ marginTop: '8px' }}
              />
            </div>

            <div className="form-group">
              <label>Overlay Image</label>
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFiles(prev => ({ ...prev, overlay: file }));
                    }
                  }}
                  className="file-input"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.id) {
                      alert('Please enter a Product ID first');
                      return;
                    }
                    if (!imageFiles.overlay) {
                      alert('Please select an image file');
                      return;
                    }
                    setUploadingImages(prev => ({ ...prev, overlay: true }));
                    try {
                      const url = await uploadProductImage(imageFiles.overlay, formData.id, 'overlay');
                      setFormData(prev => ({ ...prev, overlayUrl: url }));
                      setImageFiles(prev => ({ ...prev, overlay: null }));
                    } catch (error) {
                      alert('Error uploading image: ' + error.message);
                    } finally {
                      setUploadingImages(prev => ({ ...prev, overlay: false }));
                    }
                  }}
                  disabled={uploadingImages.overlay || !imageFiles.overlay || !formData.id}
                  className="upload-button"
                >
                  {uploadingImages.overlay ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <input
                type="text"
                name="overlayUrl"
                value={formData.overlayUrl}
                onChange={handleChange}
                placeholder="Or enter image URL directly"
                style={{ marginTop: '8px' }}
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Studio Dimensions</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Base Width (inches)</label>
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
                <label>Die Height + 2 (inches)</label>
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
            <h4>Dimensions for Display</h4>
            <div className="form-group">
              <label>Real world dimensions for display in approval documents</label>
              <textarea
                value={formData.dimensionsForDisplay}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensionsForDisplay: e.target.value
                }))}
                placeholder="e.g., &lt;div&gt;Base: 66&quot; x 4&quot;&lt;/div&gt;&lt;div&gt;Vase: 6&quot; x 10&quot;&lt;/div&gt;"
                rows={4}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '14px' }}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                HTML is supported for formatting.
              </small>
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

      <div className="form-actions-footer">   
      <button type="submit" form="product-form" className="save-button">
            Save
          </button>         
      {product && onDelete && (
            <button
              type="button"
              className="delete-button"
              onClick={() => onDelete(product.id)}
            >
              Delete Product
            </button>
          )}
          </div>
      
    </div>
  );
};

export default ProductEditForm;

