# YouTube Audio Integration Setup Guide

## Overview

The YouTube Audio Integration allows your ChoreoXplore application to extract audio from YouTube videos and use it for music reactivity. This creates a seamless experience where you can paste a YouTube URL and immediately get both lyrics and audio-reactive visual effects.

## Features

### 🎵 **YouTube Audio Extraction**
- Extract audio from any YouTube video
- High-quality audio processing (192K MP3)
- Automatic caching to improve performance
- Support for all YouTube video formats

### 🎛️ **Audio Source Management**
- Switch between microphone and YouTube audio
- Real-time audio analysis for music reactivity
- Seamless integration with existing visual effects
- Automatic fallback to microphone if YouTube fails

### 🎨 **Music Reactivity Integration**
- All existing music reactivity features work with YouTube audio
- Tempo detection, beat analysis, and frequency analysis
- Visual effects respond to YouTube audio in real-time
- No difference in functionality between microphone and YouTube audio

## Setup Instructions

### 1. Install Dependencies

First, install the required Python package for YouTube audio extraction:

```bash
# Install yt-dlp (YouTube downloader)
pip install yt-dlp

# Or using conda
conda install -c conda-forge yt-dlp
```

### 2. Start the YouTube Audio Service

The YouTube audio service runs as a separate backend server. Start it using:

```bash
# From the project root directory
npm run youtube-audio
```

This will start the service on `http://localhost:3001`.

### 3. Verify Installation

Check that the service is running:

```bash
curl http://localhost:3001/api/health
```

You should see a response like:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. Test YouTube Audio Extraction

Test with a YouTube video:

```bash
curl "http://localhost:3001/api/youtube-audio/dQw4w9WgXcQ"
```

This should download and serve the audio file.

## Usage

### Basic Workflow

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Start the YouTube Audio Service** (in a separate terminal)
   ```bash
   npm run youtube-audio
   ```

3. **Load a YouTube Video**
   - Go to the generative or author mode
   - Paste a YouTube URL in the lyrics section
   - The system will automatically:
     - Extract the video title
     - Search for lyrics
     - Load the audio for music reactivity

4. **Control Playback**
   - Use the integrated audio controls in the Music Input section
   - Play, pause, stop, and seek through the audio
   - Adjust volume and switch between audio sources

5. **Enjoy Music Reactivity**
   - Visual effects will automatically respond to the YouTube audio
   - Use the Music Reactivity Control Panel to adjust sensitivity
   - Switch between microphone and YouTube audio sources

### Integrated Music Input UI

The YouTube audio controls are now integrated directly into the existing Music Input section:

- **URL Input**: Paste YouTube URLs to load both lyrics and audio
- **Audio Source Switch**: Toggle between microphone and YouTube audio
- **Playback Controls**: Play, pause, stop, seek, and volume controls
- **Status Display**: Shows current video title and audio source status
- **Error Handling**: Clear error messages if something goes wrong
- **Seamless Integration**: All controls are in one place for better UX

### Music Reactivity Integration

When YouTube audio is loaded:

- **Automatic Analysis**: The system analyzes tempo, rhythm, and frequency content
- **Visual Effects**: All ambient animations respond to the YouTube audio
- **Real-time Updates**: Effects update in real-time as the audio plays
- **Seamless Switching**: You can switch between microphone and YouTube audio

## Technical Details

### Backend Service

The YouTube audio service (`server/youtube-audio.js`) provides:

- **Audio Extraction**: Uses `yt-dlp` to extract audio from YouTube videos
- **Caching**: Stores extracted audio files for faster subsequent access
- **API Endpoints**: RESTful API for audio extraction and video info
- **Error Handling**: Comprehensive error handling and logging

### Frontend Integration

The frontend integration includes:

- **Audio Source Manager**: Manages switching between audio sources
- **Web Audio API**: Processes audio for real-time analysis
- **Music Reactivity**: Feeds YouTube audio into the existing reactivity system
- **UI Components**: Control panels for managing YouTube audio

### File Structure

```
src/
├── core/
│   ├── youtubeAudio.js          # YouTube audio player and analyzer
│   ├── audioSourceManager.js    # Manages audio source switching
│   └── audio.js                 # Enhanced audio analysis
└── ui/
    └── SettingPanel.jsx         # Enhanced with integrated YouTube audio controls

server/
└── youtube-audio.js             # Backend service for audio extraction
```

## Troubleshooting

### Common Issues

**Service Won't Start**
- Ensure `yt-dlp` is installed: `pip install yt-dlp`
- Check that port 3001 is available
- Verify Node.js and npm are properly installed

**Audio Extraction Fails**
- Check that the YouTube URL is valid
- Ensure the video is publicly accessible
- Try a different video if one fails

**CORS Errors**
- Make sure the YouTube audio service is running on port 3001
- Check that the frontend is making requests to the correct URL
- Verify the service is accessible from your browser

**Audio Playback Issues**
- Check browser audio permissions
- Ensure the audio file was successfully extracted
- Try refreshing the page and reloading the audio

### Debug Information

**Check Service Status**
```bash
curl http://localhost:3001/api/health
```

**Test Audio Extraction**
```bash
curl "http://localhost:3001/api/youtube-audio/VIDEO_ID"
```

**Check Browser Console**
- Open browser developer tools
- Look for error messages in the console
- Check network requests to the YouTube audio service

### Performance Optimization

**Caching**
- Extracted audio files are cached for 24 hours
- Subsequent requests for the same video are served from cache
- Cache is automatically cleaned up to prevent disk space issues

**Audio Quality**
- Audio is extracted at 192K quality for good balance of quality and file size
- Higher quality can be configured in the backend service
- Lower quality can be used for faster extraction if needed

## Security Considerations

### Backend Service
- The service runs on localhost by default
- No authentication is required for local development
- For production, consider adding authentication and rate limiting

### Audio Extraction
- Uses `yt-dlp` which respects YouTube's terms of service
- Only extracts audio, not video content
- Cached files are automatically cleaned up

### CORS
- CORS is enabled for localhost development
- For production, configure CORS appropriately for your domain

## Production Deployment

### Backend Service
- Deploy the YouTube audio service to a server
- Configure environment variables for production
- Set up proper logging and monitoring
- Consider using a process manager like PM2

### Frontend Configuration
- Update the API endpoints to point to your production server
- Configure CORS settings appropriately
- Set up proper error handling and user feedback

### Scaling Considerations
- Consider using a CDN for cached audio files
- Implement rate limiting to prevent abuse
- Monitor disk usage for cached files
- Consider using a database for metadata storage

## Conclusion

The YouTube Audio Integration provides a powerful way to create music-reactive visual experiences using any YouTube video. With proper setup, you can seamlessly extract audio, analyze it for music reactivity, and create stunning visual effects that respond to the music in real-time.

The system is designed to be robust, with automatic fallbacks and comprehensive error handling, ensuring a smooth user experience even when things don't go as planned.
