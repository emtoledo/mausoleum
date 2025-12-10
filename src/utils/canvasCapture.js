/**
 * Canvas Capture Utility
 * 
 * Captures the combined Fabric canvas and Product canvas as a single image.
 * This is used for generating design proofs for approval.
 */

/**
 * Capture both canvases as a single image
 * @param {HTMLCanvasElement} fabricCanvas - The Fabric.js canvas element
 * @param {HTMLCanvasElement} productCanvas - The product/template canvas element
 * @param {Object} options - Capture options
 * @param {number} options.width - Desired output width (optional, defaults to canvas width)
 * @param {number} options.height - Desired output height (optional, defaults to canvas height)
 * @param {string} options.format - Image format ('image/png' or 'image/jpeg', default: 'image/png')
 * @param {number} options.quality - JPEG quality (0-1, default: 0.92)
 * @returns {Promise<string>} Base64 encoded image data URL
 */
export async function captureCanvasAsImage(fabricCanvas, productCanvas, options = {}) {
  const {
    width,
    height,
    format = 'image/png',
    quality = 0.92
  } = options;

  // Get canvas dimensions
  const fabricWidth = fabricCanvas.width || fabricCanvas.getWidth();
  const fabricHeight = fabricCanvas.height || fabricCanvas.getHeight();
  const productWidth = productCanvas.width;
  const productHeight = productCanvas.height;

  // Use provided dimensions or use the larger of the two canvases
  const outputWidth = width || Math.max(fabricWidth, productWidth);
  const outputHeight = height || Math.max(fabricHeight, productHeight);

  // Create a temporary canvas to combine both canvases
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = outputWidth;
  combinedCanvas.height = outputHeight;
  const ctx = combinedCanvas.getContext('2d');

  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // Draw product canvas (background/template) first
  if (productCanvas) {
    ctx.drawImage(productCanvas, 0, 0, outputWidth, outputHeight);
  }

  // Draw fabric canvas (design elements) on top
  if (fabricCanvas) {
    // If fabricCanvas is a Fabric.js canvas, we need to export it
    if (typeof fabricCanvas.toDataURL === 'function') {
      // It's a native HTML5 canvas
      ctx.drawImage(fabricCanvas, 0, 0, outputWidth, outputHeight);
    } else if (fabricCanvas.getElement) {
      // It's a Fabric.js canvas instance
      const fabricElement = fabricCanvas.getElement();
      ctx.drawImage(fabricElement, 0, 0, outputWidth, outputHeight);
    } else {
      // Try to get the underlying canvas element
      const element = fabricCanvas.el || fabricCanvas.lowerCanvasEl || fabricCanvas.upperCanvasEl;
      if (element) {
        ctx.drawImage(element, 0, 0, outputWidth, outputHeight);
      }
    }
  }

  // Convert to data URL
  return combinedCanvas.toDataURL(format, quality);
}

/**
 * Capture Fabric.js canvas instance as image
 * @param {Object} fabricInstance - Fabric.js canvas instance
 * @param {Object} options - Capture options
 * @returns {Promise<string>} Base64 encoded image data URL
 */
export async function captureFabricCanvas(fabricInstance, options = {}) {
  if (!fabricInstance) {
    throw new Error('Fabric canvas instance is required');
  }

  const {
    format = 'image/png',
    quality = 0.92,
    multiplier = 1
  } = options;

  // Use Fabric.js toDataURL method which handles all objects properly
  return new Promise((resolve, reject) => {
    try {
      const dataURL = fabricInstance.toDataURL({
        format,
        quality,
        multiplier
      });
      resolve(dataURL);
    } catch (error) {
      // Check if this is a tainted canvas error (CORS issue)
      if (error.name === 'SecurityError' || error.message.includes('Tainted') || error.message.includes('tainted')) {
        console.warn('Canvas is tainted (CORS issue). This usually happens when images are loaded from different origins without proper CORS headers.');
        console.warn('Attempting fallback: using canvas element directly...');
        
        // Try fallback: get the canvas element and use its toDataURL
        try {
          const canvasElement = fabricInstance.getElement();
          if (canvasElement && canvasElement.toDataURL) {
            const fallbackDataURL = canvasElement.toDataURL(format, quality);
            resolve(fallbackDataURL);
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      reject(error);
    }
  });
}

/**
 * Capture both canvases using Fabric.js instance and product canvas
 * @param {Object} fabricInstance - Fabric.js canvas instance
 * @param {HTMLCanvasElement} productCanvas - Product canvas element
 * @param {Object} options - Capture options
 * @returns {Promise<string>} Base64 encoded image data URL
 */
export async function captureCombinedCanvas(fabricInstance, productCanvas, options = {}) {
  const {
    format = 'image/png',
    quality = 0.92,
    multiplier = 1
  } = options;

  if (!fabricInstance) {
    throw new Error('Fabric canvas instance is required');
  }

  // Get dimensions from fabric canvas
  const fabricElement = fabricInstance.getElement();
  const fabricWidth = fabricElement.width;
  const fabricHeight = fabricElement.height;

  // Create combined canvas
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = fabricWidth * multiplier;
  combinedCanvas.height = fabricHeight * multiplier;
  const ctx = combinedCanvas.getContext('2d');

  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

  // Draw product canvas first (if provided)
  if (productCanvas) {
    ctx.drawImage(
      productCanvas,
      0, 0, productCanvas.width, productCanvas.height,
      0, 0, combinedCanvas.width, combinedCanvas.height
    );
  }

  // Export fabric canvas to image and draw it
  try {
    const fabricDataURL = await captureFabricCanvas(fabricInstance, { format, quality, multiplier });
    const fabricImage = new Image();
    
    return new Promise((resolve, reject) => {
      fabricImage.onload = () => {
        ctx.drawImage(fabricImage, 0, 0, combinedCanvas.width, combinedCanvas.height);
        resolve(combinedCanvas.toDataURL(format, quality));
      };
      fabricImage.onerror = reject;
      fabricImage.src = fabricDataURL;
    });
  } catch (error) {
    console.error('Error capturing fabric canvas:', error);
    throw error;
  }
}

