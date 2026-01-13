/**
 * Mood-based Color Schemes for ChoreoXplore
 * 
 * This mapping is based on color psychology research showing relationships
 * between emotional states and color preferences.
 * 
 * References:
 * - Valdez, P., & Mehrabian, A. (1994). Effects of color on emotions.
 * - Elliot, A. J., & Maier, M. A. (2014). Color psychology: Effects of perceiving color on psychological functioning.
 * - Kaya, N., & Epps, H. H. (2004). Relationship between color and emotion: A study of college students.
 */

/**
 * Calculate relative luminance of a color (0-255 range)
 * Uses ITU-R BT.709 coefficients for perceived brightness
 * @param {string} hex - Hex color string (e.g., "#FF5733")
 * @returns {number} - Luminance value (0-255)
 */
function calculateLuminance(hex) {
  const rgb = hexToRgb(hex);
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Raw mood-to-color mappings from research
 * Each mood has two colors that will be assigned as background and asset colors
 * based on their brightness (darker → background, lighter → asset)
 */
const moodColorMap = {
  Happy: {
    colors: ['#FFD700', '#FF8C00'], // Yellow, Orange
    description: 'Bright and warm colors associated with joy and positivity'
  },
  Calm: {
    colors: ['#4169E1', '#90EE90'], // Blue, Green
    description: 'Cool, soothing colors that promote tranquility and peace'
  },
  Energetic: {
    colors: ['#DC143C', '#FF8C00'], // Red, Orange
    description: 'Vibrant, stimulating colors that evoke excitement and vitality'
  },
  Relaxed: {
    colors: ['#4169E1', '#90EE90'], // Blue, Green
    description: 'Peaceful colors that encourage relaxation and ease'
  },
  Confident: {
    colors: ['#DC143C', '#9370DB'], // Red, Purple
    description: 'Bold, powerful colors associated with self-assurance and strength'
  },
  Optimistic: {
    colors: ['#FFD700', '#FFB6C1'], // Yellow, Pink
    description: 'Cheerful colors that inspire hope and positive outlook'
  },
  Passionate: {
    colors: ['#DC143C', '#9370DB'], // Red, Purple
    description: 'Intense, deep colors representing strong emotions and desire'
  },
  Playful: {
    colors: ['#FF8C00', '#FFB6C1'], // Orange, Pink
    description: 'Fun, lighthearted colors that evoke joy and spontaneity'
  },
  Peaceful: {
    colors: ['#4169E1', '#FFFFFF'], // Blue, White
    description: 'Serene colors promoting harmony and inner peace'
  },
  Warm: {
    colors: ['#8B4513', '#FF8C00'], // Brown, Orange
    description: 'Earthy, warm colors that provide comfort and security'
  },
  Fresh: {
    colors: ['#90EE90', '#FFD700'], // Green, Yellow
    description: 'Natural colors representing renewal and equilibrium'
  },
  Serene: {
    colors: ['#4169E1', '#E6E6FA'], // Blue, Lavender (Purple)
    description: 'Soft, calming colors that create a sense of tranquility'
  },
  Joyful: {
    colors: ['#FFD700', '#FFB6C1'], // Yellow, Pink
    description: 'Bright, cheerful colors that radiate happiness'
  },
  Creative: {
    colors: ['#9370DB', '#FF8C00'], // Purple, Orange
    description: 'Imaginative colors that stimulate creativity and innovation'
  }
};

/**
 * Get color scheme for a specific mood
 * Automatically assigns darker color to background and lighter color to assets
 * @param {string} mood - The mood name (must match keys in moodColorMap)
 * @returns {{bgColor: string, assetColor: string, description: string} | null}
 */
export function getMoodColorScheme(mood) {
  const moodData = moodColorMap[mood];
  if (!moodData) {
    console.warn(`Mood "${mood}" not found in color scheme map`);
    return null;
  }

  const [color1, color2] = moodData.colors;
  const luminance1 = calculateLuminance(color1);
  const luminance2 = calculateLuminance(color2);

  // Assign darker color to background, lighter to assets
  const bgColor = luminance1 < luminance2 ? color1 : color2;
  const assetColor = luminance1 < luminance2 ? color2 : color1;

  return {
    bgColor,
    assetColor,
    description: moodData.description
  };
}

/**
 * Get list of all available moods
 * @returns {string[]} - Array of mood names
 */
export function getAvailableMoods() {
  return Object.keys(moodColorMap);
}

/**
 * Get preview of all mood color schemes
 * Useful for displaying mood selector UI
 * @returns {Array<{mood: string, bgColor: string, assetColor: string, description: string}>}
 */
export function getAllMoodSchemes() {
  return Object.keys(moodColorMap).map(mood => ({
    mood,
    ...getMoodColorScheme(mood)
  }));
}
