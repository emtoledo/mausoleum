/**
 * ArtworkLibrary Component
 * 
 * Advanced artwork browser with search and category filtering.
 * Displays a grid of artwork items for selection and insertion into the design.
 * When an artwork is clicked, calls onSelectArtwork with the selected artwork.
 */

import React, { useState, useMemo, useEffect } from 'react';
import artworkService from '../../../services/artworkService';

/**
 * @param {Array} artwork - Array of artwork objects (initial/fallback)
 * @param {Function} onSelectArtwork - Callback fired when an artwork is selected
 * @param {Function} onArtworkLoad - Optional callback when artwork is loaded
 * @returns {JSX.Element}
 */
const ArtworkLibrary = ({ artwork = [], onSelectArtwork, onArtworkLoad }) => {
  
  // Internal state for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Featured');
  const [loadedArtwork, setLoadedArtwork] = useState([]);
  const [categories, setCategories] = useState(['Featured']);
  const [loading, setLoading] = useState(true);

  // Load all categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await artworkService.getAllCategories();
        if (result.success) {
          setCategories(['Featured', ...(result.data || [])]);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        // Fallback to categories from artwork prop
        const uniqueCategories = new Set(artwork.map(a => a.category).filter(Boolean));
        setCategories(['Featured', ...Array.from(uniqueCategories)]);
      }
    };
    loadCategories();
  }, [artwork]);

  // Load artwork based on selected category
  useEffect(() => {
    const loadArtwork = async () => {
      setLoading(true);
      try {
        let result;
        if (selectedCategory === 'Featured') {
          result = await artworkService.getFeaturedArtwork();
        } else {
          result = await artworkService.getArtworkByCategory(selectedCategory);
        }

        if (result.success) {
          // Transform database format to match expected format
          const transformedArtwork = (result.data || []).map(item => {
            let textureUrl = item.texture_url || null;
            if (!textureUrl && item.category && item.category.toLowerCase() === 'panels') {
              textureUrl = '/images/materials/panelbg.png';
            }
            
            return {
              id: item.id,
              name: item.name,
              category: item.category,
              imageUrl: item.image_url,
              textureUrl: textureUrl,
              defaultWidth: item.default_width || 5.0,
              minWidth: item.min_width || null,
              featured: item.featured || false
            };
          });
          setLoadedArtwork(transformedArtwork);
          if (onArtworkLoad) {
            onArtworkLoad(transformedArtwork);
          }
        } else {
          console.warn('Failed to load artwork:', result.error);
          setLoadedArtwork([]);
        }
      } catch (err) {
        console.error('Error loading artwork:', err);
        setLoadedArtwork([]);
      } finally {
        setLoading(false);
      }
    };

    loadArtwork();
  }, [selectedCategory, onArtworkLoad]);

  /**
   * Filter artwork based on search term (category filtering is done server-side)
   */
  const filteredArtwork = useMemo(() => {
    let result = loadedArtwork;

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(art => 
        art.name.toLowerCase().includes(searchLower) ||
        (art.category && art.category.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [loadedArtwork, searchTerm]);

  /**
   * Handle artwork item click
   * 
   * @param {Object} art - The selected artwork object
   */
  const handleArtworkClick = (art) => {
    if (onSelectArtwork) {
      onSelectArtwork(art);
    }
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  if (loading) {
    return (
      <div className="artwork-library">
        <div className="artwork-library-empty">Loading artwork...</div>
      </div>
    );
  }

  return (
    <div className="artwork-library add-panel-container">
      <h3 className="artwork-library-title">Artwork Library</h3>
      
      {/* Category Filter */}
      <div className="artwork-library-controls">
        <div className="control-group">
          <label htmlFor="category-filter" className="control-label">
            Category
          </label>
          <select
            id="category-filter"
            className="control-select"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="control-group">
          <label htmlFor="search-artwork" className="control-label">
            Search
          </label>
          <input
            id="search-artwork"
            type="text"
            className="control-input"
            placeholder="Search artwork..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Results Count */}
      {searchTerm.trim() !== '' && (
        <div className="artwork-library-results">
          Showing {filteredArtwork.length} {filteredArtwork.length === 1 ? 'item' : 'items'}
        </div>
      )}

      {/* Artwork Grid */}
      <div className="artwork-library-grid">
        {filteredArtwork.length === 0 ? (
          <div className="artwork-library-empty-search">
            No artwork found matching your search.
          </div>
        ) : (
          filteredArtwork.map((item) => (
            <div
              key={item.id}
              className="artwork-item"
              onClick={() => handleArtworkClick(item)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${item.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleArtworkClick(item);
                }
              }}
            >
              <div className="artwork-item-image">
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Image load error for ${item.name}:`, {
                      src: item.imageUrl?.substring(0, 100)
                    });
                    // Hide image on error
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="artwork-item-info">
                <div className="artwork-item-name">{item.name}</div>
                {item.category && (
                  <div className="artwork-item-category">{item.category}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArtworkLibrary;
