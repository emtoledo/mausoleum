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
      const dxfItems = artwork.filter(item => isDxfFile(item.imageUrl));
      
      if (dxfItems.length === 0) {
        return;
      }
      
      console.log(`Converting ${dxfItems.length} DXF files to SVG for preview...`);
      
      // Process all DXF files in parallel for better performance
      const conversionPromises = dxfItems.map(async (item) => {
        try {
          console.log(`Fetching DXF file: ${item.name} (${item.imageUrl})`);
          
          // Fetch the DXF file
          const response = await fetch(item.imageUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch DXF file for preview: ${item.imageUrl} - Status: ${response.status}`);
            return { id: item.id, success: false, error: `HTTP ${response.status}` };
          }
          
          const dxfString = await response.text();
          
          if (!dxfString || dxfString.length === 0) {
            console.warn(`DXF file is empty: ${item.name}`);
            return { id: item.id, success: false, error: 'Empty file' };
          }
          
          console.log(`Converting DXF to SVG: ${item.name} (${dxfString.length} chars)`);
          
          // Convert DXF to SVG
          const svgString = await convertDxfToSvg(dxfString, makerjs.unitType.Inches);
          
          if (!svgString || svgString.length === 0) {
            console.warn(`SVG conversion resulted in empty string: ${item.name}`);
            return { id: item.id, success: false, error: 'Empty SVG' };
          }
          
          // Validate SVG string
          if (!svgString.startsWith('<svg') && !svgString.startsWith('<?xml')) {
            console.warn(`SVG string doesn't start with expected prefix for ${item.name}:`, svgString.substring(0, 100));
          }
          
          // Convert SVG string to data URL for use in img src
          const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
          console.log(`Successfully converted DXF to SVG: ${item.name}`, {
            svgLength: svgString.length,
            dataUrlLength: svgDataUrl.length,
            dataUrlStart: svgDataUrl.substring(0, 50)
          });
          
          return { id: item.id, success: true, svgDataUrl };
        } catch (error) {
          console.error(`Error converting DXF to SVG for ${item.name}:`, error);
          return { id: item.id, success: false, error: error.message };
        }
      });
      
      // Wait for all conversions to complete
      const results = await Promise.all(conversionPromises);
      
      // Process results
      results.forEach(result => {
        if (result.success && result.svgDataUrl) {
          conversions[result.id] = result.svgDataUrl;
        } else {
          console.warn(`Failed to convert DXF for item ${result.id}: ${result.error || 'Unknown error'}`);
        }
      });
      
      console.log(`DXF conversion complete. Successfully converted ${Object.keys(conversions).length} of ${dxfItems.length} files.`);
      console.log('Conversion results:', Object.keys(conversions).map(id => ({ id, hasUrl: !!conversions[id], urlLength: conversions[id]?.length })));
      
      // Update state with all successful conversions
      if (Object.keys(conversions).length > 0) {
        setDxfPreviewUrls(prev => {
          const updated = { ...prev, ...conversions };
          console.log('Updated dxfPreviewUrls state:', Object.keys(updated));
          return updated;
        });
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
              key={`${item.id}-${dxfPreviewUrls[item.id] ? 'preview' : 'original'}`}
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
                {(() => {
                  const previewUrl = dxfPreviewUrls[item.id];
                  const isDxf = isDxfFile(item.imageUrl);
                  const finalSrc = previewUrl || item.imageUrl;
                  
                  // For DXF files, only show image if we have a preview URL
                  // Otherwise show a loading placeholder
                  if (isDxf && !previewUrl) {
                    return (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0f0f0',
                        color: '#666',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '8px'
                      }}>
                        Loading...
                      </div>
                    );
                  }
                  
                  return (
                    <img 
                      src={finalSrc} 
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        // Only log errors for non-DXF files or DXF files that should have loaded
                        if (!isDxf || previewUrl) {
                          console.error(`Image load error for ${item.name}:`, {
                            src: finalSrc.substring(0, 100),
                            isDxf,
                            hasPreviewUrl: !!previewUrl
                          });
                        }
                        // Hide image on error
                        e.target.style.display = 'none';
                      }}
                    />
                  );
                })()}
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
