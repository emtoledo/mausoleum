/**
 * LocationRoute Component
 * 
 * Wraps routes to handle location slug detection and validation.
 * Extracts location slug from URL and ensures location context is set.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';

const LocationRoute = ({ children, requireLocation = false }) => {
  const { locationSlug } = useParams();
  const { currentLocation, locationConfig, loading, getLocationFromSlug } = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateLocation = async () => {
      setIsValidating(true);

      // If no slug in URL, location is optional (will use user's location or default)
      if (!locationSlug) {
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // If slug exists, validate it
      const location = await getLocationFromSlug(locationSlug);
      if (location) {
        setIsValid(true);
      } else {
        setIsValid(false);
      }

      setIsValidating(false);
    };

    validateLocation();
  }, [locationSlug, getLocationFromSlug]);

  // Show loading while validating
  if (loading || isValidating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading location...</div>
      </div>
    );
  }

  // If location is required but invalid, redirect to 404 or default
  if (requireLocation && !isValid && locationSlug) {
    return <Navigate to="/404" replace />;
  }

  // If location slug is invalid but not required, continue (will use default location)
  if (!isValid && locationSlug) {
    console.warn(`Invalid location slug: ${locationSlug}, using default location`);
  }

  return <>{children}</>;
};

export default LocationRoute;
