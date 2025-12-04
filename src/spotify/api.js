/**
 * Spotify API wrappers
 */

const BASE_URL = 'https://api.spotify.com/v1';

/**
 * Make authenticated request to Spotify API
 */
async function spotifyRequest(endpoint, token) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 204) {
      return null; // No content (e.g., no track playing)
    }
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get currently playing track
 */
export async function getCurrentlyPlaying(token) {
  try {
    const data = await spotifyRequest('/me/player/currently-playing', token);
    return data;
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      throw error;
    }
    console.warn('getCurrentlyPlaying failed:', error);
    return null;
  }
}

/**
 * Get audio features for a track
 */
export async function getAudioFeatures(trackId, token) {
  try {
    const data = await spotifyRequest(`/audio-features/${trackId}`, token);
    return data;
  } catch (error) {
    console.warn('getAudioFeatures failed:', error);
    return null;
  }
}

/**
 * Get audio analysis for a track
 */
export async function getAudioAnalysis(trackId, token) {
  try {
    const data = await spotifyRequest(`/audio-analysis/${trackId}`, token);
    return data;
  } catch (error) {
    console.warn('getAudioAnalysis failed:', error);
    return null;
  }
}

/**
 * Get track details
 */
export async function getTrack(trackId, token) {
  try {
    const data = await spotifyRequest(`/tracks/${trackId}`, token);
    return data;
  } catch (error) {
    console.warn('getTrack failed:', error);
    return null;
  }
}
