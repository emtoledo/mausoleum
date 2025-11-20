# Design Studio Canvas Architecture

## Overview

The Design Studio uses a **dual-canvas architecture** with Fabric.js for interactive object manipulation and an HTML5 Canvas for the product background. Here's how all the pieces work together:

---

## 🎨 Canvas Layers

### 1. **Product Canvas (Bottom Layer)**
- **Purpose**: Static background showing the memorial product template
- **Technology**: HTML5 Canvas (`<canvas>` element)
- **Location**: `productCanvasRef` in `DesignStudio.jsx`
- **Rendering**: Handled by `drawProductCanvas()` in `useFabricCanvas.js`

**What it displays:**
- Template SVG/image (the memorial shape)
- Material texture overlay (if material selected)
- Overlay SVG (decorative elements)
- Product base rectangles (if defined in template)

**Key Features:**
- Updates when material changes
- Scales proportionally with canvas size
- Non-interactive (just visual background)

### 2. **Fabric Canvas (Top Layer)**
- **Purpose**: Interactive layer for user-created design elements
- **Technology**: Fabric.js Canvas
- **Location**: `fabricCanvasRef` in `DesignStudio.jsx`
- **Rendering**: Managed by Fabric.js library

**What it contains:**
- Text objects (user-typed text)
- Artwork groups (DXF files converted to Fabric.js groups)
- Images (regular image files)
- All user-editable design elements

**Key Features:**
- Full interactivity (drag, resize, rotate, select)
- Event-driven (selection, modification, movement)
- Constrained within edit zones
- Z-index management for layering

---

## 🔄 Data Flow

### **Loading a Project (Canvas Population)**

```
1. EditModeView loads project from Supabase/localStorage
   ↓
2. Extracts designElements from project.template.customizations
   ↓
3. Passes to DesignStudio as initialData.designElements
   ↓
4. useFabricCanvas hook receives initialData
   ↓
5. populateCanvasFromData() processes each element:
   
   For TEXT elements:
   - Creates fabric.Text object
   - Restores: position, size, color, font, rotation, opacity
   - Applies saved scaleX/scaleY
   
   For IMAGE elements:
   - Loads image from URL
   - Calculates scale to match saved dimensions
   - Restores position and transforms
   
   For GROUP/ARTWORK elements (DXF):
   - Fetches DXF file from URL
   - Re-imports via importDxfToFabric()
   - Re-applies texture layer if present
   - Restores color, position, scale, rotation
   - Applies color to all paths in group
   ↓
6. Objects added to canvas in zIndex order
   ↓
7. Canvas renders all objects
```

### **Saving a Project (Canvas Serialization)**

```
1. User clicks Save button
   ↓
2. handleSave() in DesignStudio.jsx:
   - Gets all objects: fabricInstance.getObjects()
   - Calculates scale (pixels per inch)
   ↓
3. Converts each Fabric.js object to design element:
   
   Base Properties (all objects):
   - id, type, x, y (converted from pixels to inches)
   - scaleX, scaleY, rotation, opacity
   - fill (color) - prioritized from customData.currentColor
   - stroke, strokeWidth
   - zIndex (layer order)
   
   Type-Specific Properties:
   
   TEXT:
   - content, fontSize, font, fontWeight, fontStyle
   - textAlign, lineHeight
   
   IMAGE:
   - content/imageUrl, width, height
   
   GROUP/ARTWORK:
   - imageUrl (DXF source), textureUrl
   - artworkId, artworkName, category
   - width, height (from bounding rect)
   ↓
4. Creates designElements array
   ↓
5. Calls onSave() with updated project data
   ↓
6. EditModeView saves to Supabase/localStorage
```

---

## 🧩 Key Components

### **DesignStudio.jsx** (Main Orchestrator)
- **State Management**: Manages selectedElement, fabricInstance, activeMaterial
- **Event Handlers**: Add text, add artwork, delete, center, flip, z-index
- **Save/Export**: Converts canvas to design elements and saves
- **Layout**: Coordinates toolbar, canvas, options panel, material picker

