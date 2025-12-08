import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import ProductsManagement from '../components/admin/ProductsManagement';
import ArtworkManagement from '../components/admin/ArtworkManagement';
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
      // Get current user for debugging
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        setIsMasterAdmin(false);
        setLoading(false);
        return;
      }
      
      console.log('Checking master admin status for user:', {
        id: user.id,
        email: user.email
      });
      
      const isAdmin = await productService.isMasterAdmin();
      
      if (!isAdmin) {
        // Try to get more details about why access was denied
        const { data, error } = await supabase
          .from('master_admins')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('Master admin check result:', {
          isAdmin,
          userInTable: !!data,
          error: error?.message,
          userData: data
        });
      }
      
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
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px', fontFamily: 'monospace' }}>
            Check the browser console for detailed debugging information.
          </p>
          <button 
            className="admin-back-button"
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            ← Back to Home
          </button>
          <button 
            className="admin-back-button"
            onClick={() => window.location.reload()}
            style={{ marginTop: '10px', marginLeft: '10px' }}
          >
            Refresh Page
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
          className={`admin-tab ${activeTab === 'artwork' ? 'active' : ''}`}
          onClick={() => setActiveTab('artwork')}
        >
          Artwork
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
        {activeTab === 'artwork' && <ArtworkManagement />}
        {activeTab === 'hierarchy' && (
          <div className="coming-soon">Hierarchy management coming soon...</div>
        )}
      </div>
    </div>

    </div>
  );
};

export default MasterAdminPanel;

