/**
 * Spotify theme bootstrap
 * Polls currently playing track and generates theme
 */

import { getCurrentlyPlaying, getAudioFeatures } from '../spotify/api';
import { buildMusicTheme } from '../theme/musicTheme';
import { applyTheme } from '../theme/applyTheme';

let pollInterval = null;
let currentTrackId = null;
let isEnabled = false;

/**
 * Get access token from localStorage (compatible with SpotifyContext)
 */
function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (!token || !expiry) {
    return null;
  }

  const expiryTime = parseInt(expiry);
  if (isNaN(expiryTime) || Date.now() >= expiryTime) {
    // Token expired - clean up
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    return null;
  }

  return token;
}

/**
 * Fetch and apply theme from current track
 */
async function updateTheme() {
  const token = getAccessToken();
  if (!token) {
    console.log('🎵 No Spotify token, skipping theme update');
    return null;
  }

  try {
    const playing = await getCurrentlyPlaying(token);
    
    if (!playing || !playing.item) {
      console.log('🎵 No track currently playing');
      return null;
    }

    const track = playing.item;
    const trackId = track.id;

    // Only update if track has changed
    if (trackId === currentTrackId) {
      return null;
    }

    console.log('🎵 New track detected:', track.name, 'by', track.artists?.[0]?.name);
    currentTrackId = trackId;

    // Fetch audio features
    const audioFeatures = await getAudioFeatures(trackId, token);

    // Build theme
    const theme = await buildMusicTheme(track, audioFeatures);

    // Apply theme
    applyTheme(theme);

    return theme;
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      console.error('🎵 Spotify token expired or invalid');
      // Clear token
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_token_expiry');
      stopPolling();
    } else {
      console.error('🎵 Error updating theme:', error);
    }
    return null;
  }
}

/**
 * Start polling for track changes
 */
function startPolling() {
  if (pollInterval) return;

  console.log('🎵 Starting Spotify theme polling');
  
  // Update immediately
  updateTheme();

  // Poll every 5 seconds
  pollInterval = setInterval(() => {
    if (isEnabled) {
      updateTheme();
    }
  }, 5000);
}

/**
 * Stop polling
 */
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    currentTrackId = null;
    console.log('🎵 Stopped Spotify theme polling');
  }
}

/**
 * Enable auto-theme from Spotify
 */
export function enableSpotifyTheme() {
  isEnabled = true;
  const token = getAccessToken();
  if (token) {
    startPolling();
  }
}

/**
 * Disable auto-theme from Spotify
 */
export function disableSpotifyTheme() {
  isEnabled = false;
  stopPolling();
}

/**
 * Check if Spotify theme is enabled
 */
export function isSpotifyThemeEnabled() {
  return isEnabled;
}

/**
 * Initialize Spotify-driven theme (called once on app start)
 */
export function initSpotifyDrivenTheme() {
  // Don't auto-enable; let user control via toggle
  console.log('🎵 Spotify theme system initialized');
}

/**
 * Force update theme now (useful when user enables auto-theme)
 */
export async function forceUpdateTheme() {
  return await updateTheme();
}