### **useFabricCanvas.js** (Canvas Engine)
- **Canvas Creation**: Initializes Fabric.js canvas with proper dimensions
- **Scale Calculation**: Converts between real-world inches and screen pixels
- **Object Constraints**: Keeps objects within edit zones
- **Event Listeners**: Selection, movement, scaling, rotation
- **Population**: Loads saved design elements onto canvas
- **Product Canvas**: Draws background template with material

### **populateCanvasFromData()** (Element Loader)
- **Input**: Array of design elements (from saved project)
- **Process**:
  1. Sorts by zIndex to maintain layer order
  2. For each element:
     - Converts inches to pixels using scale
     - Creates appropriate Fabric.js object type
     - Restores all properties (position, scale, color, etc.)
     - Handles special cases (DXF re-import, image loading)
  3. Adds objects to canvas in correct order
- **Output**: Canvas populated with all design elements

### **handleSave()** (Element Serializer)
- **Input**: Fabric.js canvas with all objects
- **Process**:
  1. Gets all objects from canvas
  2. Converts pixels to inches using scale
  3. Extracts properties from each object:
     - Uses `obj.get()` to get current state
     - Prioritizes `customData.currentColor` for color
     - Captures type-specific properties
  4. Creates designElements array
- **Output**: Array ready to save to database

---

## 🎯 Object Types & Handling

### **Text Objects**
```javascript
// Creation
new fabric.Text('Text', {
  fontSize: 20,
  fontFamily: 'Arial',
  fill: '#000000',
  // ... position, scale, rotation
})

// Saving
{
  type: 'text',
  content: 'Text',
  fontSize: 2.5, // inches
  font: 'Arial',
  x: 10.5, // inches
  y: 5.2,  // inches
  fill: '#000000'
}
```

### **Image Objects**
```javascript
// Creation
fabric.Image.fromURL(imageUrl, (img) => {
  img.set({ scaleX, scaleY, left, top, ... })
  canvas.add(img)
})

// Saving
{
  type: 'image',
  imageUrl: '/path/to/image.png',
  width: 6.0,  // inches
  height: 4.0, // inches
  x: 12.0,
  y: 8.0
}
```

### **Group Objects (DXF Artwork)**
```javascript
// Creation
importDxfToFabric({
  dxfString: '...',
  textureUrl: '/path/to/texture.png'
})
// Returns Fabric.js Group with paths + optional texture layer

// Saving
{
  type: 'artwork',
  imageUrl: '/path/to/artwork.dxf',
  textureUrl: '/path/to/texture.png',
  artworkId: 'panel-04',
  category: 'Panels',
  width: 8.0,  // inches
  height: 6.0, // inches
  fill: '#000000' // Applied to all paths
}
```

---

## 🔧 Key Mechanisms

### **Scale Conversion**
- **Purpose**: Convert between real-world inches and screen pixels
- **Formula**: `scale = canvasWidth / realWorldWidth`
- **Usage**:
  - Loading: `inchesToPixels(value, scale)`
  - Saving: `pixelsToInches(value, scale)`

### **Edit Zones**
- **Purpose**: Constrain object movement to specific areas
- **Definition**: Defined in `initialData.editZones` (inches relative to template)
- **Visual**: Blue border (`#9CBCED`) shown during movement
- **Constraint**: `constrainObjectInCanvas()` keeps objects within bounds

### **Custom Data**
- **Purpose**: Store metadata on Fabric.js objects
- **Properties**:
  - `currentColor`: User-selected color (most accurate)
  - `currentColorId`: Color ID from ColorData
  - `artworkId`, `artworkName`, `category`: Artwork metadata
  - `originalSource`: Original image/DXF URL
- **Usage**: Prioritized during save to ensure accurate color persistence

