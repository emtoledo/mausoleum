import React, { useState, useEffect } from 'react';
import locationService from '../../services/locationService';
import LocationEditForm from './LocationEditForm';
import './Admin.css';

const LocationsManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await locationService.getAllLocations();
      if (result.success) {
        setLocations(result.data || []);
      } else {
        setError(result.error || 'Failed to load locations');
      }
    } catch (err) {
      setError('Error loading locations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = async (locationId) => {
    const result = await locationService.getLocationById(locationId);
    if (result.success) {
      setSelectedLocation(result.data);
      setShowAddForm(false);
    }
  };

  const handleAddLocation = () => {
    setSelectedLocation(null);
    setShowAddForm(true);
  };

  const handleFormClose = () => {
    setSelectedLocation(null);
    setShowAddForm(false);
  };

  const handleFormSave = () => {
    loadLocations();
    handleFormClose();
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }
    
    const result = await locationService.deleteLocation(locationId);
    if (result.success) {
      loadLocations();
      handleFormClose();
    } else {
      alert(result.error || 'Failed to delete location');
    }
  };

  const handleToggleActive = async (location) => {
    const result = await locationService.updateLocation(location.id, {
      is_active: !location.is_active
    });
    if (result.success) {
      loadLocations();
    } else {
      alert(result.error || 'Failed to update location status');
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading locations...</div>;
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button onClick={loadLocations} className="admin-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-management locations-management">
      <div className="admin-management-header">
        <h2>Locations Management</h2>
        <button onClick={handleAddLocation} className="admin-btn primary">
          + Add Location
        </button>
      </div>

      <div className="admin-management-content">
        {/* Locations List */}
        <div className="admin-list locations-list">
          {locations.length === 0 ? (
            <div className="admin-empty-state">
              <p>No locations found.</p>
              <p>Click "Add Location" to create your first location.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Brand Title</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr 
                    key={location.id}
                    className={`admin-list-item ${selectedLocation?.id === location.id ? 'selected' : ''} ${!location.is_active ? 'inactive' : ''}`}
                    onClick={() => handleLocationClick(location.id)}
                  >
                    <td className="location-name">
                      <strong>{location.name}</strong>
                    </td>
                    <td className="location-slug">
                      <code>/{location.slug}</code>
                    </td>
                    <td className="location-brand-title">
                      {location.brand_title || location.name}
                    </td>
                    <td className="location-status">
                      <span 
                        className={`status-badge ${location.is_active ? 'active' : 'inactive'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(location);
                        }}
                        title={`Click to ${location.is_active ? 'deactivate' : 'activate'}`}
                      >
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="location-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocationClick(location.id);
                        }}
                        className="admin-btn small"
                        title="Edit location"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/${location.slug}/login`, '_blank');
                        }}
                        className="admin-btn small secondary"
                        title="Open location login page"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Form Panel */}
        {(selectedLocation || showAddForm) && (
          <div className="admin-form-panel">
            <LocationEditForm
              location={selectedLocation}
              onClose={handleFormClose}
              onSave={handleFormSave}
              onDelete={selectedLocation ? () => handleDeleteLocation(selectedLocation.id) : null}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationsManagement;
