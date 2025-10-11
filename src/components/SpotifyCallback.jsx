import React, { useEffect } from 'react';
import { useSpotify } from '../contexts/SpotifyContext.jsx';

export default function SpotifyCallback() {
  const { handleCallback } = useSpotify();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Spotify authentication error:', error);
      window.location.href = '/';
      return;
    }

    if (code) {
      handleCallback(code).then((success) => {
        if (success) {
          window.location.href = '/';
        } else {
          console.error('Failed to authenticate with Spotify');
          window.location.href = '/';
        }
      });
    }
  }, [handleCallback]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0A0A0C',
      color: '#EDEEF2',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '12px' }}>🎵</div>
        <div>Connecting to Spotify...</div>
      </div>
    </div>
  );
}
