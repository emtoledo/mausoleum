import React, { useState, useEffect } from 'react';
import productService from '../../../services/productService';
import Button from '../../ui/Button';

const ProductCategorySelectionForm = ({ data, onNext, onBack, isFirstStep, isLastStep }) => {
  const [selectedCategory, setSelectedCategory] = useState(data.selectedCategory || null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await productService.getAllCategories();
        if (result.success) {
          setCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleNext = () => {
    if (!selectedCategory) {
      alert('Please select a product category.');
      return;
    }

    console.log('ProductCategorySelectionForm - Selected category:', selectedCategory);
    onNext({ selectedCategory });
  };

  if (loading) {
    return (
      <div className="step-form">
        <div className="form-title">Select Product Category</div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className="step-form">
      <div className="form-title">Select Product Category</div>
      
      <div className="category-grid-container" style={{ marginTop: '20px' }}>
        <div className="category-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          padding: '20px 0'
        }}>
          {categories.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              No categories found
            </div>
          ) : (
            categories.map((category) => (
            <div 
              key={category} 
              className={`category-item ${selectedCategory === category ? 'selected' : ''}`}
              onClick={() => handleCategorySelect(category)}
              style={{
                padding: '24px',
                border: `2px solid ${selectedCategory === category ? '#007bff' : '#ddd'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                backgroundColor: selectedCategory === category ? '#f0f8ff' : '#fff',
                transition: 'all 0.2s ease',
                fontWeight: selectedCategory === category ? '600' : '400'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.borderColor = '#007bff';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              <div style={{ fontSize: '18px', color: '#333' }}>{category}</div>
            </div>
            ))
          )}
        </div>
      </div>
      
      <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '30px' }}>
        <Button 
          variant="secondary"
          onClick={onBack}
        >
          ← Back
        </Button>
        
        <Button 
          variant="primary"
          onClick={handleNext}
          disabled={!selectedCategory}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default ProductCategorySelectionForm;

