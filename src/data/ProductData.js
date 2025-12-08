// Estate Collection Product Data for Studio 

// Floral Collection - Using static paths for production compatibility
const floral1 = '/images/floral/floral1.png';
const floral2 = '/images/floral/floral2.png';


export const products = {
  'product-001': {
    id: 'product-001',
    name: 'Estate Collection 1',
    productCategory: 'Estate Collection',
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
  },
  'product-013': {
    id: 'product-013',
    name: 'Prestige Collection 1',
    productCategory: 'Prestige Collection',
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
  'prestige-2': {
    id: 'prestige-2',
    name: 'Prestige Collection 2',
    productCategory: 'Prestige Collection',
    realWorldWidth: 60, // inches
    realWorldHeight: 44, // inches
    availableMaterials: ['mat-001','mat-002', 'mat-003', 'mat-004', 'mat-005'],
    defaultMaterialId: 'mat-002', 
    canvas: {
      width: 60, // inches - overall canvas width
      height: 48 // inches - overall canvas height
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
        x: 0, y: 30, width: 60, height: 4,
        material: 'mat-006'
      }
    ]    
  }
};

// Helper functions for category-based access
export const getProductsByCategory = (category) => {
  return Object.values(products).filter(product => product.productCategory === category);
};

export const getAllCategories = () => {
  const categories = new Set();
  Object.values(products).forEach(product => {
    if (product.productCategory) {
      categories.add(product.productCategory);
    }
  });
  return Array.from(categories).sort();
};

export const getProductById = (id) => {
  return products[id] || null;
};

// Export products grouped by category for easier access
export const productsByCategory = getAllCategories().reduce((acc, category) => {
  acc[category] = getProductsByCategory(category);
  return acc;
}, {});
