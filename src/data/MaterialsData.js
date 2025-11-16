// This file catalogues your materials
import black from '../assets/images/materials/black.png';
import grey from '../assets/images/materials/grey.png';
import bluepearl from '../assets/images/materials/bluepearl.png';
import red from '../assets/images/materials/red.png';
import mahogany from '../assets/images/materials/mahogany.png';
import base from '../assets/images/materials/base.png';

export const materials = [
  {
    id: 'mat-001',
    name: 'Black Granite',
    textureUrl: black,
    swatch: black
  },
  {
    id: 'mat-002',
    name: 'Grey Granite',
    textureUrl: grey,
    swatch: grey,
    overlayFill:'#898989',
  },
  {
    id: 'mat-003',
    name: 'Blue Pearl',
    textureUrl: bluepearl,
    swatch: bluepearl
  },
  {
    id: 'mat-004',
    name: 'Red Granite',
    textureUrl: red,
    swatch: red
  },
  {
    id: 'mat-005',
    name: 'Mahogany Granite',
    textureUrl: mahogany,
    swatch: mahogany
  },
  {
    id: 'mat-006',
    name: 'Default Base',
    textureUrl: base,
    swatch: base
  }
];
