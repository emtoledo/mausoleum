import React, { useState, useEffect } from 'react';
import productService from '../../services/productService';
import ProductEditForm from './ProductEditForm';
import './ProductsManagement.css';

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await productService.getAllProducts(true); // Include inactive
      if (result.success) {
        setProducts(result.data || []);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Error loading products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const result = await productService.getAllCategories();
    if (result.success) {
      setCategories(result.data || []);
    }
  };

  const handleProductClick = async (productId) => {
    const result = await productService.getProductById(productId);
    if (result.success) {
      setSelectedProduct(result.data);
      setShowAddForm(false);
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowAddForm(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      let result;
      if (selectedProduct) {
        // Update existing
        result = await productService.updateProduct(selectedProduct.id, productData);
      } else {
        // Create new
        result = await productService.createProduct(productData);
      }

      if (result.success) {
        await loadProducts();
        setSelectedProduct(null);
        setShowAddForm(false);
        setError(null);
      } else {
        setError(result.error || 'Failed to save product');
      }
    } catch (err) {
      setError('Error saving product');
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await productService.deleteProduct(productId);
      if (result.success) {
        await loadProducts();
        setSelectedProduct(null);
        setError(null);
      } else {
        setError(result.error || 'Failed to delete product');
      }
    } catch (err) {
      setError('Error deleting product');
      console.error(err);
    }
  };

  const handleCloseForm = () => {
    setSelectedProduct(null);
    setShowAddForm(false);
  };

  const handleSyncProducts = async () => {
    if (!window.confirm('This will sync all products from ProductData.js to the database. Existing products with the same ID will be skipped. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await productService.syncProductsFromData();
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;
        alert(`Sync completed!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        await loadProducts();
        await loadCategories();
      } else {
        setError(result.error || 'Failed to sync products');
      }
    } catch (err) {
      setError('Error syncing products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = filterCategory
    ? products.filter(p => p.product_category === filterCategory)
    : products;

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products-management">
      <div className="products-header">
        <h2>Products Management</h2>
        <div className="products-actions">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            className="sync-products-button" 
            onClick={handleSyncProducts}
            title="Sync products from ProductData.js"
          >
            Sync from ProductData.js
          </button>
          <button className="add-product-button" onClick={handleAddProduct}>
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '20px', padding: '10px', background: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {showAddForm && !selectedProduct && (
        <ProductEditForm
          product={null}
          onSave={handleSaveProduct}
          onCancel={handleCloseForm}
        />
      )}

      {selectedProduct && !showAddForm && (
        <ProductEditForm
          product={selectedProduct}
          onSave={handleSaveProduct}
          onCancel={handleCloseForm}
          onDelete={handleDeleteProduct}
        />
      )}

      {!showAddForm && !selectedProduct && (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Name</th>
                <th>Category</th>
                <th>Dimensions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className="product-row"
                  >
                    <td>
                      {product.preview_image_url ? (
                        <img
                          src={product.preview_image_url}
                          alt={product.name}
                          className="product-preview-thumb"
                        />
                      ) : (
                        <div className="no-preview">No Image</div>
                      )}
                    </td>
                 
                    <td className="product-name">{product.name}</td>
                    <td>{product.product_category}</td>
                    <td>
                      {product.real_world_width}" × {product.real_world_height}"
                    </td>
                    <td>
                      <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;

