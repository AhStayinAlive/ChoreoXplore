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

    console.log('═══════════════════════════════════════');
    console.log('🎨 THEME UPDATE EVENT RECEIVED');
    console.log('═══════════════════════════════════════');

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
    
    console.log('📊 BEFORE UPDATE - Current handEffect in store:', {
      type: currentHandEffect.type,
      selection: currentHandEffect.handSelection,
      ripple: currentHandEffect.ripple?.baseColor,
      smoke: currentHandEffect.smoke?.color,
      fluid: currentHandEffect.fluidDistortion?.fluidColor,
      fullObject: currentHandEffect
    });
    
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
      },
      particleTrail: {
        ...(currentHandEffect.particleTrail || {}),
        color: theme.asset
      }
    };

    console.log('🎨 Updating hand effect colors:', {
      ripple: { 
        baseColor: updatedHandEffect.ripple.baseColor, 
        rippleColor: updatedHandEffect.ripple.rippleColor 
      },
      smoke: { color: updatedHandEffect.smoke.color },
      fluid: { fluidColor: updatedHandEffect.fluidDistortion.fluidColor },
      particleTrail: { color: updatedHandEffect.particleTrail.color }
    });
    
    console.log('📝 CALLING setParams with updated handEffect...');
    
    // Force a complete update by creating a new params object
    // This ensures React detects the change
    const currentParamsSnapshot = { ...currentParams };
    const newParams = {
      ...currentParamsSnapshot,
      handEffect: updatedHandEffect
    };
    
    console.log('📦 New params object to be set:', {
      hasHandEffect: !!newParams.handEffect,
      fluidColor: newParams.handEffect?.fluidDistortion?.fluidColor
    });
    
    visStoreState.setParams(newParams);
    
    console.log('✅ setParams CALLED');

    // Verify the update immediately
    const immediateVerify = useVisStore.getState();
    console.log('📊 IMMEDIATE VERIFY - Store state after setParams:', {
      ripple: immediateVerify.params.handEffect?.ripple?.baseColor,
      smoke: immediateVerify.params.handEffect?.smoke?.color,
      fluid: immediateVerify.params.handEffect?.fluidDistortion?.fluidColor,
      particleTrail: immediateVerify.params.handEffect?.particleTrail?.color
    });

    // Verify the update after a delay
    setTimeout(() => {
      const verifyState = useVisStore.getState();
      console.log('📊 DELAYED VERIFY (100ms) - Store state:', {
        ripple: verifyState.params.handEffect?.ripple?.baseColor,
        smoke: verifyState.params.handEffect?.smoke?.color,
        fluid: verifyState.params.handEffect?.fluidDistortion?.fluidColor,
        particleTrail: verifyState.params.handEffect?.particleTrail?.color
      });
      console.log('═══════════════════════════════════════');
      console.log('🎨 THEME UPDATE COMPLETE');
      console.log('═══════════════════════════════════════');
    }, 100);
  };

  // Listen for theme events
  window.addEventListener('cx:theme', handleThemeChange);

  console.log('🎧 Theme-to-Store listener initialized');

  // Return cleanup function
  return () => {
    window.removeEventListener('cx:theme', handleThemeChange);
  };
}