### **Z-Index Management**
- **Storage**: Array index in `fabricInstance._objects`
- **Manipulation**: Manual array manipulation (Fabric.js doesn't have bringToFront/sendToBack)
- **Order**: Lower index = bottom layer, higher index = top layer

---

## 🔄 Event Flow

### **Object Selection**
```
User clicks object
  ↓
Fabric.js fires 'selection:created'
  ↓
useFabricCanvas updates selectedObject.current
  ↓
Calls onElementSelect(activeObject)
  ↓
DesignStudio updates selectedElement state
  ↓
OptionsPanel receives selectedElement
  ↓
Shows properties panel with object details
```

### **Object Movement**
```
User drags object
  ↓
Fabric.js fires 'object:moving'
  ↓
constrainObjectInCanvas() checks bounds
  ↓
Adjusts position if outside edit zone
  ↓
showConstraintBorder() displays blue border
  ↓
User releases mouse
  ↓
Fabric.js fires 'object:modified'
  ↓
hideConstraintBorder() removes border
```

### **Color Change**
```
User selects color in OptionsPanel
  ↓
handleColorSwatchSelect() updates object:
  - Sets fill, stroke, strokeWidth
  - Updates customData.currentColor
  ↓
Canvas re-renders with new color
  ↓
onUpdateElement() notifies DesignStudio
  ↓
On save, customData.currentColor is prioritized
```

---

## 📊 State Management

### **DesignStudio State**
- `fabricInstance`: Fabric.js canvas instance
- `selectedElement`: Currently selected object
- `activeMaterial`: Selected material for product background
- `canvasSize`: Container dimensions (for responsive scaling)
- `isSaving`, `isExporting`: Loading states

### **useFabricCanvas Refs**
- `fabricCanvasInstance`: Canvas instance (persists across renders)
- `scale`: Current pixels-per-inch scale
- `selectedObject`: Currently selected object
- `constraintOverlay`: Border rectangle for edit zone visualization
- `isObjectMoving`: Flag for movement state

---

## 🎨 Visual Stack (Bottom to Top)

```
1. Product Canvas (HTML5 Canvas)
   - Template image
   - Material texture
   - Overlay SVG
   - Product base rectangles

2. Fabric Canvas (Fabric.js)
   - Constraint border (when moving)
   - Design elements (text, artwork, images)
   - Selection handles (when selected)
   - Transform controls (when selected)
```

---

## 💾 Data Persistence

### **What Gets Saved**
- All object properties: position, size, rotation, color, opacity
- Type-specific: text content, font, image URLs, artwork IDs
- Layer order: zIndex
- Material selection: full material object

### **What Doesn't Get Saved**
- Temporary UI state (selection, constraint borders)
- Canvas dimensions (calculated on load)
- Event listeners (recreated on mount)

---

## 🔍 Key Functions

### **populateCanvasFromData()**
- **Location**: `useFabricCanvas.js:373`
- **Purpose**: Load saved design elements onto canvas
- **Process**: Creates Fabric.js objects from saved element data

### **handleSave()**
- **Location**: `DesignStudio.jsx:707`
- **Purpose**: Serialize canvas to saveable format
- **Process**: Converts Fabric.js objects to design elements

### **constrainObjectInCanvas()**
- **Location**: `useFabricCanvas.js:39`
- **Purpose**: Keep objects within edit zones
- **Process**: Adjusts position if outside bounds

### **drawProductCanvas()**
- **Location**: `useFabricCanvas.js:165`
- **Purpose**: Render product background
- **Process**: Draws template, material, overlay on HTML5 canvas

---

This architecture ensures that:
- ✅ All design elements are accurately saved and restored
- ✅ Real-world dimensions are preserved (inches)
- ✅ User interactions are smooth and responsive
- ✅ Material changes update the background
- ✅ Objects stay within defined edit zones
- ✅ Colors and properties persist correctly

