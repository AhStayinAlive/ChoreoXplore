# Spotify API Integration Guide for ChoreoXplore

## Overview
This guide will help you integrate Spotify Web API and Web Playback SDK into your ChoreoXplore application to control Spotify playback when users input song and artist names.

## Prerequisites
- Spotify Premium Account (required for Web Playback SDK)
- Spotify Developer Account
- HTTPS hosting (required for Spotify Web Playback SDK)

## Step 1: Spotify Developer Setup

### 1.1 Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in:
   - **App Name**: ChoreoXplore
   - **App Description**: Visual music experience app
   - **Website**: Your domain (e.g., https://yourdomain.com)
   - **Redirect URI**: `https://yourdomain.com/callback` (or `http://localhost:3000/callback` for development)
4. Save and note your **Client ID** and **Client Secret**

### 1.2 Configure Redirect URIs
In your Spotify app settings, add these redirect URIs:
- `http://localhost:3000/callback` (for development)
- `https://yourdomain.com/callback` (for production)

## Step 2: Environment Setup

### 2.1 Install Dependencies
```bash
npm install spotify-web-api-js
```

### 2.2 Environment Variables
Create a `.env` file in your project root:
```env
REACT_APP_SPOTIFY_CLIENT_ID=your_client_id_here
REACT_APP_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

## Step 3: Implementation

### 3.1 Create Spotify Service
Create `src/services/spotifyService.js`:

```javascript
import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

export const SPOTIFY_CONFIG = {
  clientId: process.env.REACT_APP_SPOTIFY_CLIENT_ID,
  redirectUri: process.env.REACT_APP_SPOTIFY_REDIRECT_URI,
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
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CONFIG.clientId}:${process.env.REACT_APP_SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri
    })
  });
  
  return response.json();
};

export const searchTrack = async (songTitle, artistName, accessToken) => {
  spotifyApi.setAccessToken(accessToken);
  
  const query = `track:${songTitle} artist:${artistName}`;
  try {
    const data = await spotifyApi.searchTracks(query, { limit: 1 });
    return data.tracks.items[0];
  } catch (error) {
    console.error('Error searching track:', error);
    return null;
  }
};

export const playTrack = async (trackUri, accessToken) => {
  try {
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
    
    if (!response.ok) {
      throw new Error('Failed to play track');
    }
    
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    return false;
  }
};

export default spotifyApi;
```

### 3.2 Create Spotify Context
Create `src/contexts/SpotifyContext.js`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSpotifyAuthUrl, exchangeCodeForToken } from '../services/spotifyService';

const SpotifyContext = createContext();

export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};

export const SpotifyProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for existing token in localStorage
    const token = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
    
    if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setAccessToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  const authenticate = () => {
    const authUrl = getSpotifyAuthUrl();
    window.location.href = authUrl;
  };

  const handleCallback = async (code) => {
    setIsLoading(true);
    try {
      const tokenData = await exchangeCodeForToken(code);
      
      const expiryTime = Date.now() + (tokenData.expires_in * 1000);
      
      localStorage.setItem('spotify_access_token', tokenData.access_token);
      localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
      localStorage.setItem('spotify_token_expiry', expiryTime.toString());
      
      setAccessToken(tokenData.access_token);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    accessToken,
    user,
    isLoading,
    authenticate,
    handleCallback,
    logout
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
};
```

### 3.3 Create Callback Component
Create `src/components/SpotifyCallback.jsx`:

```javascript
import React, { useEffect } from 'react';
import { useSpotify } from '../contexts/SpotifyContext';
import { useNavigate } from 'react-router-dom';

export default function SpotifyCallback() {
  const { handleCallback } = useSpotify();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Spotify authentication error:', error);
      navigate('/');
      return;
    }

    if (code) {
      handleCallback(code).then((success) => {
        if (success) {
          navigate('/');
        } else {
          console.error('Failed to authenticate with Spotify');
          navigate('/');
        }
      });
    }
  }, [handleCallback, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0A0A0C',
      color: '#EDEEF2'
    }}>
      <div>Connecting to Spotify...</div>
    </div>
  );
}
```

