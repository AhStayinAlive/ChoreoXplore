import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

export const SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
  scopes: [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-recently-played'
  ]
};

export const getSpotifyAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    scope: SPOTIFY_CONFIG.scopes.join(' '),
    show_dialog: true
  });
  
  return `https://accounts.spotify.com/authorize?${params}`;
};

export const exchangeCodeForToken = async (code) => {
  console.log('🔐 Exchanging code for token:', code);
  console.log('🔐 Client ID:', SPOTIFY_CONFIG.clientId);
  console.log('🔐 Redirect URI:', SPOTIFY_CONFIG.redirectUri);
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CONFIG.clientId}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri
    })
  });
  
  console.log('🔐 Token exchange response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('🔐 Token exchange failed:', errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }
  
  const tokenData = await response.json();
  console.log('🔐 Token exchange successful, data:', tokenData);
  return tokenData;
};

export const searchTrack = async (songTitle, artistName, accessToken) => {
  spotifyApi.setAccessToken(accessToken);
  
  // Build query with optional artist
  let query = `track:${songTitle}`;
  if (artistName && artistName.trim()) {
    query += ` artist:${artistName.trim()}`;
  }
  console.log('🔍 Searching for:', query);
  
  try {
    const data = await spotifyApi.searchTracks(query, { limit: 1 });
    console.log('🔍 Search results:', data);
    
    if (data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      console.log('🔍 Found track:', track.name, 'by', track.artists[0].name);
      console.log('🔍 Track URI:', track.uri);
      return track;
    } else {
      console.log('🔍 No tracks found');
      return null;
    }
  } catch (error) {
    console.error('Error searching track:', error);
    
    // Check for 401 unauthorized error
    if (error.status === 401 || (error.message && error.message.includes('401'))) {
      console.log('🔐 Spotify API returned 401 - token expired or invalid');
      throw new Error('401 Unauthorized - Please re-authenticate with Spotify');
    }
    
    return null;
  }
};

export const getAvailableDevices = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get devices');
    }
    
    const data = await response.json();
    console.log('🎵 Available devices:', data.devices);
    return data.devices;
  } catch (error) {
    console.error('Error getting devices:', error);
    return [];
  }
};

export const transferPlayback = async (deviceId, accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to transfer playback');
    }
    
    console.log('🎵 Playback transferred to device:', deviceId);
    return true;
  } catch (error) {
    console.error('Error transferring playback:', error);
    return false;
  }
};

export const playTrack = async (trackUri, accessToken) => {
  try {
    console.log('🎵 Attempting to play track:', trackUri);
    
    // First, check available devices
    const devices = await getAvailableDevices(accessToken);
    
    if (devices.length === 0) {
      throw new Error('No devices available. Please open Spotify and play a song first.');
    }
    
    // Find an active device or use the first available one
    let activeDevice = devices.find(device => device.is_active);
    if (!activeDevice) {
      activeDevice = devices[0];
      console.log('🎵 No active device found, transferring to:', activeDevice.name);
      await transferPlayback(activeDevice.id, accessToken);
    }
    
    console.log('🎵 Using device:', activeDevice.name);
    
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    console.log('🎵 Play response status:', response.status);
    console.log('🎵 Play response:', response);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎵 Play error:', errorText);
      throw new Error(`Failed to play track: ${response.status} - ${errorText}`);
    }
    
    console.log('🎵 Track playing successfully!');
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    return false;
  }
};

// Additional playback control functions
export const getCurrentPlayback = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get playback state: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting playback state:', error);
    return null;
  }
};

export const pausePlayback = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error pausing playback:', error);
    return false;
  }
};

export const resumePlayback = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error resuming playback:', error);
    return false;
  }
};

export const skipNext = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error skipping to next:', error);
    return false;
  }
};

export const skipPrevious = async (accessToken) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error skipping to previous:', error);
    return false;
  }
};

export const seekToPosition = async (accessToken, positionMs) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error seeking to position:', error);
    return false;
  }
};

export const setVolume = async (accessToken, volumePercent) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error setting volume:', error);
    return false;
  }
};

export default spotifyApi;
