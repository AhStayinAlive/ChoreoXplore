import React, { useState, useEffect } from 'react';
import { useSpotify } from '../contexts/SpotifyContext';
import { searchTrack, playTrack } from '../services/spotifyService';

const SpotifyPlaybackControl = () => {
  const { isAuthenticated, accessToken } = useSpotify();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setCurrentTrack(data.item);
          setIsPlaying(data.is_playing);
          setProgress(data.progress_ms || 0);
          setDuration(data.item?.duration_ms || 0);
          setVolume(data.device?.volume_percent || 50);
        }
      }
    } catch (error) {
      console.error('Error fetching playback state:', error);
    }
  };

  // Control playback
  const togglePlayPause = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipToNext = async () => {
    if (!accessToken) return;
    
    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      // Refresh playback state
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Error skipping to next:', error);
    }
  };

  const skipToPrevious = async () => {
    if (!accessToken) return;
    
    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      // Refresh playback state
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Error skipping to previous:', error);
    }
  };

  const seekToPosition = async (positionMs) => {
    if (!accessToken) return;
    
    console.log('🎵 Seeking to position:', positionMs, 'ms');
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('🎵 Seek response status:', response.status);
      
      if (response.ok) {
        setProgress(positionMs);
        console.log('🎵 Seek successful!');
        // Refresh playback state to get accurate position
        setTimeout(fetchPlaybackState, 500);
      } else {
        const errorText = await response.text();
        console.error('🎵 Seek failed:', response.status, response.statusText, errorText);
        
        // If it's a device issue, try to refresh playback state
        if (response.status === 404) {
          console.log('🎵 Device might be inactive, refreshing playback state...');
          setTimeout(fetchPlaybackState, 1000);
        }
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const setVolumeLevel = async (newVolume) => {
    if (!accessToken) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${newVolume}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setVolume(newVolume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const handleSearch = async () => {
    if (!songName.trim() || !accessToken || isSearching) return;
    
    setIsSearching(true);
    try {
      console.log('🎵 Searching for song:', songName.trim(), 'artist:', artistName.trim());
      const track = await searchTrack(songName.trim(), artistName.trim(), accessToken);
      
      if (track) {
        console.log('🎵 Found track:', track.name, 'by', track.artists[0]?.name);
        const success = await playTrack(track.uri, accessToken);
        
        if (success) {
          console.log('🎵 Playing search result successfully!');
          // Clear search inputs after successful play
          setSongName('');
          setArtistName('');
          // Refresh playback state to show new track
          setTimeout(fetchPlaybackState, 1000);
        }
      } else {
        console.log('🎵 No track found for:', songName.trim(), artistName.trim());
      }
    } catch (error) {
      console.error('Error searching/playing track:', error);
      
      // Check if it's a 401 unauthorized error
      if (error.message && error.message.includes('401')) {
        console.log('🔐 Token expired or invalid. Please re-authenticate with Spotify.');
        // You could add a notification here or trigger re-authentication
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Update progress every second
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress(prev => prev + 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Fetch playback state on mount and periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaybackState();
      const interval = setInterval(fetchPlaybackState, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, accessToken]);

  if (!isAuthenticated || !currentTrack) {
    return null; // Don't show if not authenticated or no track
  }

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <style>
        {`
          .search-input::placeholder {
            color: rgba(237, 238, 242, 0.5);
          }
          .search-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}
      </style>
      <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      padding: '12px 20px',
      minWidth: '600px',
      maxWidth: '900px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Track Info and Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '12px'
      }}>
        <img 
          src={currentTrack.album.images[0]?.url} 
          alt={currentTrack.name}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            objectFit: 'cover'
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#EDEEF2',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentTrack.name}
          </div>
          <div style={{
            color: 'rgba(237, 238, 242, 0.7)',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentTrack.artists.map(artist => artist.name).join(', ')}
          </div>
        </div>
        
        {/* Search Inputs and Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '300px'
        }}>
          <input
            type="text"
            placeholder="Song name..."
            value={songName}
            onChange={(e) => {
              console.log('🎵 Song input changed:', e.target.value);
              setSongName(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '12px',
              color: '#EDEEF2',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(0, 150, 255, 0.3)',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            className="search-input"
            onFocus={(e) => e.target.style.borderColor = 'rgba(0, 150, 255, 0.6)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(0, 150, 255, 0.3)'}
          />
          <input
            type="text"
            placeholder="Artist (optional)..."
            value={artistName}
            onChange={(e) => {
              console.log('🎵 Artist input changed:', e.target.value);
              setArtistName(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '12px',
              color: '#EDEEF2',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(0, 150, 255, 0.3)',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            className="search-input"
            onFocus={(e) => e.target.style.borderColor = 'rgba(0, 150, 255, 0.6)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(0, 150, 255, 0.3)'}
          />
          <button
            onClick={handleSearch}
            disabled={!songName.trim() || isSearching}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#EDEEF2',
              background: isSearching ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 150, 255, 0.6)',
              border: '1px solid rgba(0, 150, 255, 0.6)',
              borderRadius: '6px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!isSearching && songName.trim()) {
                e.target.style.background = 'rgba(0, 150, 255, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSearching) {
                e.target.style.background = 'rgba(0, 150, 255, 0.6)';
              }
            }}
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'rgba(237, 238, 242, 0.7)'
        }}>
          <span>{formatTime(progress)}</span>
          <div style={{
            flex: 1,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            position: 'relative',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            if (!duration || duration <= 0) {
              console.log('🎵 Cannot seek: no valid duration');
              return;
            }
            
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newPosition = (clickX / rect.width) * duration;
            console.log('🎵 Progress bar clicked:', {
              clickX,
              rectWidth: rect.width,
              duration,
              newPosition: Math.round(newPosition)
            });
            seekToPosition(Math.round(newPosition));
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'rgba(0,150,255,0.6)',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }} />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <button
          onClick={skipToPrevious}
          style={{
            background: 'none',
            border: 'none',
            color: '#EDEEF2',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0,150,255,0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          ⏮
        </button>
        
        <button
          onClick={togglePlayPause}
          style={{
            background: '#EDEEF2',
            border: 'none',
            color: 'black',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button
          onClick={skipToNext}
          style={{
            background: 'none',
            border: 'none',
            color: '#EDEEF2',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0,150,255,0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          ⏭
        </button>
        
        {/* Volume Control */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '16px'
        }}>
          <span style={{ fontSize: '16px', color: '#EDEEF2' }}>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
            style={{
              width: '80px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default SpotifyPlaybackControl;