### 3.4 Update SongInputMode Component
Update your `src/components/SongInputMode.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import useStore from '../core/store';
import { useSpotify } from '../contexts/SpotifyContext';
import { searchTrack, playTrack } from '../services/spotifyService';

export default function SongInputMode() {
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  
  const setMode = useStore(s => s.setMode);
  const setSongData = useStore(s => s.setSongData);
  const { isAuthenticated, accessToken, authenticate } = useSpotify();

  useEffect(() => {
    setIsValid(song.trim().length > 0 && artist.trim().length > 0);
  }, [song, artist]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    if (!isAuthenticated) {
      authenticate();
      return;
    }

    setIsPlaying(true);
    setError(null);

    try {
      // Search for the track
      const track = await searchTrack(song.trim(), artist.trim(), accessToken);
      
      if (!track) {
        setError('Song not found on Spotify');
        setIsPlaying(false);
        return;
      }

      // Play the track
      const success = await playTrack(track.uri, accessToken);
      
      if (success) {
        setSongData({ 
          song: song.trim(), 
          artist: artist.trim(),
          spotifyTrack: track
        });
        setMode('irina');
      } else {
        setError('Failed to play song. Make sure Spotify is open and you have Premium.');
      }
    } catch (error) {
      console.error('Error playing song:', error);
      setError('Error playing song. Please try again.');
    } finally {
      setIsPlaying(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid) {
      handleSubmit(e);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#0A0A0C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#EDEEF2',
          marginBottom: '16px'
        }}>
          ChoreoXplore
        </h1>
        
        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(237, 238, 242, 0.8)',
          marginBottom: '24px'
        }}>
          Enter your song details to begin
        </p>

        {!isAuthenticated && (
          <div style={{
            background: 'rgba(30, 215, 96, 0.1)',
            border: '1px solid rgba(30, 215, 96, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '0.8rem',
            color: '#1DB954'
          }}>
            Connect to Spotify to play music
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <input
            type="text"
            placeholder="Song Title"
            value={song}
            onChange={(e) => setSong(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isPlaying}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#EDEEF2',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              opacity: isPlaying ? 0.6 : 1
            }}
          />

          <input
            type="text"
            placeholder="Artist Name"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isPlaying}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#EDEEF2',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              opacity: isPlaying ? 0.6 : 1
            }}
          />

          {error && (
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '0.8rem',
              color: '#ff6b6b'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isPlaying}
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: '500',
              background: isValid && !isPlaying ? '#5FA8FF' : 'rgba(255, 255, 255, 0.1)',
              color: isValid && !isPlaying ? '#0A0A0C' : 'rgba(237, 238, 242, 0.4)',
              border: 'none',
              borderRadius: '8px',
              cursor: isValid && !isPlaying ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            {isPlaying ? 'Playing...' : 
             !isAuthenticated ? 'Connect to Spotify' :
             isValid ? 'Play & Start Visual Experience' : 'Enter Song Details'}
          </button>
        </form>

        <button
          onClick={() => setMode('irina')}
          disabled={isPlaying}
          style={{
            marginTop: '16px',
            background: 'none',
            border: 'none',
            color: 'rgba(237, 238, 242, 0.6)',
            fontSize: '0.8rem',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            opacity: isPlaying ? 0.5 : 1
          }}
        >
          Skip to Irina mode
        </button>
      </div>
    </div>
  );
}
```

## Step 4: Update App.jsx

Add the Spotify provider and callback route:

```javascript
import { SpotifyProvider } from './contexts/SpotifyContext';
import SpotifyCallback from './components/SpotifyCallback';

// In your App component, wrap with SpotifyProvider
// Add route for callback: /callback -> SpotifyCallback component
```

## Step 5: Important Notes

### 5.1 Requirements
- **Spotify Premium**: Required for Web Playback SDK
- **HTTPS**: Required for production (Spotify Web Playback SDK doesn't work on HTTP)
- **Active Spotify Session**: User must have Spotify app open or web player active

### 5.2 Limitations
- Can only control Spotify playback, not play directly in browser
- Requires user to have Spotify Premium
- User must have Spotify app/player active

### 5.3 Security
- Never expose Client Secret in frontend code
- Use environment variables for sensitive data
- Implement proper token refresh logic

## Step 6: Testing

1. Start your development server
2. Navigate to your app
3. Enter song and artist name
4. Click "Connect to Spotify" (first time)
5. Authorize the app
6. Try playing a song

## Troubleshooting

### Common Issues:
1. **"Failed to play song"**: Make sure Spotify app is open and user has Premium
2. **Authentication fails**: Check redirect URIs in Spotify Developer Dashboard
3. **CORS errors**: Ensure you're using HTTPS in production

This integration will allow users to search for songs and control Spotify playback directly from your ChoreoXplore application!
