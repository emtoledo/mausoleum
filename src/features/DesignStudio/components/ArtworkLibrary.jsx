/**
 * ArtworkLibrary Component
 * 
 * Advanced artwork browser with search and category filtering.
 * Displays a grid of artwork items for selection and insertion into the design.
 * When an artwork is clicked, calls onSelectArtwork with the selected artwork.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { convertDxfToSvg } from '../../../utils/dxfImporter';
import * as makerjs from 'makerjs';

/**
 * @param {Array} artwork - Array of artwork objects from ArtworkData
 * @param {Function} onSelectArtwork - Callback fired when an artwork is selected
 * @returns {JSX.Element}
 */
const ArtworkLibrary = ({ artwork = [], onSelectArtwork }) => {
  
  // Internal state for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // State to store converted DXF preview URLs (DXF -> SVG data URLs)
  const [dxfPreviewUrls, setDxfPreviewUrls] = useState({});

  /**
   * Check if an artwork item is a DXF file
   */
  const isDxfFile = (imageUrl) => {
    return imageUrl && (
      imageUrl.toLowerCase().endsWith('.dxf') ||
      imageUrl.endsWith('.DXF')
    );
  };

  /**
   * Convert DXF files to SVG for preview
   */
  useEffect(() => {
    const convertDxfFiles = async () => {
      const conversions = {};
      
      for (const item of artwork) {
        if (isDxfFile(item.imageUrl)) {
          try {
            // Fetch the DXF file
            const response = await fetch(item.imageUrl);
            if (!response.ok) {
              console.warn(`Failed to fetch DXF file for preview: ${item.imageUrl}`);
              continue;
            }
            
            const dxfString = await response.text();
            
            // Convert DXF to SVG
            const svgString = await convertDxfToSvg(dxfString, makerjs.unitType.Inches);
            
            // Convert SVG string to data URL for use in img src
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            conversions[item.id] = svgDataUrl;
          } catch (error) {
            console.error(`Error converting DXF to SVG for ${item.name}:`, error);
          }
        }
      }
      
      if (Object.keys(conversions).length > 0) {
        setDxfPreviewUrls(conversions);
      }
    };
    
    if (artwork && artwork.length > 0) {
      convertDxfFiles();
    }
  }, [artwork]);

  /**
   * Get unique categories from artwork array
   */
  const categories = useMemo(() => {
    const uniqueCategories = new Set(artwork.map(a => a.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories)];
  }, [artwork]);

  /**
   * Filter artwork based on search term and category
   */
  const filteredArtwork = useMemo(() => {
    let result = artwork;

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(art => art.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(art => 
        art.name.toLowerCase().includes(searchLower) ||
        (art.category && art.category.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [artwork, selectedCategory, searchTerm]);

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

  if (!artwork || artwork.length === 0) {
    return (
      <div className="artwork-library">
        <div className="artwork-library-empty">No artwork available</div>
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
      {filteredArtwork.length !== artwork.length && (
        <div className="artwork-library-results">
          Showing {filteredArtwork.length} of {artwork.length} items
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
                  src={dxfPreviewUrls[item.id] || item.imageUrl} 
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback if DXF conversion failed or image fails to load
                    if (isDxfFile(item.imageUrl) && !dxfPreviewUrls[item.id]) {
                      e.target.style.display = 'none';
                    }
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
