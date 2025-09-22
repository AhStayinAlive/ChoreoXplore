import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Also try .env as fallback

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Function to extract lyrics from AZLyrics HTML
function extractLyricsFromAZLyrics(html) {
  try {
    // Try multiple patterns for AZLyrics lyrics extraction
    const patterns = [
      // Main pattern - looks for the comment followed by lyrics div
      /<!-- Usage of azlyrics\.com content by any third-party lyrics provider is prohibited by our licensing agreement\. Sorry about that\. -->([\s\S]*?)<\/div>/,
      // Alternative pattern - direct lyrics div
      /<div class="ringtone">[\s\S]*?<div class="lyrics">([\s\S]*?)<\/div>/,
      // Another pattern
      /<div class="lyrics">([\s\S]*?)<\/div>/,
      // More specific pattern
      /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        let lyrics = match[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&amp;/g, '&') // Decode HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Check if we got meaningful lyrics (not just a few words)
        if (lyrics && lyrics.length > 50 && !lyrics.includes('unusual activity')) {
          return lyrics;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log('Error extracting lyrics from AZLyrics:', error.message);
    return null;
  }
}

// Lyrics proxy endpoint - Lyrics.ovh only
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    
    if (!artist || !title) {
      return res.status(400).json({ 
        error: 'Both artist and title are required' 
      });
    }

    console.log(`Searching for lyrics: "${title}" by "${artist}"`);

    // Try AZLyrics scraping first (most reliable)
    try {
      console.log('Trying AZLyrics scraping...');
      const artistSlug = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
      const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const url = `https://www.azlyrics.com/lyrics/${artistSlug}/${titleSlug}.html`;
      console.log(`  → Fetching: ${url}`);
      
      const response = await fetch(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Connection': 'keep-alive'
        }
      });

      console.log(`  → Response status: ${response.status}`);
      
      if (response.ok) {
        const html = await response.text();
        console.log(`  → HTML length: ${html.length} characters`);
        
        // Check if we got the bot protection page
        if (html.includes('unusual activity') || html.includes('checking your browser')) {
          console.log(`  → Bot protection detected, trying different approach...`);
          
          // Try with different headers
          const retryResponse = await fetch(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            }
          });
          
          if (retryResponse.ok) {
            const retryHtml = await retryResponse.text();
            if (!retryHtml.includes('unusual activity')) {
              const lyrics = extractLyricsFromAZLyrics(retryHtml);
              if (lyrics) {
                console.log(`✅ AZLyrics scraping success! Found ${lyrics.length} characters`);
                return res.json({
                  success: true,
                  lyrics: lyrics,
                  source: 'AZLyrics Scraping',
                  artist,
                  title
                });
              }
            }
          }
        } else {
          // Normal page, extract lyrics
          const lyrics = extractLyricsFromAZLyrics(html);
          if (lyrics) {
            console.log(`✅ AZLyrics scraping success! Found ${lyrics.length} characters`);
            return res.json({
              success: true,
              lyrics: lyrics,
              source: 'AZLyrics Scraping',
              artist,
              title
            });
          }
        }
      } else {
        console.log(`  → AZLyrics returned error: ${response.status}`);
      }
    } catch (error) {
      console.log(`AZLyrics scraping failed:`, error.message);
    }

    // Fallback to Lyrics.ovh API
    try {
      console.log('Trying Lyrics.ovh API...');
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      console.log(`  → Fetching: ${url}`);
      
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      console.log(`  → Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  → Response data keys:`, Object.keys(data));
        
        if (data.lyrics && data.lyrics.trim()) {
          console.log(`✅ Lyrics.ovh API success! Found ${data.lyrics.length} characters`);
          return res.json({
            success: true,
            lyrics: data.lyrics.trim(),
            source: 'Lyrics.ovh API',
            artist,
            title
          });
        } else {
          console.log(`  → No lyrics found in response`);
        }
      } else {
        console.log(`  → API returned error: ${response.status}`);
      }
    } catch (error) {
      console.log(`Lyrics.ovh API failed:`, error.message);
    }

    // If Lyrics.ovh fails, return error
    res.status(404).json({
      success: false,
      error: 'No lyrics found',
      message: `Could not find lyrics for "${title}" by "${artist}". Lyrics.ovh API is currently unavailable. Please use manual input or file upload.`
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'lyrics-proxy-server-simple',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    test: 'This is a test response',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Simple Lyrics Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Lyrics API: http://localhost:${PORT}/api/lyrics?artist=Artist&title=Song`);
});

export default app;
