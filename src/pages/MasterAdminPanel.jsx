import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import ProductsManagement from '../components/admin/ProductsManagement';
import './MasterAdminPanel.css';

// Expose productService to window for console access (development only)
if (process.env.NODE_ENV === 'development') {
  window.productService = productService;
}

const MasterAdminPanel = () => {
  const navigate = useNavigate();
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    checkMasterAdminStatus();
  }, []);

  const checkMasterAdminStatus = async () => {
    try {
      const isAdmin = await productService.isMasterAdmin();
      setIsMasterAdmin(isAdmin);
      // Don't redirect - show error message instead
    } catch (error) {
      console.error('Error checking master admin status:', error);
      setIsMasterAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="master-admin-panel">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (!isMasterAdmin) {
    return (
      <div className="master-admin-panel">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>Master Admin access required.</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Please ensure you have been added to the master_admins table in the database.
          </p>
          <button 
            className="admin-back-button"
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="master-admin-panel">
      <div className="admin-header app-header">
        <h1>Mausoleum Admin</h1>
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
          className={`admin-tab ${activeTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hierarchy')}
          disabled
        >
          Admin Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hierarchy')}
          disabled
        >
          Templates 
        </button>     
        <button
          className={`admin-tab ${activeTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hierarchy')}
          disabled
        >
          Locations
        </button>   

      </div>

      <div className="admin-content">
        {activeTab === 'products' && <ProductsManagement />}
        {activeTab === 'hierarchy' && (
          <div className="coming-soon">Hierarchy management coming soon...</div>
        )}
      </div>
    </div>

    </div>
  );
};

export default MasterAdminPanel;

