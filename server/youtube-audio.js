const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the temp directory
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// YouTube audio extraction endpoint
app.get('/api/youtube-audio/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  if (!videoId || videoId.length !== 11) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  const outputPath = path.join(tempDir, `${videoId}.mp3`);
  const outputUrl = `http://localhost:${PORT}/temp/${videoId}.mp3`;
  
  try {
    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`Serving cached audio for video: ${videoId}`);
      return res.sendFile(outputPath);
    }
    
    console.log(`Extracting audio for video: ${videoId}`);
    
    // Use yt-dlp to extract audio
    const ytdlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--output', outputPath,
      `https://www.youtube.com/watch?v=${videoId}`
    ]);
    
    let errorOutput = '';
    
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`Successfully extracted audio for video: ${videoId}`);
        res.sendFile(outputPath);
      } else {
        console.error(`Failed to extract audio for video: ${videoId}`);
        console.error('yt-dlp error:', errorOutput);
        res.status(500).json({ 
          error: 'Failed to extract audio from YouTube video',
          details: errorOutput
        });
      }
    });
    
    ytdlp.on('error', (error) => {
      console.error(`yt-dlp spawn error for video ${videoId}:`, error);
      res.status(500).json({ 
        error: 'Failed to start audio extraction process',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error(`Error extracting audio for video ${videoId}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get video info endpoint
app.get('/api/youtube-info/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  if (!videoId || videoId.length !== 11) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  try {
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);
    
    let output = '';
    let errorOutput = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          const videoInfo = JSON.parse(output);
          res.json({
            title: videoInfo.title,
            duration: videoInfo.duration,
            uploader: videoInfo.uploader,
            thumbnail: videoInfo.thumbnail
          });
        } catch (parseError) {
          console.error('Error parsing video info:', parseError);
          res.status(500).json({ error: 'Failed to parse video information' });
        }
      } else {
        console.error('Failed to get video info:', errorOutput);
        res.status(500).json({ 
          error: 'Failed to get video information',
          details: errorOutput
        });
      }
    });
    
    ytdlp.on('error', (error) => {
      console.error('yt-dlp spawn error:', error);
      res.status(500).json({ 
        error: 'Failed to start video info process',
        details: error.message
      });
    });
    
  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clean up old files (run every hour)
setInterval(() => {
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old file: ${file}`);
    }
  });
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`YouTube Audio Service running on port ${PORT}`);
  console.log(`Make sure yt-dlp is installed: pip install yt-dlp`);
});

module.exports = app;

