import React, { useState, useMemo } from 'react';
import { products, getProductsByCategory } from '../../../data/ProductData';
import Button from '../../ui/Button';

const TemplateSelectionForm = ({ data, onNext, onBack, isFirstStep, isLastStep, isCreating }) => {
  const [selectedProductId, setSelectedProductId] = useState(data.selectedTemplateId || null);
  
  // Filter products by selected category
  const productsArray = useMemo(() => {
    if (data.selectedCategory) {
      return getProductsByCategory(data.selectedCategory);
    }
    // Fallback to all products if no category selected (shouldn't happen in normal flow)
    return Object.values(products);
  }, [data.selectedCategory]);

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
  };

  const handleNext = () => {
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }

    // Get the selected product object
    const selectedProduct = products[selectedProductId];
    
    if (!selectedProduct) {
      alert('Selected product not found.');
      return;
    }

    console.log('TemplateSelectionForm - Selected product:', selectedProduct);

    onNext({ selectedTemplate: selectedProduct, selectedTemplateId: selectedProductId }); // Keep selectedTemplate key for backward compatibility
  };

  return (
    <div className="step-form">
      <div className="form-title">Select Product</div>
      {data.selectedCategory && (
        <div style={{ marginTop: '8px', marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Category: <strong>{data.selectedCategory}</strong>
        </div>
      )}
      
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
                  src={product.previewImage} 
                  alt={product.name}
                  className="template-preview-image"
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
    </div>
  );
};

export default TemplateSelectionForm;
