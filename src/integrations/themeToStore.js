/**
 * Wire theme events to Zustand store
 * Listens for 'cx:theme' events and updates userColors in store
 */

import useStore from '../core/store';
import { useVisStore } from '../state/useVisStore';

/**
 * Initialize theme-to-store integration
 */
export function wireThemeToStore() {
  const handleThemeChange = (event) => {
    const theme = event.detail;
    if (!theme) return;

    // Update Zustand store with theme colors
    const setUserColors = useStore.getState().setUserColors;
    setUserColors({
      bgColor: theme.background,
      assetColor: theme.asset
    });

    // Update hand effect colors in useVisStore
    const visStoreState = useVisStore.getState();
    const currentHandEffect = visStoreState.params.handEffect || {};
    
    // Update hand effect colors based on theme
    visStoreState.setParams({
      handEffect: {
        ...currentHandEffect,
        ripple: {
          ...currentHandEffect.ripple,
          baseColor: theme.handLeft || theme.asset,
          rippleColor: theme.handRight || theme.asset
        },
        smoke: {
          ...currentHandEffect.smoke,
          color: theme.handCenter || theme.asset
        },
        fluidDistortion: {
          ...currentHandEffect.fluidDistortion,
          fluidColor: theme.handLeft || theme.asset
        }
      }
    });

    console.log('🎨 Theme synced to store:', theme.background, theme.asset);
    console.log('🎨 Hand colors updated:', theme.handLeft, theme.handRight, theme.handCenter);
  };

  // Listen for theme events
  window.addEventListener('cx:theme', handleThemeChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('cx:theme', handleThemeChange);
  };
}
