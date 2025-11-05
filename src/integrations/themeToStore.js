/**
 * Wire theme events to Zustand store
 * Listens for 'cx:theme' events and updates userColors in store
 */

import useStore from '../core/store';
import { useVisStore } from '../state/useVisStore';

/**
 * Create a complementary color by rotating hue by 180 degrees
 */
function getComplementaryColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;
  
  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Rotate hue by 180 degrees (0.5 in 0-1 range)
  h = (h + 0.5) % 1;
  
  // Convert HSL back to RGB
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let rOut, gOut, bOut;
  if (s === 0) {
    rOut = gOut = bOut = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rOut = hue2rgb(p, q, h + 1/3);
    gOut = hue2rgb(p, q, h);
    bOut = hue2rgb(p, q, h - 1/3);
  }
  
  // Convert back to hex
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`;
}

/**
 * Initialize theme-to-store integration
 */
export function wireThemeToStore() {
  // Helper to push colors into the visual hand-effect store
  function applyHandEffectColors({ baseColor, rippleColor, smokeColor, fluidColor, particleTrailColor, noiseColor1, noiseColor2, energyNearColor, energyFarColor }) {
    const visStoreState = useVisStore.getState();
    const currentParams = visStoreState.params;
    const currentHandEffect = currentParams.handEffect || {};

    const updatedHandEffect = {
      ...currentHandEffect,
      ripple: {
        ...(currentHandEffect.ripple || {}),
        baseColor: baseColor ?? (currentHandEffect.ripple?.baseColor || '#00ccff'),
        rippleColor: rippleColor ?? (currentHandEffect.ripple?.rippleColor || '#ff00cc')
      },
      smoke: {
        ...(currentHandEffect.smoke || {}),
        color: smokeColor ?? (currentHandEffect.smoke?.color || '#ffffff')
      },
      fluidDistortion: {
        ...(currentHandEffect.fluidDistortion || {}),
        fluidColor: fluidColor ?? (currentHandEffect.fluidDistortion?.fluidColor || '#005eff')
      },
      particleTrail: {
        ...(currentHandEffect.particleTrail || {}),
        color: particleTrailColor ?? (currentHandEffect.particleTrail?.color || '#00ffff')
      },
      noiseDistortion: {
        ...(currentHandEffect.noiseDistortion || {}),
        color1: noiseColor1 ?? (currentHandEffect.noiseDistortion?.color1 || '#00ffff'),
        color2: noiseColor2 ?? (currentHandEffect.noiseDistortion?.color2 || '#ff00ff')
      },
      energyLines: {
        ...(currentHandEffect.energyLines || {}),
        colorNear: energyNearColor ?? (currentHandEffect.energyLines?.colorNear || '#00ffff'),
        colorFar: energyFarColor ?? (currentHandEffect.energyLines?.colorFar || '#ff00ff')
      }
    };

    // ONLY pass the handEffect, not the entire params object!
    // This ensures the handEffect reference changes and components re-render
    visStoreState.setParams({ handEffect: updatedHandEffect });
  }

  // APPLY INITIAL COLORS IMMEDIATELY - before any components render
  const initialUserColors = useStore.getState().userColors;
  if (initialUserColors) {
    // Small delay to ensure stores are fully initialized
    setTimeout(() => {
      const baseColor = initialUserColors.assetColor;
      applyHandEffectColors({
        baseColor: baseColor,
        rippleColor: getComplementaryColor(baseColor), // Use complementary color for ripple
        smokeColor: baseColor,
        fluidColor: baseColor,
        particleTrailColor: baseColor,
        noiseColor1: baseColor,
        noiseColor2: getComplementaryColor(baseColor), // Use complementary for gradient
        energyNearColor: baseColor,
        energyFarColor: getComplementaryColor(baseColor) // Use complementary for gradient
      });
    }, 100);
  }

  const handleThemeChange = (event) => {
    const theme = event.detail;
    if (!theme) return;

    // Update Zustand store with theme colors
    const setUserColors = useStore.getState().setUserColors;
    setUserColors({
      bgColor: theme.background,
      assetColor: theme.asset
    });

  // Update hand effect colors in useVisStore (map themed hand colors)
  const visStoreState = useVisStore.getState();
  const currentParams = visStoreState.params;
  const currentHandEffect = currentParams.handEffect || {};
    
    // Create updated hand effect with new colors
    // Ripple uses complementary color for visual variety
    const updatedHandEffect = {
      ...currentHandEffect,
      ripple: {
        ...(currentHandEffect.ripple || {}),
        baseColor: theme.asset,
        rippleColor: getComplementaryColor(theme.asset) // Complementary color for contrast
      },
      smoke: {
        ...(currentHandEffect.smoke || {}),
        color: theme.asset
      },
      fluidDistortion: {
        ...(currentHandEffect.fluidDistortion || {}),
        fluidColor: theme.asset
      },
      particleTrail: {
        ...(currentHandEffect.particleTrail || {}),
        color: theme.asset
      },
      noiseDistortion: {
        ...(currentHandEffect.noiseDistortion || {}),
        color1: theme.asset,
        color2: getComplementaryColor(theme.asset) // Complementary for gradient
      },
      energyLines: {
        ...(currentHandEffect.energyLines || {}),
        colorNear: theme.asset,
        colorFar: getComplementaryColor(theme.asset) // Complementary for gradient
      }
    };

    // ONLY pass the handEffect, not the entire params object!
    // This ensures the handEffect reference changes
    visStoreState.setParams({ handEffect: updatedHandEffect });
  };

  // Listen for theme events
  window.addEventListener('cx:theme', handleThemeChange);

  // Subscribe to manual user color changes as well, so hand effects follow UI pickers
  const unsubscribeUserColors = useStore.subscribe(
    (s) => s.userColors,
    (userColors, prev) => {
      if (!userColors) return;
      const baseColor = userColors.assetColor;
      // Map all hand-effect colors to assetColor, with complementary ripple color
      applyHandEffectColors({
        baseColor: baseColor,
        rippleColor: getComplementaryColor(baseColor), // Complementary for visual interest
        smokeColor: baseColor,
        fluidColor: baseColor,
        particleTrailColor: baseColor,
        noiseColor1: baseColor,
        noiseColor2: getComplementaryColor(baseColor) // Complementary for gradient
      });
    }
  );

  // Return cleanup function
  return () => {
    window.removeEventListener('cx:theme', handleThemeChange);
    if (unsubscribeUserColors) unsubscribeUserColors();
  };
}
