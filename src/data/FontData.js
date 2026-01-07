/**
 * FontData.js
 * 
 * Defines the fonts available for text objects in the design studio.
 * Each font includes the display name and the corresponding font file name.
 * Font files should be placed in /public/fonts/ directory.
 */

export const fontData = [
  {
    id: 'times-new-roman',
    name: 'Times New Roman',
    fontFamily: 'Times New Roman',
    fileName: 'Times New Roman.ttf',
    category: 'serif'
  },
  {
    id: 'arial',
    name: 'Arial',
    fontFamily: 'Arial',
    fileName: 'Arial.ttf',
    category: 'sans-serif'
  },
  {
    id: 'helvetica',
    name: 'Helvetica',
    fontFamily: 'Helvetica',
    fileName: 'Helvetica.ttc',
    category: 'sans-serif'
  },
  {
    id: 'helvetica-neue',
    name: 'Helvetica Neue',
    fontFamily: 'Helvetica Neue',
    fileName: 'HelveticaNeue.ttc',
    category: 'sans-serif'
  },
  {
    id: 'georgia',
    name: 'Georgia',
    fontFamily: 'Georgia',
    fileName: 'Georgia.ttf',
    category: 'serif'
  },
  {
    id: 'geneva',
    name: 'Geneva',
    fontFamily: 'Geneva',
    fileName: 'Geneva.ttf',
    category: 'sans-serif'
  },
  {
    id: 'avenir',
    name: 'Avenir',
    fontFamily: 'Avenir',
    fileName: 'Avenir.ttc',
    category: 'sans-serif'
  },
  {
    id: 'palatino',
    name: 'Palatino',
    fontFamily: 'Palatino',
    fileName: 'Palatino.ttc',
    category: 'serif'
  },
  {
    id: 'academy-engraved',
    name: 'Academy Engraved LET',
    fontFamily: 'Academy Engraved LET',
    fileName: 'Academy Engraved LET Fonts.ttf',
    category: 'decorative'
  },
  {
    id: 'apple-chancery',
    name: 'Apple Chancery',
    fontFamily: 'Apple Chancery',
    fileName: 'Apple Chancery.ttf',
    category: 'script'
  },
  {
    id: 'big-caslon',
    name: 'BigCaslon',
    fontFamily: 'BigCaslon',
    fileName: 'BigCaslon.ttf',
    category: 'serif'
  },
  {
    id: 'brush-script',
    name: 'Brush Script',
    fontFamily: 'Brush Script',
    fileName: 'Brush Script.ttf',
    category: 'script'
  },
  {
    id: 'impact',
    name: 'Impact',
    fontFamily: 'Impact',
    fileName: 'Impact.ttf',
    category: 'sans-serif'
  },
  {
    id: 'bodoni-moda-sc',
    name: 'Bodoni Moda SC',
    fontFamily: 'Bodoni Moda SC',
    fileName: 'BodoniModaSC.ttf',
    category: 'serif'
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    fontFamily: 'Cinzel',
    fileName: 'Cinzel.ttf',
    category: 'serif'
  },
  {
    id: 'gloock',
    name: 'Gloock',
    fontFamily: 'Gloock',
    fileName: 'Gloock-Regular.ttf',
    category: 'serif'
  },
  {
    id: 'goudy-bookletter',
    name: 'Goudy Bookletter 1911',
    fontFamily: 'Goudy Bookletter 1911',
    fileName: 'GoudyBookletter1911-Regular.ttf',
    category: 'serif'
  },
  {
    id: 'lavishly-yours',
    name: 'Lavishly Yours',
    fontFamily: 'Lavishly Yours',
    fileName: 'LavishlyYours-Regular.ttf',
    category: 'script'
  },
  {
    id: 'league-gothic',
    name: 'League Gothic',
    fontFamily: 'League Gothic',
    fileName: 'LeagueGothic-Regular.ttf',
    category: 'sans-serif'
  },
  {
    id: 'monsieur-la-doulaise',
    name: 'Monsieur La Doulaise',
    fontFamily: 'Monsieur La Doulaise',
    fileName: 'MonsieurLaDoulaise-Regular.ttf',
    category: 'script'
  },
  {
    id: 'pinyon-script',
    name: 'Pinyon Script',
    fontFamily: 'Pinyon Script',
    fileName: 'PinyonScript-Regular.ttf',
    category: 'script'
  }
];

/**
 * Get font by fontFamily name
 * @param {string} fontFamily - Font family name (e.g., "Times New Roman")
 * @returns {Object|null} - Font object or null if not found
 */
export const getFontByFamily = (fontFamily) => {
  return fontData.find(font => font.fontFamily === fontFamily) || null;
};

/**
 * Get font by ID
 * @param {string} id - Font ID (e.g., "times-new-roman")
 * @returns {Object|null} - Font object or null if not found
 */
export const getFontById = (id) => {
  return fontData.find(font => font.id === id) || null;
};

/**
 * Get fonts by category
 * @param {string} category - Font category (e.g., "serif", "sans-serif", "script", "decorative")
 * @returns {Array} - Array of font objects
 */
export const getFontsByCategory = (category) => {
  return fontData.filter(font => font.category === category);
};

/**
 * Generate font map for DXF export
 * Maps font family names to file names
 * @returns {Object} - Object mapping fontFamily to fileName
 */
export const getFontMap = () => {
  const map = {};
  fontData.forEach(font => {
    map[font.fontFamily] = font.fileName;
  });
  return map;
};

export default fontData;

