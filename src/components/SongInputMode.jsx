import React, { useState, useEffect } from 'react';
import useStore from '../core/store';
import { useSpotify } from '../contexts/SpotifyContext.jsx';
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

  // Show Spotify connection screen if not authenticated
  if (!isAuthenticated) {
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
          padding: '48px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>🎵</div>
          
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '600',
            color: '#EDEEF2',
            marginBottom: '16px'
          }}>
            Connect to Spotify
          </h1>
          
          <p style={{
            fontSize: '1rem',
            color: 'rgba(237, 238, 242, 0.8)',
            marginBottom: '32px',
            lineHeight: '1.5'
          }}>
            Connect your Spotify account to play music and experience visual effects synchronized with your songs.
          </p>

          <div style={{
            background: 'rgba(30, 215, 96, 0.1)',
            border: '1px solid rgba(30, 215, 96, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            color: '#1DB954'
          }}>
            <strong>Requirements:</strong><br />
            • Spotify Premium account<br />
            • Spotify app open or web player active
          </div>

          <button
            onClick={authenticate}
            style={{
              padding: '16px 32px',
              fontSize: '1.1rem',
              fontWeight: '600',
              background: '#1DB954',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 20px rgba(29, 185, 84, 0.3)',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 12px 24px rgba(29, 185, 84, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 8px 20px rgba(29, 185, 84, 0.3)';
            }}
          >
            Connect to Spotify
          </button>

          <button
            onClick={() => setMode('irina')}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: 'rgba(237, 238, 242, 0.6)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Skip to Irina mode
          </button>
        </div>
      </div>
    );
  }

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
