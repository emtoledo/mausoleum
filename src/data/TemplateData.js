// This is the most important file.
// It connects your product images to their real-world data.

// Import product images (using relative paths from src/data/ to src/assets/)
import markerImg1 from '../assets/images/templates/estate1.svg';
import markerImg1Overlay from '../assets/images/templates/estate1_overlay.svg';
import markerPreview1 from '../assets/images/previews/estate1.png';

export const templates = {
  'template-001': {
    id: 'template-001',
    name: 'Estate Collection 1',
    imageUrl: markerImg1,
    overlayUrl: markerImg1Overlay,    
    previewImage: markerPreview1,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-001', 
    canvas: {
      width: 60, // inches - overall canvas width
      height: 26 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 2.5, width: 40, height: 15.5
      }
    ],
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 23, width: 60, height: 3,
        material: 'mat-006'
      }
    ],    
    // Pre-populated elements for this template
    designElements: [
      {
        id: 'el-1', type: 'text', content: 'In Loving Memory',
        font: 'Times New Roman', fontSize: 2,
        x: 12, y: 5, zIndex: 1
      }
    ]
  }
};
