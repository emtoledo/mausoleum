// This is the most important file.
// It connects your product images to their real-world data.


// Floral Collection
import floral1 from '../assets/images/floral/floral1.png'
import floral2 from '../assets/images/floral/floral2.png'

// Import product images (using relative paths from src/data/ to src/assets/)
import markerImg1 from '../assets/images/templates/estate1.svg';
import markerImg1Overlay from '../assets/images/templates/estate1_overlay.svg';
import markerPreview1 from '../assets/images/previews/estate1.png';

import template002 from '../assets/images/templates/estate2.svg';
import template002Overlay from '../assets/images/templates/estate2_overlay.svg';
import template002Preview from '../assets/images/previews/estate2.png';

import template003 from '../assets/images/templates/estate3.svg';
import template003Overlay from '../assets/images/templates/estate3_overlay.svg';
import template003Preview from '../assets/images/previews/estate3.png';

import template004 from '../assets/images/templates/estate4.svg';
import template004Overlay from '../assets/images/templates/estate4_overlay.svg';
import template004Preview from '../assets/images/previews/estate4.png';

import template005 from '../assets/images/templates/estate5.svg';
import template005Overlay from '../assets/images/templates/estate5_overlay.svg';
import template005Preview from '../assets/images/previews/estate5.png';

import template006 from '../assets/images/templates/estate6.svg';
import template006Overlay from '../assets/images/templates/estate6_overlay.svg';
import template006Preview from '../assets/images/previews/estate6.png';

export const templates = {
  'template-001': {
    id: 'template-001',
    name: 'Estate Collection 1',
    productCategory: 'Estate Collection',
    imageUrl: markerImg1,
    overlayUrl: markerImg1Overlay,    
    previewImage: markerPreview1,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
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
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 0, y: 5, width: 9, height: 13
      },
      {
        id: 'floral2',
        imageUrl: floral1,
        x: 50.5, y: 5, width: 9, height: 13
      }
    ],
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 23, width: 60, height: 3,
        material: 'mat-006'
      }
    ]
  },
  'template-002': {
    id: 'template-002',
    name: 'Estate Collection 2',
    productCategory: 'Estate Collection',
    imageUrl: template002,
    overlayUrl: template002Overlay,    
    previewImage: template002Preview,
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
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 0, y: 5, width: 9, height: 13
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 50.1, y: 5, width: 10, height: 11
      }
    ],
    vaseDimensions: {
      width: 10,
      height: 11
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 23, width: 60, height: 3,
        material: 'mat-006'
      }
    ]
  },
  'template-003': {
    id: 'template-003',
    name: 'Estate Collection 3',
    productCategory: 'Estate Collection',
    imageUrl: template003,
    overlayUrl: template003Overlay,    
    previewImage: template003Preview,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-004', 
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
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 5, width: 10, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 50.1, y: 5, width: 10, height: 11
      }
    ],
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 23, width: 60, height: 3,
        material: 'mat-006'
      }
    ]    
  },
  'template-004': {
    id: 'template-004',
    name: 'Estate Collection 4',
    productCategory: 'Estate Collection',
    imageUrl: template004,
    overlayUrl: template004Overlay,    
    previewImage: template004Preview,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-003', 
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
    ]    
  },
  'template-005': {
    id: 'template-005',
    name: 'Estate Collection 5',
    productCategory: 'Estate Collection',
    imageUrl: template005,
    overlayUrl: template005Overlay,    
    previewImage: template005Preview,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
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
    ]    
  },
  'template-006': {
    id: 'template-006',
    name: 'Estate Collection 6',
    productCategory: 'Estate Collection',
    imageUrl: template006,
    overlayUrl: template006Overlay,    
    previewImage: template006Preview,
    realWorldWidth: 60, // inches
    realWorldHeight: 23, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-005', 
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
    ]    
  }
};
