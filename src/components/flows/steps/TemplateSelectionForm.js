import React, { useState, useEffect } from 'react';
import productService from '../../../services/productService';
import Button from '../../ui/Button';

const TemplateSelectionForm = ({ data, onNext, onBack, isFirstStep, isLastStep, isCreating }) => {
  const [selectedProductId, setSelectedProductId] = useState(data.selectedTemplateId || null);
  const [productsArray, setProductsArray] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load products from database filtered by category
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let result;
        if (data.selectedCategory) {
          // Load products by category from database
          result = await productService.getProductsByCategory(data.selectedCategory);
        } else {
          // Fallback to all active products if no category selected
          result = await productService.getAllProducts(false); // Only active products
        }
        
        if (result.success) {
          // Filter to only active products (double-check)
          const activeProducts = (result.data || []).filter(p => p.is_active !== false);
          setProductsArray(activeProducts);
        } else {
          setError(result.error || 'Failed to load products');
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Error loading products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [data.selectedCategory]);

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
  };

  const handleNext = () => {
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }

    // Get the selected product object from the loaded products
    const selectedProduct = productsArray.find(p => p.id === selectedProductId);
    
    if (!selectedProduct) {
      alert('Selected product not found.');
      return;
    }

    // Transform database format to match expected format for project creation
    const productForWizard = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      productCategory: selectedProduct.product_category,
      previewImage: selectedProduct.preview_image_url,
      imageUrl: selectedProduct.product_image_url,
      overlayUrl: selectedProduct.product_overlay_url,
      realWorldWidth: selectedProduct.real_world_width,
      realWorldHeight: selectedProduct.real_world_height,
      canvas: selectedProduct.canvas_width || selectedProduct.canvas_height ? {
        width: selectedProduct.canvas_width,
        height: selectedProduct.canvas_height
      } : null,
      availableMaterials: selectedProduct.available_materials || [],
      defaultMaterialId: selectedProduct.default_material_id,
      editZones: selectedProduct.edit_zones || [],
      productBase: selectedProduct.product_base || [],
      floral: selectedProduct.floral || [],
      vaseDimensions: selectedProduct.vase_dimensions || {}
    };

    console.log('TemplateSelectionForm - Selected product:', productForWizard);

    // Keep selectedTemplate key for backward compatibility with ProjectCreationWizard
    onNext({ 
      selectedTemplate: productForWizard, 
      selectedTemplateId: selectedProductId,
      selectedCategory: data.selectedCategory 
    });
  };

  if (loading) {
    return (
      <div className="step-form">
        <div className="form-title">Select Product</div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading products...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-form">
        <div className="form-title">Select Product</div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
          <p>Error: {error}</p>
          <Button variant="secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-form">
      <div className="form-title">Select Product</div>
      {data.selectedCategory && (
        <div style={{ marginTop: '8px', marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Category: <strong>{data.selectedCategory}</strong>
        </div>
      )}
      
      {productsArray.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>No products found in this category.</p>
          <Button variant="secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            ← Back
          </Button>
        </div>
      ) : (
        <>
          <div className="template-grid-container">
            <div className="template-grid">
              {productsArray.map((product) => (
                <div 
                  key={product.id} 
                  className={`template-item ${selectedProductId === product.id ? 'selected' : ''}`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  <div className="template-preview">
                    <img 
                      src={product.preview_image_url || '/images/empty.png'} 
                      alt={product.name}
                      className="template-preview-image"
                      onError={(e) => {
                        // Fallback to empty image if preview fails to load
                        e.target.src = '/images/empty.png';
                      }}
                    />
                    <div className="template-name">{product.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <Button 
              variant="secondary"
              onClick={onBack}
            >
              ← Back
            </Button>
            
            <Button 
              variant="primary"
              onClick={handleNext}
              disabled={!selectedProductId || isCreating}
            >
              {isCreating ? 'Creating Project...' : 'Continue'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateSelectionForm;
