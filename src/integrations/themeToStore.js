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

    console.log('🎨 Theme synced to store:', theme.background, theme.asset);
    console.log('🎨 Hand colors from theme:', { 
      handLeft: theme.handLeft, 
      handRight: theme.handRight, 
      handCenter: theme.handCenter 
    });

    // Update hand effect colors in useVisStore
    const visStoreState = useVisStore.getState();
    const currentParams = visStoreState.params;
    const currentHandEffect = currentParams.handEffect || {};
    
    // Create updated hand effect with new colors
    const updatedHandEffect = {
      ...currentHandEffect,
      ripple: {
        ...(currentHandEffect.ripple || {}),
        baseColor: theme.handLeft || theme.asset,
        rippleColor: theme.handRight || theme.asset
      },
      smoke: {
        ...(currentHandEffect.smoke || {}),
        color: theme.handCenter || theme.asset
      },
      fluidDistortion: {
        ...(currentHandEffect.fluidDistortion || {}),
        fluidColor: theme.handLeft || theme.asset
      }
    };

    console.log('🎨 Updating hand effect colors:', {
      ripple: { 
        baseColor: updatedHandEffect.ripple.baseColor, 
        rippleColor: updatedHandEffect.ripple.rippleColor 
      },
      smoke: { color: updatedHandEffect.smoke.color },
      fluid: { fluidColor: updatedHandEffect.fluidDistortion.fluidColor }
    });
    
    // Force a complete update by creating a new params object
    // This ensures React detects the change
    const currentParamsSnapshot = { ...currentParams };
    visStoreState.setParams({
      ...currentParamsSnapshot,
      handEffect: updatedHandEffect
    });

    // Verify the update
    setTimeout(() => {
      const verifyState = useVisStore.getState();
      console.log('🎨 Verified hand effect colors after update:', {
        ripple: verifyState.params.handEffect?.ripple?.baseColor,
        smoke: verifyState.params.handEffect?.smoke?.color,
        fluid: verifyState.params.handEffect?.fluidDistortion?.fluidColor
      });
    }, 100);
  };

  // Listen for theme events
  window.addEventListener('cx:theme', handleThemeChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('cx:theme', handleThemeChange);
  };
}
