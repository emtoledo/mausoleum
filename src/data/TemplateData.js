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

import template007 from '../assets/images/templates/estate7.svg';
import template007Overlay from '../assets/images/templates/estate7_overlay.svg';
import template007Preview from '../assets/images/previews/estate7.png';

import template008 from '../assets/images/templates/estate8.svg';
import template008Overlay from '../assets/images/templates/estate8_overlay.svg';
import template008Preview from '../assets/images/previews/estate8.png';

import template009 from '../assets/images/templates/estate9.svg';
import template009Overlay from '../assets/images/templates/estate9_overlay.svg';
import template009Preview from '../assets/images/previews/estate9.png';

import template010 from '../assets/images/templates/estate10.svg';
import template010Overlay from '../assets/images/templates/estate10_overlay.svg';
import template010Preview from '../assets/images/previews/estate10.png';


import template011 from '../assets/images/templates/estate11.svg';
import template011Overlay from '../assets/images/templates/estate11_overlay.svg';
import template011Preview from '../assets/images/previews/estate11.png';

import template012 from '../assets/images/templates/estate12.svg';
import template012Overlay from '../assets/images/templates/estate12_overlay.svg';
import template012Preview from '../assets/images/previews/estate12.png';


export const templates = {
  'template-001': {
    id: 'template-001',
    name: 'Estate Collection 1',
    productCategory: 'Estate Collection',
    imageUrl: markerImg1,
    overlayUrl: markerImg1Overlay,    
    previewImage: markerPreview1,
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 2.5, width: 56, height: 23
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 1, y: 8.5, width: 10, height: 15
      },
      {
        id: 'floral2',
        imageUrl: floral1,
        x: 72.5, y: 8.5, width: 10, height: 15
      }
    ],
    vaseDimensions: {
      width: 8,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
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
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-001', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 2.5, width: 56, height: 23
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 1, y: 8.5, width: 10, height: 15
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 72, y: 9, width: 10, height: 12
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
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
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-004', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },  
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 1, width: 56, height: 24.5
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 1, y: 9, width: 10, height: 12
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 72.5, y: 9, width: 10, height: 12
      }
    ],
    vaseDimensions: {
      width: 8,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
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
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-003', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },  
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 1, width: 56, height: 24.5
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 1.5, y: 8.5, width: 10, height: 15
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 72.5, y: 9, width: 10, height: 12
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
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
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 1, width: 56, height: 24.5
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 1, y: 9, width: 10, height: 12
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 72.5, y: 9, width: 10, height: 12
      }
    ],
    vaseDimensions: {
      width: 8,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
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
    realWorldWidth: 84, // inches
    realWorldHeight: 32, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-005', 
    canvas: {
      width: 84, // inches - overall canvas width
      height: 36 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 14, y: 1, width: 56, height: 24.5
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral1,
        x: 1.5, y: 8.5, width: 10, height: 15
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 72.25, y: 9, width: 10, height: 12
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 32, width: 84, height: 4,
        material: 'mat-006'
      }  
    ]    
  },
  'template-007': {
    id: 'template-007',
    name: 'Estate Collection 7',
    productCategory: 'Estate Collection',
    imageUrl: template007,
    overlayUrl: template007Overlay,    
    previewImage: template007Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-001', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 3.5, width: 46, height: 20
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 56.5, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 8,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  },
  'template-008': {
    id: 'template-008',
    name: 'Estate Collection 8',
    productCategory: 'Estate Collection',
    imageUrl: template008,
    overlayUrl: template008Overlay,    
    previewImage: template008Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-005', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 3.5, width: 46, height: 20
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 57, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  },
  'template-009': {
    id: 'template-009',
    name: 'Estate Collection 9',
    productCategory: 'Estate Collection',
    imageUrl: template009,
    overlayUrl: template009Overlay,    
    previewImage: template009Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 1.5, width: 46, height: 22
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 57, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  },
  'template-010': {
    id: 'template-010',
    name: 'Estate Collection 10',
    productCategory: 'Estate Collection',
    imageUrl: template010,
    overlayUrl: template010Overlay,    
    previewImage: template010Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-001', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 1.5, width: 46, height: 22
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 57, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  },
  'template-011': {
    id: 'template-011',
    name: 'Estate Collection 11',
    productCategory: 'Estate Collection',
    imageUrl: template011,
    overlayUrl: template011Overlay,    
    previewImage: template011Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-003', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 2.5, width: 46, height: 21
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 57, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  },
  'template-012': {
    id: 'template-012',
    name: 'Estate Collection 12',
    productCategory: 'Estate Collection',
    imageUrl: template012,
    overlayUrl: template012Overlay,    
    previewImage: template012Preview,
    realWorldWidth: 66, // inches
    realWorldHeight: 30, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-004', 
    canvas: {
      width: 66, // inches - overall canvas width
      height: 34 // inches - overall canvas height
    },    
    editZones: [
      {
        id: 'main-zone',
        x: 10, y: 2.5, width: 46, height: 21
      }
    ],
    floral: [
      {
        id: 'floral1',
        imageUrl: floral2,
        x: 0, y: 7, width: 9, height: 11
      },
      {
        id: 'floral2',
        imageUrl: floral2,
        x: 57, y: 7, width: 9, height: 11
      }
    ],
    vaseDimensions: {
      width: 6,
      height: 10
    },
    productBase: [
      {
        id: 'default-base',
        x: 0, y: 30, width: 66, height: 4,
        material: 'mat-006'
      }
    ]    
  }
};
