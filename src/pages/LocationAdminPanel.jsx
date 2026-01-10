import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import ProductsManagement from '../components/admin/ProductsManagement';
import ArtworkManagement from '../components/admin/ArtworkManagement';
import ArtworkTemplatesManagement from '../components/admin/ArtworkTemplatesManagement';
import { buildLocationPath } from '../utils/navigation';
import './MasterAdminPanel.css';

const LocationAdminPanel = () => {
  const navigate = useNavigate();
  const { locationSlug } = useParams();
  const { currentLocation, isMasterAdmin, loading: locationLoading } = useLocation();
  const { user, userAccount } = useAuth();
  
  const [isLocationAdmin, setIsLocationAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    checkLocationAdminStatus();
  }, [user, userAccount, currentLocation, isMasterAdmin]);

  const checkLocationAdminStatus = async () => {
    if (locationLoading) return;
    
    try {
      // Master admins have access to all location admin panels
      if (isMasterAdmin) {
        console.log('User is master admin - granting location admin access');
        setIsLocationAdmin(true);
        setLoading(false);
        return;
      }

      if (!user || !currentLocation) {
        setIsLocationAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user is admin for this specific location
      const isAdmin = await userService.isLocationAdmin(user.id, currentLocation.id);
      
      console.log('Location admin check:', {
        userId: user.id,
        locationId: currentLocation.id,
        isAdmin
      });
      
      setIsLocationAdmin(isAdmin);
    } catch (error) {
      console.error('Error checking location admin status:', error);
      setIsLocationAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProjects = () => {
    const projectsPath = buildLocationPath('/projects', locationSlug);
    navigate(projectsPath);
  };

  if (loading || locationLoading) {
    return (
      <div className="master-admin-panel">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (!isLocationAdmin) {
    return (
      <div className="master-admin-panel">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>Location Admin access required for {currentLocation?.name || 'this location'}.</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Please contact your administrator if you believe you should have access.
          </p>
          <button 
            className="admin-back-button"
            onClick={handleBackToProjects}
            style={{ marginTop: '20px' }}
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="master-admin-panel location-admin-panel">
      <div className="admin-header app-header">
        <div className="admin-header-content">
          <button 
            className="admin-back-link"
            onClick={handleBackToProjects}
          >
            ← Back to Projects
          </button>
          <h1>{currentLocation?.name || 'Location'} Admin</h1>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button
            className={`admin-tab ${activeTab === 'artwork' ? 'active' : ''}`}
            onClick={() => setActiveTab('artwork')}
          >
            Artwork
          </button>
          <button
            className={`admin-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates 
          </button>  
        </div>

        <div className="admin-content">
          {activeTab === 'products' && (
            <ProductsManagement locationId={currentLocation?.id} />
          )}
          {activeTab === 'artwork' && (
            <ArtworkManagement locationId={currentLocation?.id} />
          )}
          {activeTab === 'templates' && (
            <ArtworkTemplatesManagement locationId={currentLocation?.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationAdminPanel;
