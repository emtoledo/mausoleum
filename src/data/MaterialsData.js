// This file catalogues your materials
import black from '@/assets/images/materials/black.png';
import grey from '@/assets/images/materials/grey.png';
import bluepearl from '@/assets/images/materials/bluepearl.jpg';
import red from '@/assets/images/materials/red.png';
import mohagany from '@/assets/images/materials/mohagany.png';

export const materials = [
  {
    id: 'mat-001',
    name: 'Black Granite',
    textureUrl: black,
    // This swatch is for the UI picker
    swatch: blackGranite 
  },
  {
    id: 'mat-002',
    name: 'Grey Granite',
    textureUrl: grey,
    swatch: greyGranite
  },
  {
    id: 'mat-003',
    name: 'Blue Pearl',
    textureUrl: bluepearl,
    swatch: bluePearl
  },
  {
    id: 'mat-004',
    name: 'Red Granite',
    textureUrl: red,
    swatch: redGranite
  },
  {
    id: 'mat-005',
    name: 'Mohagany Granite',
    textureUrl: mohagany,
    swatch: mohaganyGranite
  }
];
