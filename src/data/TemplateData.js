// This is the most important file.
// It connects your product images to their real-world data.

// Import product images (using relative paths from src/data/ to src/assets/)
import markerImg1 from '../assets/images/templates/estate1.svg';
import markerImg1Overlay from '../assets/images/templates/estate1_overlay.svg';

export const templates = {
  'template-001': {
    id: 'template-001',
    name: 'Estate Collection 1',
    imageUrl: markerImg1,
    overlayUrl: markerImg1Overlay,    
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    defaultMaterialId: 'mat-002', // Default material ID (Black Granite)
    editZones: [
      {
        id: 'main-zone',
        x: 0, y: 0, width: 60, height: 23,
        allows: ['text', 'artwork']
      }
    ],
    // Pre-populated elements for this template
    designElements: [
      {
        id: 'el-1', type: 'text', content: 'In Loving Memory',
        font: 'Times New Roman', fontSize: 2,
        x: 12, y: 5, zIndex: 1, zoneId: 'main-zone'
      }
    ]
  }
};
