/**
 * Apply theme to the app
 * Sets CSS variables and dispatches theme event
 */

/**
 * Apply theme colors to CSS variables and dispatch event
 */
export function applyTheme(theme) {
  if (!theme) return;

  // Set CSS variables for UI use
  document.documentElement.style.setProperty('--cx-bg', theme.background);
  document.documentElement.style.setProperty('--cx-asset', theme.asset);
  document.documentElement.style.setProperty('--cx-hand-left', theme.handLeft);
  document.documentElement.style.setProperty('--cx-hand-right', theme.handRight);

  // Set legacy accent colors for UI coherence
  document.documentElement.style.setProperty('--accent', theme.asset);
  document.documentElement.style.setProperty('--accent-2', theme.handRight);

  // Dispatch custom event for theme update
  window.dispatchEvent(new CustomEvent('cx:theme', { detail: theme }));

  console.log('🎨 Theme applied:', theme);
}
