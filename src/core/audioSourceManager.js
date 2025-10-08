import { BehaviorSubject } from "rxjs";
import { audio$ } from "./audio.js";
import { youtubeAudio$, loadYouTubeAudioFromBackend, getYouTubeAudioAnalyzer, playYouTubeAudio, pauseYouTubeAudio, stopYouTubeAudio, setYouTubeVolume, seekYouTubeAudio, cleanupYouTubeAudio } from "./youtubeAudio.js";

// Audio source manager that handles both microphone and YouTube audio
export const audioSourceManager$ = new BehaviorSubject({
  currentSource: 'microphone', // 'microphone' | 'youtube'
  isMicrophoneActive: false,
  isYouTubeActive: false,
  youtubeVideoId: null,
  youtubeVideoTitle: null,
  error: null
});

let currentAudioContext = null;
let currentAnalyser = null;
let microphoneSource = null;
let youtubeSource = null;
let isInitialized = false;

// Initialize audio context
async function initializeAudioContext() {
  if (isInitialized && currentAudioContext) return currentAudioContext;
  
  try {
    currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    currentAnalyser = currentAudioContext.createAnalyser();
    currentAnalyser.fftSize = 2048;
    currentAnalyser.smoothingTimeConstant = 0.8;
    
    isInitialized = true;
    return currentAudioContext;
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
    audioSourceManager$.next({ 
      ...audioSourceManager$.value, 
      error: error.message 
    });
    return null;
  }
}

// Start microphone audio
export async function startMicrophoneAudio() {
  try {
    const ctx = await initializeAudioContext();
    if (!ctx) return false;

    // Stop YouTube audio if it's playing
    if (youtubeSource) {
      await stopYouTubeAudio();
      youtubeSource = null;
    }

    // Get microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneSource = ctx.createMediaStreamSource(stream);
    microphoneSource.connect(currentAnalyser);

    audioSourceManager$.next({
      ...audioSourceManager$.value,
      currentSource: 'microphone',
      isMicrophoneActive: true,
      isYouTubeActive: false,
      youtubeVideoId: null,
      youtubeVideoTitle: null,
      error: null
    });

    return true;
  } catch (error) {
    console.error('Failed to start microphone audio:', error);
    audioSourceManager$.next({ 
      ...audioSourceManager$.value, 
      error: error.message 
    });
    return false;
  }
}

// Start YouTube audio
export async function startYouTubeAudio(videoId) {
  try {
    const ctx = await initializeAudioContext();
    if (!ctx) return false;

    // Stop microphone audio if it's active
    if (microphoneSource) {
      microphoneSource.disconnect();
      microphoneSource = null;
    }

    // Load YouTube audio
    const success = await loadYouTubeAudioFromBackend(videoId);
    if (!success) {
      throw new Error('Failed to load YouTube audio');
    }

    // Get YouTube audio analyzer
    youtubeSource = getYouTubeAudioAnalyzer();
    if (youtubeSource) {
      youtubeSource.connect(currentAnalyser);
    }

    // Subscribe to YouTube audio state
    const youtubeSubscription = youtubeAudio$.subscribe(youtubeState => {
      audioSourceManager$.next({
        ...audioSourceManager$.value,
        currentSource: 'youtube',
        isMicrophoneActive: false,
        isYouTubeActive: youtubeState.isLoaded,
        youtubeVideoId: youtubeState.videoId,
        youtubeVideoTitle: youtubeState.videoTitle,
        error: youtubeState.error
      });
    });

    // Store subscription for cleanup
    audioSourceManager$.youtubeSubscription = youtubeSubscription;

    return true;
  } catch (error) {
    console.error('Failed to start YouTube audio:', error);
    audioSourceManager$.next({ 
      ...audioSourceManager$.value, 
      error: error.message 
    });
    return false;
  }
}

// Switch audio source
export async function switchAudioSource(source, videoId = null) {
  if (source === 'microphone') {
    return await startMicrophoneAudio();
  } else if (source === 'youtube' && videoId) {
    return await startYouTubeAudio(videoId);
  }
  return false;
}

// Get current audio analyzer
export function getCurrentAudioAnalyzer() {
  return currentAnalyser;
}

// YouTube audio controls
export const youtubeControls = {
  play: playYouTubeAudio,
  pause: pauseYouTubeAudio,
  stop: stopYouTubeAudio,
  setVolume: setYouTubeVolume,
  seek: seekYouTubeAudio
};

// Clean up all audio sources
export function cleanupAudioSources() {
  if (microphoneSource) {
    microphoneSource.disconnect();
    microphoneSource = null;
  }

  if (youtubeSource) {
    youtubeSource.disconnect();
    youtubeSource = null;
  }

  if (audioSourceManager$.youtubeSubscription) {
    audioSourceManager$.youtubeSubscription.unsubscribe();
    audioSourceManager$.youtubeSubscription = null;
  }

  cleanupYouTubeAudio();

  if (currentAudioContext && currentAudioContext.state !== 'closed') {
    currentAudioContext.close();
    currentAudioContext = null;
  }

  isInitialized = false;

  audioSourceManager$.next({
    currentSource: 'microphone',
    isMicrophoneActive: false,
    isYouTubeActive: false,
    youtubeVideoId: null,
    youtubeVideoTitle: null,
    error: null
  });
}

// Check if audio source is available
export function isAudioSourceAvailable(source) {
  if (source === 'microphone') {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  } else if (source === 'youtube') {
    return true; // YouTube audio is handled by backend
  }
  return false;
}

// Get audio source status
export function getAudioSourceStatus() {
  return audioSourceManager$.value;
}


