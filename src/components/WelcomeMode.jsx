import React, { useState, useEffect } from 'react';
import useStore from '../core/store';
import { useSpotify } from '../contexts/SpotifyContext.jsx';
import { 
  enableSpotifyTheme, 
  disableSpotifyTheme, 
  forceUpdateTheme
} from '../integrations/spotifyThemeBootstrap';

export default function WelcomeMode() {
  const [bgColor, setBgColor] = useState('#000000'); // Default black
  const [assetColor, setAssetColor] = useState('#ffffff'); // Default white
  const [autoFromSpotify, setAutoFromSpotify] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  
  const setMode = useStore(s => s.setMode);
  const setUserColors = useStore(s => s.setUserColors);
  const { isAuthenticated, authenticate, accessToken } = useSpotify();

  // Listen for theme updates
  useEffect(() => {
    const handleThemeUpdate = (event) => {
      const theme = event.detail;
      if (autoFromSpotify && theme) {
        setBgColor(theme.background);
        setAssetColor(theme.asset);
        setTrackInfo(theme.meta);
      }
    };

    window.addEventListener('cx:theme', handleThemeUpdate);
    return () => window.removeEventListener('cx:theme', handleThemeUpdate);
  }, [autoFromSpotify]);

  // Handle auto-from-Spotify toggle
  useEffect(() => {
    if (autoFromSpotify && accessToken) {
      enableSpotifyTheme();
      // Force immediate update
      forceUpdateTheme()
        .then(theme => {
          if (theme) {
            setBgColor(theme.background);
            setAssetColor(theme.asset);
            setTrackInfo(theme.meta);
          }
        })
        .catch(error => {
          console.error('Error updating theme from Spotify:', error);
        });
    } else {
      disableSpotifyTheme();
    }
  }, [autoFromSpotify, accessToken]);

  const handleContinue = () => {
    setUserColors({ bgColor, assetColor });
    setMode('choreoxplore');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center'
      }}>
        {/* Welcome Message */}
        <h1 style={{
          color: '#EDEEF2',
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '8px',
          margin: '0 0 8px 0'
        }}>
          Welcome to ChoreoXplore
        </h1>
        
        <p style={{
          color: 'rgba(237, 238, 242, 0.8)',
          fontSize: '16px',
          marginBottom: '32px',
          margin: '0 0 32px 0'
        }}>
          What colors are we feeling today?
        </p>

        {/* Color Pickers */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '40px',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          {/* Background Color */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <label style={{
              color: '#EDEEF2',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Background Color
            </label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{
                width: '60px',
                height: '60px',
                border: '2px solid rgba(0, 150, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
                outline: 'none'
              }}
            />
          </div>

          {/* Visual Assets Color */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <label style={{
              color: '#EDEEF2',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Visual Assets Color
            </label>
            <input
              type="color"
              value={assetColor}
              onChange={(e) => setAssetColor(e.target.value)}
              style={{
                width: '60px',
                height: '60px',
                border: '2px solid rgba(0, 150, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Auto from Spotify Toggle */}
        {accessToken && (
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: 'rgba(0, 150, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 150, 255, 0.3)'
            }}>
              <input
                type="checkbox"
                checked={autoFromSpotify}
                onChange={(e) => setAutoFromSpotify(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                color: '#EDEEF2',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Auto from Spotify
              </span>
            </label>
            
            {/* Track Info Display */}
            {trackInfo && autoFromSpotify && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(0, 150, 255, 0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'rgba(237, 238, 242, 0.8)',
                textAlign: 'center'
              }}>
                Auto-selected from: <strong>{trackInfo.trackName}</strong> – {trackInfo.artist}
              </div>
            )}
          </div>
        )}

        {/* Spotify Authentication */}
        {!isAuthenticated ? (
          <button
            onClick={authenticate}
            style={{
              background: 'rgba(0, 150, 255, 0.6)',
              border: '1px solid rgba(0, 150, 255, 0.6)',
              borderRadius: '8px',
              padding: '12px 24px',
              color: '#EDEEF2',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '16px',
              width: '100%'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 150, 255, 0.8)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(0, 150, 255, 0.6)'}
          >
            Connect to Spotify
          </button>
        ) : (
          <div style={{
            background: 'rgba(0, 150, 255, 0.2)',
            border: '1px solid rgba(0, 150, 255, 0.4)',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#EDEEF2',
            fontSize: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            ✅ Connected to Spotify
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!isAuthenticated}
          style={{
            background: isAuthenticated ? 'rgba(0, 150, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${isAuthenticated ? 'rgba(0, 150, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '8px',
            padding: '12px 24px',
            color: isAuthenticated ? '#EDEEF2' : 'rgba(237, 238, 242, 0.5)',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            if (isAuthenticated) {
              e.target.style.background = 'rgba(0, 150, 255, 0.8)';
            }
          }}
          onMouseLeave={(e) => {
            if (isAuthenticated) {
              e.target.style.background = 'rgba(0, 150, 255, 0.6)';
            }
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
