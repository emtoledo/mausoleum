// Estate Collection Product Data for Studio 


// Floral Collection
import floral1 from '../assets/images/floral/floral1.png'
import floral2 from '../assets/images/floral/floral2.png'

// Import product images (using relative paths from src/data/ to src/assets/)
import markerImg1 from '../assets/images/products/estate/estate1.svg';
import markerImg1Overlay from '../assets/images/products/estate/estate1_overlay.svg';
import markerPreview1 from '../assets/images/previews/estate/estate1.png';

import product002 from '../assets/images/products/estate/estate2.svg';
import product002Overlay from '../assets/images/products/estate/estate2_overlay.svg';
import product002Preview from '../assets/images/previews/estate/estate2.png';

import product003 from '../assets/images/products/estate/estate3.svg';
import product003Overlay from '../assets/images/products/estate/estate3_overlay.svg';
import product003Preview from '../assets/images/previews/estate/estate3.png';

import product004 from '../assets/images/products/estate/estate4.svg';
import product004Overlay from '../assets/images/products/estate/estate4_overlay.svg';
import product004Preview from '../assets/images/previews/estate/estate4.png';

import product005 from '../assets/images/products/estate/estate5.svg';
import product005Overlay from '../assets/images/products/estate/estate5_overlay.svg';
import product005Preview from '../assets/images/previews/estate/estate5.png';

import product006 from '../assets/images/products/estate/estate6.svg';
import product006Overlay from '../assets/images/products/estate/estate6_overlay.svg';
import product006Preview from '../assets/images/previews/estate/estate6.png';

import product007 from '../assets/images/products/estate/estate7.svg';
import product007Overlay from '../assets/images/products/estate/estate7_overlay.svg';
import product007Preview from '../assets/images/previews/estate/estate7.png';

import product008 from '../assets/images/products/estate/estate8.svg';
import product008Overlay from '../assets/images/products/estate/estate8_overlay.svg';
import product008Preview from '../assets/images/previews/estate/estate8.png';

import product009 from '../assets/images/products/estate/estate9.svg';
import product009Overlay from '../assets/images/products/estate/estate9_overlay.svg';
import product009Preview from '../assets/images/previews/estate/estate9.png';

import product010 from '../assets/images/products/estate/estate10.svg';
import product010Overlay from '../assets/images/products/estate/estate10_overlay.svg';
import product010Preview from '../assets/images/previews/estate/estate10.png';


import product011 from '../assets/images/products/estate/estate11.svg';
import product011Overlay from '../assets/images/products/estate/estate11_overlay.svg';
import product011Preview from '../assets/images/previews/estate/estate11.png';

import product012 from '../assets/images/products/estate/estate12.svg';
import product012Overlay from '../assets/images/products/estate/estate12_overlay.svg';
import product012Preview from '../assets/images/previews/estate/estate12.png';


export const products = {
  'product-001': {
    id: 'product-001',
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
        x: 13, y: 3.5, width: 58, height: 22
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
  'product-002': {
    id: 'product-002',
    name: 'Estate Collection 2',
    productCategory: 'Estate Collection',
    imageUrl: product002,
    overlayUrl: product002Overlay,    
    previewImage: product002Preview,
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
        x: 13, y: 3.5, width: 58, height: 22
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
  'product-003': {
    id: 'product-003',
    name: 'Estate Collection 3',
    productCategory: 'Estate Collection',
    imageUrl: product003,
    overlayUrl: product003Overlay,    
    previewImage: product003Preview,
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
        x: 13, y: 2, width: 58, height: 23.5
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
  'product-004': {
    id: 'product-004',
    name: 'Estate Collection 4',
    productCategory: 'Estate Collection',
    imageUrl: product004,
    overlayUrl: product004Overlay,    
    previewImage: product004Preview,
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
        x: 13, y: 2, width: 58, height: 23.5
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
  'product-005': {
    id: 'product-005',
    name: 'Estate Collection 5',
    productCategory: 'Estate Collection',
    imageUrl: product005,
    overlayUrl: product005Overlay,    
    previewImage: product005Preview,
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
        x: 13, y: 3, width: 58, height: 22.25
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
  'product-006': {
    id: 'product-006',
    name: 'Estate Collection 6',
    productCategory: 'Estate Collection',
    imageUrl: product006,
    overlayUrl: product006Overlay,    
    previewImage: product006Preview,
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
        x: 13, y: 3, width: 58, height: 22.25
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
  'product-007': {
    id: 'product-007',
    name: 'Estate Collection 7',
    productCategory: 'Estate Collection',
    imageUrl: product007,
    overlayUrl: product007Overlay,    
    previewImage: product007Preview,
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
  'product-008': {
    id: 'product-008',
    name: 'Estate Collection 8',
    productCategory: 'Estate Collection',
    imageUrl: product008,
    overlayUrl: product008Overlay,    
    previewImage: product008Preview,
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
  'product-009': {
    id: 'product-009',
    name: 'Estate Collection 9',
    productCategory: 'Estate Collection',
    imageUrl: product009,
    overlayUrl: product009Overlay,    
    previewImage: product009Preview,
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
  'product-010': {
    id: 'product-010',
    name: 'Estate Collection 10',
    productCategory: 'Estate Collection',
    imageUrl: product010,
    overlayUrl: product010Overlay,    
    previewImage: product010Preview,
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
  'product-011': {
    id: 'product-011',
    name: 'Estate Collection 11',
    productCategory: 'Estate Collection',
    imageUrl: product011,
    overlayUrl: product011Overlay,    
    previewImage: product011Preview,
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
  'product-012': {
    id: 'product-012',
    name: 'Estate Collection 12',
    productCategory: 'Estate Collection',
    imageUrl: product012,
    overlayUrl: product012Overlay,    
    previewImage: product012Preview,
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

// Add backward compatibility: map old template-XXX IDs to new product-XXX IDs
// This allows existing projects with template-001, template-002, etc. to still work
Object.keys(products).forEach(key => {
  if (key.startsWith('product-')) {
    const oldKey = key.replace('product-', 'template-');
    products[oldKey] = products[key];
  }
});

// Export templates as alias for backward compatibility during migration
export const templates = products;

