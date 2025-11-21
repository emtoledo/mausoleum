/**
 * SignaturePad Component
 * 
 * A canvas-based signature pad for capturing digital signatures.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * @param {Function} onSignatureChange - Callback when signature changes (receives base64 data URL)
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {string} backgroundColor - Background color (default: transparent)
 * @param {string} penColor - Pen color (default: black)
 * @param {number} penWidth - Pen width in pixels (default: 2)
 * @returns {JSX.Element}
 */
const SignaturePad = ({
  onSignatureChange,
  width = 400,
  height = 150,
  backgroundColor = 'transparent',
  penColor = '#000000',
  penWidth = 2
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Set canvas background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Set default drawing styles
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height, backgroundColor, penColor, penWidth]);

  // Get coordinates relative to canvas
  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  }, [getCoordinates]);

  // Draw
  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    if (!hasSignature) {
      setHasSignature(true);
    }

    // Notify parent of signature change
    if (onSignatureChange) {
      const dataURL = canvas.toDataURL('image/png');
      onSignatureChange(dataURL);
    }
  }, [isDrawing, getCoordinates, hasSignature, onSignatureChange]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset background if needed
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  }, [backgroundColor, onSignatureChange]);

  return (
    <div className="signature-pad-container">
      <canvas
        ref={canvasRef}
        className="signature-pad-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />
      <div className="signature-pad-actions">
        <button
          type="button"
          onClick={clearSignature}
          disabled={!hasSignature}
          className="button-secondary button-small"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;

