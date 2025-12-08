import React, { useState, useEffect } from 'react';
import { uploadArtworkFile } from '../../utils/storageService';
import './ProductEditForm.css'; // Reuse styles

const ArtworkEditForm = ({ artwork, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    imageUrl: '',
    textureUrl: '',
    defaultWidth: 5.0,
    isActive: true
  });

  const [uploadingFiles, setUploadingFiles] = useState({
    image: false,
    texture: false
  });
  const [imageFiles, setImageFiles] = useState({
    image: null,
    texture: null
  });

  useEffect(() => {
    if (artwork) {
      // Convert database format to form format
      setFormData({
        id: artwork.id || '',
        name: artwork.name || '',
        category: artwork.category || '',
        imageUrl: artwork.image_url || '',
        textureUrl: artwork.texture_url || '',
        defaultWidth: artwork.default_width?.toString() || '5.0',
        isActive: artwork.is_active !== undefined ? artwork.is_active : true
      });
      setImageFiles({ image: null, texture: null });
    } else {
      // Reset form for new artwork
      setFormData({
        id: '',
        name: '',
        category: '',
        imageUrl: '',
        textureUrl: '',
        defaultWidth: '5.0',
        isActive: true
      });
      setImageFiles({ image: null, texture: null });
    }
  }, [artwork]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (fileType, e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFiles(prev => ({ ...prev, [fileType]: file }));
    }
  };

  const handleUploadFile = async (fileType) => {
    const file = imageFiles[fileType];
    if (!file || !formData.id) {
      alert(`Please select a file and enter an artwork ID first`);
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [fileType]: true }));
    try {
      const url = await uploadArtworkFile(file, formData.id, fileType);
      setFormData(prev => ({
        ...prev,
        [fileType === 'image' ? 'imageUrl' : 'textureUrl']: url
      }));
      setImageFiles(prev => ({ ...prev, [fileType]: null }));
      alert(`${fileType === 'image' ? 'Image' : 'Texture'} uploaded successfully!`);
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      alert(`Failed to upload ${fileType}. Please try again.`);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.id || !formData.name || !formData.category) {
      alert('Please fill in all required fields (ID, Name, Category)');
      return;
    }

    if (!formData.imageUrl) {
      alert('Please upload an image file for the artwork');
      return;
    }

    const artworkData = {
      id: formData.id,
      name: formData.name,
      category: formData.category,
      imageUrl: formData.imageUrl || null,
      textureUrl: formData.textureUrl || null,
      defaultWidth: parseFloat(formData.defaultWidth) || 5.0,
      isActive: formData.isActive
    };

    onSave(artworkData);
  };

  return (
    <div className="product-edit-form">
      <div className="form-header">
        <h3>{artwork ? 'Edit Artwork' : 'Add New Artwork'}</h3>
        <div className="form-actions-header">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" form="artwork-form" className="save-button">
            Save
          </button>
        </div>
      </div>

      <form id="artwork-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-section">
            <h4>Basic Information</h4>
            
            <div className="form-group">
              <label>Artwork ID *</label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                required
                disabled={!!artwork}
                placeholder="panel-03"
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
                placeholder="PANEL03"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                placeholder="Panels"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                <option value="Panels" />
                <option value="Border" />
                <option value="Floral" />
                <option value="Religious" />
                <option value="Symbols" />
              </datalist>
            </div>

            <div className="form-group">
              <label>Default Width (inches) *</label>
              <input
                type="number"
                name="defaultWidth"
                value={formData.defaultWidth}
                onChange={handleChange}
                required
                step="0.1"
                min="0.1"
                placeholder="5.0"
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
          </div>

          <div className="form-section">
            <h4>Artwork Files</h4>

            {/* Image URL */}
            <div className="form-group">
              <label>Image URL</label>
              {formData.imageUrl && (
                <div style={{ marginBottom: '10px' }}>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    style={{ maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <input
                type="text"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
                readOnly
              />
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".dxf,.svg,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileChange('image', e)}
                  disabled={uploadingFiles.image || !formData.id}
                />
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => handleUploadFile('image')}
                  disabled={!imageFiles.image || uploadingFiles.image || !formData.id}
                >
                  {uploadingFiles.image ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Texture URL */}
            <div className="form-group">
              <label>Texture URL (Optional)</label>
              {formData.textureUrl && (
                <div style={{ marginBottom: '10px' }}>
                  <img
                    src={formData.textureUrl}
                    alt="Texture Preview"
                    style={{ maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <input
                type="text"
                name="textureUrl"
                value={formData.textureUrl}
                onChange={handleChange}
                placeholder="https://..."
                readOnly
              />
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handleFileChange('texture', e)}
                  disabled={uploadingFiles.texture || !formData.id}
                />
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => handleUploadFile('texture')}
                  disabled={!imageFiles.texture || uploadingFiles.texture || !formData.id}
                >
                  {uploadingFiles.texture ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {onDelete && (
          <div className="form-footer">
            <button
              type="button"
              className="delete-button"
              onClick={onDelete}
            >
              Delete Artwork
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ArtworkEditForm;

