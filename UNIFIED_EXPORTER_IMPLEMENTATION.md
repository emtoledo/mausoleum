# Unified DXF Exporter Implementation

## Overview

A prototype unified DXF exporter has been implemented that captures the entire canvas as a single SVG artifact, then applies one unified transformation to convert from pixel coordinates to real-world inches. This approach reduces error accumulation and provides pixel-perfect accuracy.

## Implementation Details

### Location
- **File**: `src/features/DesignStudio/utils/dxfExporter.js`
- **Function**: `exportToDxfUnified()`

### Key Functions

1. **`convertTextToSvgPath()`** - Converts Fabric.js text objects to SVG paths using opentype.js
2. **`captureFabricCanvasAsSvg()`** - Exports Fabric Canvas to SVG, handling text conversion
3. **`captureProductCanvasAsSvg()`** - Creates SVG from product template/overlay sources
4. **`combineSvgs()`** - Merges Fabric and Product SVGs into unified document
5. **`transformSvgToRealWorld()`** - Applies single scale + Y-flip transformation
6. **`svgStringToMakerModel()`** - Converts transformed SVG to Maker.js model
7. **`exportToDxfUnified()`** - Main export function orchestrating the process

## How It Works

### Step 1: Capture Phase
- **Fabric Canvas**: Exports all objects to SVG
  - Text objects are converted to paths using opentype.js
  - Other objects (groups, paths, images) are exported via Fabric.js `toSVG()`
- **Product Canvas**: Creates SVG from source files
  - Template SVG loaded and scaled to canvas dimensions
  - Overlay SVG loaded and positioned
  - ProductBase rectangles added as SVG rectangles

### Step 2: Combination Phase
- Both SVGs are combined into a single unified SVG document
- Product Canvas (background) layer placed first
- Fabric Canvas (foreground) layer placed on top

### Step 3: Transformation Phase
- **Single scale transformation**: `pixels → inches`
  - Scale X: `realWorldWidth / canvasWidthPx`
  - Scale Y: `realWorldHeight / canvasHeightPx`
- **Single Y-flip transformation**: `Y-down → Y-up`
  - Applied via SVG transform: `scale(scaleX, -scaleY) translate(0, -height)`
- Result: Entire design in real-world inches, Y-up coordinate system

### Step 4: Export Phase
- Transformed SVG converted to Maker.js model
- Maker.js model exported to DXF format
- DXF file downloaded

## Usage

The unified exporter is currently **active** in `DesignStudio.jsx`. When you click "Export to DXF", it will use `exportToDxfUnified()`.

### To Switch Back to Old Exporter

In `src/features/DesignStudio/DesignStudio.jsx`, line ~1528:

```javascript
// Change from:
await exportToDxfUnified({...});

// To:
await exportToDxf({...});
```

## Benefits

1. **Single Transformation**: One scale + one flip = minimal error accumulation
2. **Visual Accuracy**: Exports exactly what's displayed (pixel-perfect)
3. **Simpler Logic**: No per-object origin handling or coordinate conversion
4. **Preserves Relationships**: Maintains exact spatial relationships between objects
5. **Template Alignment**: Template and objects captured together, ensuring alignment

## Known Limitations & Future Improvements

### Current Limitations

1. **Text Conversion**: Text objects are converted to paths, which may lose some formatting details
2. **Image Handling**: Raster images in SVG may not convert perfectly to DXF (they're exported as-is)
3. **Pattern Fills**: Material textures (pattern fills) are not exported (only vector outlines)
4. **Performance**: Large designs may be slower due to SVG parsing/transformation

### Potential Improvements

1. **Better Text Handling**: Improve text-to-path conversion accuracy
2. **Image Vectorization**: Convert raster images to vector paths for better DXF output
3. **Pattern Handling**: Convert pattern fills to filled paths (approximate)
4. **Progress Indicators**: Add progress callbacks for long-running exports
5. **Error Recovery**: Better error handling and fallback to old exporter

## Testing

### Test Cases

1. **Simple Design**: Text + rectangle
2. **Complex Design**: Multiple text objects, artwork groups, images
3. **Rotated Objects**: Objects with various rotation angles
4. **Scaled Objects**: Objects with non-uniform scaling
5. **Template Alignment**: Verify template and objects align correctly in DXF

### Comparison Testing

Compare outputs from:
- `exportToDxf()` (old, element-by-element)
- `exportToDxfUnified()` (new, unified transformation)

Look for:
- Coordinate accuracy
- Object positioning
- Template alignment
- Text rendering
- Overall visual match

## Debugging

The unified exporter includes extensive console logging. Check browser console for:
- Canvas dimensions
- Object counts
- SVG capture progress
- Transformation details
- Maker.js model structure

## Files Modified

1. **`src/features/DesignStudio/utils/dxfExporter.js`**
   - Added unified exporter functions
   - Kept old exporter as fallback

2. **`src/features/DesignStudio/DesignStudio.jsx`**
   - Updated to use `exportToDxfUnified()`
   - Added import for unified exporter

## Next Steps

1. **Test** the unified exporter on various designs
2. **Compare** outputs with old exporter
3. **Refine** based on test results
4. **Optimize** performance if needed
5. **Document** any edge cases or issues found

