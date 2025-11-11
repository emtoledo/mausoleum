// This file catalogues your artwork for the UI
import flower1 from '../assets/images/artwork/ACANTHS.DXF';
import flower2 from '../assets/images/artwork/flower2.svg';
import flower3 from '../assets/images/artwork/flower3.svg';
import flower4 from '../assets/images/artwork/flower4.svg';
import flower5 from '../assets/images/artwork/flower5.svg';
import flower6 from '../assets/images/artwork/flower6.svg';
import flower7 from '../assets/images/artwork/flower7.svg';
import border1 from '../assets/images/artwork/BFLORSH.DXF';

export const artwork = [
  {
    id: 'art-001',
    name: 'Flower 1',
    category: 'Floral',
    imageUrl: flower1,
    // Pre-define real-world size for consistent insertion
    defaultWidth: 5 // 3 inches
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
