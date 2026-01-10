import React, { useState, useEffect } from 'react';
import artworkService from '../../services/artworkService';
import ArtworkEditForm from './ArtworkEditForm';
import './Admin.css';

/**
 * ArtworkManagement component
 * @param {string} locationId - Optional location ID to scope artwork (null = master admin view)
 */
const ArtworkManagement = ({ locationId = null }) => {
  const [artwork, setArtwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Location admins can only edit their own location's artwork, not global artwork
  const isLocationAdmin = locationId !== null;
  
  // Check if an artwork item can be edited by the current user
  const canEditArtwork = (artworkItem) => {
    if (!isLocationAdmin) return true; // Master admin can edit all
    // Location admin can only edit artwork that belongs to their location
    return artworkItem.location_id === locationId;
  };
  
  // Check if artwork is global (available to all locations)
  const isGlobalArtwork = (artworkItem) => {
    return artworkItem.location_id === null;
  };

  useEffect(() => {
    loadArtwork();
    loadCategories();
  }, [locationId]);

  const loadArtwork = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artworkService.getAllArtwork(true, locationId); // Include inactive, filter by location
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

  const handleArtworkClick = async (artworkId, artworkItem) => {
    // Check if location admin is trying to edit global artwork
    if (isLocationAdmin && isGlobalArtwork(artworkItem)) {
      setError('Global artwork cannot be edited by location admins. Contact a master admin to make changes.');
      return;
    }
    
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
        // Check permissions before updating
        if (!canEditArtwork(selectedArtwork)) {
          setError('You do not have permission to edit this artwork.');
          return;
        }
        // Update existing
        result = await artworkService.updateArtwork(selectedArtwork.id, artworkData);
      } else {
        // Create new - pass locationId for location admins
        result = await artworkService.createArtwork(artworkData, locationId);
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
    ? filterCategory === 'Featured'
      ? artwork.filter(item => item.featured === true)
      : artwork.filter(item => item.category === filterCategory)
    : artwork;

  if (loading) {
    return <div className="admin-loading">Loading artwork...</div>;
  }

  return (
    <div className="admin-management">
      <div className="admin-page-header">
        <h2>Artwork</h2>
        <div className="admin-actions">

        <label>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="admin-select default-select"
        >
          <option value="">All Categories</option>
          <option value="Featured">Featured</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </label>

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
          <div className="products-filters">

          </div>

          <div className="artwork-cards-container">
            {filteredArtwork.length === 0 ? (
              <div className="artwork-empty-state">
                No artwork found. Click "Add New Artwork" to create one.
              </div>
            ) : (
              <div className="artwork-cards-grid">
                {filteredArtwork.map((item) => {
                  const isGlobal = isGlobalArtwork(item);
                  const canEdit = canEditArtwork(item);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => canEdit && handleArtworkClick(item.id, item)}
                      className={`artwork-card ${!item.is_active ? 'inactive' : ''} ${isGlobal && isLocationAdmin ? 'global-readonly' : ''}`}
                      style={!canEdit ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                      title={!canEdit ? 'Global artwork - read only' : 'Click to edit'}
                    >
                      {isGlobal && (
                        <div className="global-badge" title="Available to all locations">
                          🌐 Global
                        </div>
                      )}
                      <div className="artwork-card-image-container admin-content">
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
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ArtworkManagement;

