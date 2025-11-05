// This is the most important file.
// It connects your product images to their real-world data.

// Import product images (using relative paths from src/data/ to src/assets/)
import markerImg1 from '../assets/images/templates/estate1.svg';
import markerImg2 from '../assets/images/templates/template_2.png';
import markerImg3 from '../assets/images/templates/template_3.png';
import markerImg4 from '../assets/images/templates/template_4.png';
import markerImg5 from '../assets/images/templates/template_5.png';
import markerImg6 from '../assets/images/templates/template_6.png';
import markerImg7 from '../assets/images/templates/template_7.png';
import markerImg8 from '../assets/images/templates/template_8.png';

export const templates = {
  'template-001': {
    id: 'template-001',
    name: 'Estate Collection 1',
    imageUrl: markerImg1,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
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
  },
  'template-002': {
    id: 'template-002',
    name: 'Classic Upright Headstone',
    imageUrl: markerImg2,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-003': {
    id: 'template-003',
    name: 'Classic Flat Headstone',
    imageUrl: markerImg3,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-004': {
    id: 'template-004',
    name: 'Classic Custom Headstone',
    imageUrl: markerImg4,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-005': {
    id: 'template-005',
    name: 'Classic Custom Headstone',
    imageUrl: markerImg5,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced   
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-006': {
    id: 'template-006',
    name: 'Classic Custom Headstone',
    imageUrl: markerImg6,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-007': {
    id: 'template-007',
    name: 'Classic Custom Headstone',
    imageUrl: markerImg7,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  },
  'template-008': {
    id: 'template-008',
    name: 'Classic Custom Headstone',
    imageUrl: markerImg8,
    realWorldWidth: 30, // inches
    realWorldHeight: 42, // inches
    editZones: [
      {
        id: 'top-banner',
        shape: 'arc', // You can get advanced   
        x: 5, y: 4, width: 20, height: 6,
        allows: ['text']
      },
      {
        id: 'main-body',
        x: 3, y: 11, width: 24, height: 28,
        allows: ['text', 'artwork']
      }
    ],
    designElements: []
  }
};
