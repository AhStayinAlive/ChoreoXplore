import { BehaviorSubject } from "rxjs";

// YouTube audio player and analyzer
export const youtubeAudio$ = new BehaviorSubject({
  isPlaying: false,
  isLoaded: false,
  currentTime: 0,
  duration: 0,
  volume: 1.0,
  videoId: null,
  videoTitle: null,
  error: null
});

let audioContext = null;
let analyser = null;
let audioElement = null;
let source = null;
let gainNode = null;
let isInitialized = false;

// Initialize audio context and analyzer
async function initializeAudioContext() {
  if (isInitialized) return audioContext;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    gainNode = audioContext.createGain();
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);
    
    isInitialized = true;
    return audioContext;
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
    youtubeAudio$.next({ ...youtubeAudio$.value, error: error.message });
    return null;
  }
}

// Extract video ID from YouTube URL
export function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Get YouTube video title
export async function getYouTubeVideoTitle(videoId) {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oEmbedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.title || `YouTube Video ${videoId}`;
    }
    
    return `YouTube Video ${videoId}`;
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
    return `YouTube Video ${videoId}`;
  }
}

// Load YouTube audio
export async function loadYouTubeAudio(videoId) {
  try {
    // Initialize audio context
    const ctx = await initializeAudioContext();
    if (!ctx) return false;

    // Get video title
    const title = await getYouTubeVideoTitle(videoId);
    
    // Create audio element
    if (audioElement) {
      audioElement.pause();
      audioElement.remove();
    }
    
    audioElement = document.createElement('audio');
    audioElement.crossOrigin = 'anonymous';
    audioElement.preload = 'auto';
    
    // Use a proxy service to get audio stream
    // Note: This is a simplified approach. In production, you'd want to use
    // a proper YouTube audio extraction service or API
    const audioUrl = await getYouTubeAudioUrl(videoId);
    
    if (!audioUrl) {
      throw new Error('Could not extract audio URL from YouTube video');
    }
    
    audioElement.src = audioUrl;
    
    // Connect audio element to Web Audio API
    if (source) {
      source.disconnect();
    }
    
    source = ctx.createMediaElementSource(audioElement);
    source.connect(gainNode);
    
    // Set up event listeners
    audioElement.addEventListener('loadedmetadata', () => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        isLoaded: true,
        duration: audioElement.duration,
        videoId,
        videoTitle: title,
        error: null
      });
    });
    
    audioElement.addEventListener('timeupdate', () => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        currentTime: audioElement.currentTime
      });
    });
    
    audioElement.addEventListener('play', () => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        isPlaying: true
      });
    });
    
    audioElement.addEventListener('pause', () => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        isPlaying: false
      });
    });
    
    audioElement.addEventListener('ended', () => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        isPlaying: false,
        currentTime: 0
      });
    });
    
    audioElement.addEventListener('error', (e) => {
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        error: `Audio playback error: ${e.message}`,
        isPlaying: false
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error loading YouTube audio:', error);
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      error: error.message,
      isLoaded: false
    });
    return false;
  }
}

// Get YouTube audio URL (simplified implementation)
async function getYouTubeAudioUrl(videoId) {
  // This is a placeholder implementation
  // In a real application, you would need to use a service like:
  // - YouTube Data API with audio extraction
  // - A third-party service like youtube-dl
  // - A backend service that handles YouTube audio extraction
  
  // For now, we'll use a simple approach that works with some videos
  // Note: This may not work for all videos due to CORS and YouTube's policies
  
  try {
    // Try to use a CORS proxy (this is just for demonstration)
    // In production, you should implement this on your backend
    const proxyUrl = `https://cors-anywhere.herokuapp.com/https://www.youtube.com/watch?v=${videoId}`;
    
    // For demonstration purposes, we'll create a mock audio URL
    // In reality, you'd need proper YouTube audio extraction
    console.warn('YouTube audio extraction requires backend implementation');
    
    // Return null to indicate we need a different approach
    return null;
  } catch (error) {
    console.error('Error getting YouTube audio URL:', error);
    return null;
  }
}

// Alternative approach: Use a backend service for YouTube audio extraction
export async function loadYouTubeAudioFromBackend(videoId) {
  try {
    const ctx = await initializeAudioContext();
    if (!ctx) return false;

    const title = await getYouTubeVideoTitle(videoId);
    
    // Create audio element
    if (audioElement) {
      audioElement.pause();
      audioElement.remove();
    }
    
    audioElement = document.createElement('audio');
    audioElement.crossOrigin = 'anonymous';
    audioElement.preload = 'auto';
    
    // Use your backend service to get the audio stream
    // This would be a service that uses youtube-dl or similar
    const response = await fetch(`/api/youtube-audio/${videoId}`);
    
    if (!response.ok) {
      throw new Error(`Backend service error: ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    audioElement.src = audioUrl;
    
    // Connect to Web Audio API
    if (source) {
      source.disconnect();
    }
    
    source = ctx.createMediaElementSource(audioElement);
    source.connect(gainNode);
    
    // Set up event listeners (same as above)
    setupAudioEventListeners(audioElement, videoId, title);
    
    return true;
  } catch (error) {
    console.error('Error loading YouTube audio from backend:', error);
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      error: error.message,
      isLoaded: false
    });
    return false;
  }
}

// Set up audio event listeners
function setupAudioEventListeners(audioElement, videoId, title) {
  audioElement.addEventListener('loadedmetadata', () => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      isLoaded: true,
      duration: audioElement.duration,
      videoId,
      videoTitle: title,
      error: null
    });
  });
  
  audioElement.addEventListener('timeupdate', () => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      currentTime: audioElement.currentTime
    });
  });
  
  audioElement.addEventListener('play', () => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      isPlaying: true
    });
  });
  
  audioElement.addEventListener('pause', () => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      isPlaying: false
    });
  });
  
  audioElement.addEventListener('ended', () => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      isPlaying: false,
      currentTime: 0
    });
  });
  
  audioElement.addEventListener('error', (e) => {
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      error: `Audio playback error: ${e.message}`,
      isPlaying: false
    });
  });
}

// Play YouTube audio
export function playYouTubeAudio() {
  if (audioElement && audioElement.readyState >= 2) {
    audioElement.play().catch(error => {
      console.error('Error playing audio:', error);
      youtubeAudio$.next({
        ...youtubeAudio$.value,
        error: error.message
      });
    });
  }
}

// Pause YouTube audio
export function pauseYouTubeAudio() {
  if (audioElement) {
    audioElement.pause();
  }
}

// Stop YouTube audio
export function stopYouTubeAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
}

// Set volume
export function setYouTubeVolume(volume) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    youtubeAudio$.next({
      ...youtubeAudio$.value,
      volume
    });
  }
}

// Seek to time
export function seekYouTubeAudio(time) {
  if (audioElement && audioElement.duration) {
    audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, time));
  }
}

// Get audio analyzer for music reactivity
export function getYouTubeAudioAnalyzer() {
  return analyser;
}

// Check if YouTube audio is available
export function isYouTubeAudioAvailable() {
  return audioElement && audioElement.readyState >= 2;
}

// Clean up resources
export function cleanupYouTubeAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.remove();
    audioElement = null;
  }
  
  if (source) {
    source.disconnect();
    source = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  isInitialized = false;
  
  youtubeAudio$.next({
    isPlaying: false,
    isLoaded: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    videoId: null,
    videoTitle: null,
    error: null
  });
}


