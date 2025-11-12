// This file catalogues your artwork for the UI
import panel03 from '../assets/images/artwork/panels/PANEL03.DXF';
import panel04 from '../assets/images/artwork/panels/PANEL04.DXF';
import panel11 from '../assets/images/artwork/panels/PANEL11.DXF';
import panel14 from '../assets/images/artwork/panels/PANEL14.DXF';
import flower2 from '../assets/images/artwork/flower2.svg';
import flower3 from '../assets/images/artwork/flower3.svg';
import flower4 from '../assets/images/artwork/flower4.svg';
import flower5 from '../assets/images/artwork/flower5.svg';
import flower6 from '../assets/images/artwork/flower6.svg';
import flower7 from '../assets/images/artwork/flower7.svg';
import border1 from '../assets/images/artwork/BFLORSH.DXF';
import border2 from '../assets/images/artwork/ACANTHS.DXF';

// Textures
import panelbg from '../assets/images/materials/panelbg.png';


export const artwork = [
  {
    id: 'panel-03',
    name: 'PANEL03',
    category: 'Panels',
    imageUrl: panel03,
    textureUrl: panelbg,
    defaultWidth: 12 
  },
  {
    id: 'panel-04',
    name: 'PANEL04',
    category: 'Panels',
    imageUrl: panel04,
    textureUrl: panelbg,
    defaultWidth: 12 
  },
  {
    id: 'panel-11',
    name: 'PANEL11',
    category: 'Panels',
    imageUrl: panel11,
    textureUrl: panelbg,
    defaultWidth: 12 
  },
  {
    id: 'panel-14',
    name: 'PANEL14',
    category: 'Panels',
    imageUrl: panel14,
    textureUrl: panelbg,
    defaultWidth: 12 
  },
  {
    id: 'art-001',
    name: 'ACANTHS',
    category: 'Border',
    imageUrl: border2,
    defaultWidth: 5 
  },
  {
    id: 'art-002',
    name: 'Flower 2',
    category: 'Religious',
    imageUrl: flower2,
    defaultWidth: 2.5 // 2.5 inches
  },
  {
    id: 'art-003',
    name: 'Flower 3',
    category: 'Floral',
    imageUrl: flower3,
    defaultWidth: 5 // 2.5 inches
  },
  {
    id: 'art-004',
    name: 'Flower 4',
    category: 'Floral',
    imageUrl: flower4,
    defaultWidth: 5 // 2.5 inches
  },
  {
    id: 'art-005',
    name: 'Flower 5',
    category: 'Floral',
    imageUrl: flower5,
    defaultWidth: 6 // 2.5 inches
  },
  {
    id: 'art-006',
    name: 'Flower 6',
    category: 'Floral',
    imageUrl: flower6,
    defaultWidth: 10 // 2.5 inches
  },
  {
    id: 'art-007',
    name: 'Flower 7',
    category: 'Floral',
    imageUrl: flower7,
    defaultWidth: 6 // 2.5 inches
  },
  {
    id: 'art-border',
    name: 'BFLORSH',
    category: 'Border',
    imageUrl: border1,
    defaultWidth: 6 // 2.5 inches
  }
];
