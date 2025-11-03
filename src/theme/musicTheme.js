/**
 * Music-to-color theme generator
 * Extracts palette from album art and derives colors from audio features
 */

import Vibrant from 'node-vibrant';
import tinycolor from 'tinycolor2';

/**
 * Extract color palette from album art
 */
async function extractPaletteFromImage(imageUrl) {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();
    
    return {
      vibrant: palette.Vibrant?.hex,
      darkVibrant: palette.DarkVibrant?.hex,
      lightVibrant: palette.LightVibrant?.hex,
      muted: palette.Muted?.hex,
      darkMuted: palette.DarkMuted?.hex,
      lightMuted: palette.LightMuted?.hex
    };
  } catch (error) {
    console.warn('Failed to extract palette from image:', error);
    return null;
  }
}

/**
 * Derive hue from Spotify key and mode
 * Keys: 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
 * Mode: 1=major, 0=minor
 */
function deriveHueFromKey(key, mode) {
  // Map musical keys to color wheel (0-360 degrees)
  const keyHues = [
    0,    // C - Red
    30,   // C# - Orange-Red
    60,   // D - Yellow-Orange
    90,   // D# - Yellow
    120,  // E - Yellow-Green
    150,  // F - Green
    180,  // F# - Cyan
    210,  // G - Blue
    240,  // G# - Blue-Violet
    270,  // A - Violet
    300,  // A# - Magenta
    330   // B - Red-Magenta
  ];

  let hue = keyHues[key] || 210; // Default to blue
  
  // Shift hue slightly for minor keys
  if (mode === 0) {
    hue = (hue + 15) % 360;
  }
  
  return hue;
}

/**
 * Build theme from album art + audio features
 */
export async function buildMusicTheme(track, audioFeatures) {
  const imageUrl = track?.album?.images?.[0]?.url;
  let palette = null;

  // Try to extract palette from album art
  if (imageUrl) {
    palette = await extractPaletteFromImage(imageUrl);
  }

  // Derive colors from audio features as fallback/enhancement
  const baseHue = audioFeatures?.key !== undefined 
    ? deriveHueFromKey(audioFeatures.key, audioFeatures.mode)
    : 210; // Default to blue

  // Map audio features to color properties
  const energy = audioFeatures?.energy || 0.5;
  const valence = audioFeatures?.valence || 0.5; // Musical positivity
  const danceability = audioFeatures?.danceability || 0.5;

  // Saturation based on energy (more energetic = more saturated)
  const saturation = Math.round(50 + energy * 40); // 50-90%
  
  // Hue adjustment based on valence (positive = warmer, negative = cooler)
  const valenceShift = (valence - 0.5) * 60; // -30 to +30 degrees
  const adjustedHue = (baseHue + valenceShift + 360) % 360;

  // Background: darker, less saturated
  const bgLightness = Math.round(10 + energy * 5); // 10-15% for dark bg
  const bgSaturation = Math.round(20 + energy * 20); // 20-40%
  
  let background;
  if (palette?.darkMuted || palette?.darkVibrant) {
    // Use palette if available, but ensure it's dark enough
    const paletteColor = tinycolor(palette.darkMuted || palette.darkVibrant);
    const hsl = paletteColor.toHsl();
    if (hsl.l > 0.2) {
      hsl.l = bgLightness / 100;
    }
    background = tinycolor(hsl).toHexString();
  } else {
    // Fallback to audio-feature-derived color
    background = tinycolor({ h: adjustedHue, s: bgSaturation / 100, l: bgLightness / 100 }).toHexString();
  }

  // Asset color: vibrant, medium-high lightness
  const assetLightness = Math.round(50 + danceability * 20); // 50-70%
  
  let asset;
  if (palette?.vibrant || palette?.lightVibrant) {
    // Use palette if available
    const paletteColor = tinycolor(palette.vibrant || palette.lightVibrant);
    const hsl = paletteColor.toHsl();
    // Ensure good contrast
    if (hsl.l < 0.4) {
      hsl.l = assetLightness / 100;
    }
    asset = tinycolor(hsl).toHexString();
  } else {
    // Fallback to audio-feature-derived color
    asset = tinycolor({ h: adjustedHue, s: saturation / 100, l: assetLightness / 100 }).toHexString();
  }

  // Hand colors: complementary and analogous variations
  const handLeftHue = (adjustedHue + 30) % 360;
  const handRightHue = (adjustedHue - 30 + 360) % 360;
  
  const handLeft = tinycolor({ 
    h: handLeftHue, 
    s: saturation / 100, 
    l: assetLightness / 100 
  }).toHexString();
  
  const handRight = tinycolor({ 
    h: handRightHue, 
    s: saturation / 100, 
    l: assetLightness / 100 
  }).toHexString();

  return {
    background,
    asset,
    handLeft,
    handRight,
    meta: {
      trackId: track.id,
      trackName: track.name,
      artist: track.artists?.[0]?.name,
      energy,
      valence,
      danceability,
      key: audioFeatures?.key,
      mode: audioFeatures?.mode,
      baseHue: adjustedHue
    }
  };
}
