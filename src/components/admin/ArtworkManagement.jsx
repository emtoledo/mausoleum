import React, { useState, useEffect } from 'react';
import artworkService from '../../services/artworkService';
import ArtworkEditForm from './ArtworkEditForm';
import './Admin.css';

const ArtworkManagement = () => {
  const [artwork, setArtwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadArtwork();
    loadCategories();
  }, []);

  const loadArtwork = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artworkService.getAllArtwork(true); // Include inactive
      if (result.success) {
        // Sort artwork by category, then by name
        const sortedArtwork = (result.data || []).sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });
        setArtwork(sortedArtwork);
      } else {
        setError(result.error || 'Failed to load artwork');
      }
    } catch (err) {
      setError('Error loading artwork');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const result = await artworkService.getAllCategories();
    if (result.success) {
      setCategories(result.data || []);
    }
  };

  const handleArtworkClick = async (artworkId) => {
    const result = await artworkService.getArtworkById(artworkId);
    if (result.success) {
      setSelectedArtwork(result.data);
      setShowAddForm(false);
    }
  };

  const handleAddArtwork = () => {
    setSelectedArtwork(null);
    setShowAddForm(true);
  };

  const handleSaveArtwork = async (artworkData) => {
    try {
      let result;
      if (selectedArtwork) {
        // Update existing
        result = await artworkService.updateArtwork(selectedArtwork.id, artworkData);
      } else {
        // Create new
        result = await artworkService.createArtwork(artworkData);
      }

      if (result.success) {
        await loadArtwork();
        await loadCategories();
        setSelectedArtwork(null);
        setShowAddForm(false);
        setError(null);
      } else {
        setError(result.error || 'Failed to save artwork');
      }
    } catch (err) {
      setError('Error saving artwork');
      console.error(err);
    }
  };

  const handleDeleteArtwork = async (artworkId) => {
    if (!window.confirm('Are you sure you want to delete this artwork?')) {
      return;
    }

    try {
      const result = await artworkService.deleteArtwork(artworkId);
      if (result.success) {
        await loadArtwork();
        setSelectedArtwork(null);
        setShowAddForm(false);
        setError(null);
      } else {
        setError(result.error || 'Failed to delete artwork');
      }
    } catch (err) {
      setError('Error deleting artwork');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setSelectedArtwork(null);
    setShowAddForm(false);
    setError(null);
  };

  const filteredArtwork = filterCategory
    ? artwork.filter(item => item.category === filterCategory)
    : artwork;

  if (loading) {
    return <div className="admin-loading">Loading artwork...</div>;
  }

  return (
    <div className="products-management">
      <div className="products-header">
        <h2>Artwork Management</h2>
        <div className="products-actions">
          <button className="add-button primary" onClick={handleAddArtwork}>
            Add New Artwork
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {showAddForm || selectedArtwork ? (
        <ArtworkEditForm
          artwork={selectedArtwork}
          onSave={handleSaveArtwork}
          onCancel={handleCancel}
          onDelete={selectedArtwork ? () => handleDeleteArtwork(selectedArtwork.id) : null}
        />
      ) : (
        <>
          {categories.length > 0 && (
            <div className="products-filters">
              <label>
                Filter by Category:
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="admin-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="artwork-cards-container">
            {filteredArtwork.length === 0 ? (
              <div className="artwork-empty-state">
                No artwork found. Click "Add New Artwork" to create one.
              </div>
            ) : (
              <div className="artwork-cards-grid">
                {filteredArtwork.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleArtworkClick(item.id)}
                    className={`artwork-card ${!item.is_active ? 'inactive' : ''}`}
                  >
                    <div className="artwork-card-image-container">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="artwork-card-thumb"
                          onError={(e) => {
                            e.target.src = '/images/empty.png';
                          }}
                        />
                      ) : (
                        <div className="artwork-card-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="artwork-card-name">{item.name}</div>
                    <div className="artwork-card-meta">
                      <span className="artwork-card-category">{item.category}</span>
                      {item.default_width && (
                        <span className="artwork-card-width">{item.default_width}"</span>
                      )}
                      <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ArtworkManagement;

