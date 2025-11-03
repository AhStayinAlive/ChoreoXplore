/**
 * Wire theme events to Zustand store
 * Listens for 'cx:theme' events and updates userColors in store
 */

import useStore from '../core/store';

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
  };

  // Listen for theme events
  window.addEventListener('cx:theme', handleThemeChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('cx:theme', handleThemeChange);
  };
}
