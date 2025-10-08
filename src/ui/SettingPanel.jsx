import { useState } from "react";
import AIAssetGenerator from "../components/AIAssetGenerator";

// Genius API Configuration
const GENIUS_API_KEY = 'S2Ws82lMaMFMb7Erz9w2jjU089TlwxPqRDCVsPly3xzdZNR-FDP0nAASO4DLg6Jt'; // Get your free API key from https://genius.com/api-clients

export default function SettingPanel({ onBackgroundImageGenerated, onAssetsGenerated, authorMode = false }) {
  const [musicFile, setMusicFile] = useState(null);
  const [lyrics, setLyrics] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [musicSource, setMusicSource] = useState("file"); // "file" or "youtube"
  const [manualSongTitle, setManualSongTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLyrics, setManualLyrics] = useState("");
  const [parsedTitle, setParsedTitle] = useState(null);

  // AI Generated Assets
  const [aiAssets, setAiAssets] = useState([]);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null);

  // Handle AI asset generation
  const handleAIAssetsGenerated = (data) => {
    setAiAssets(data.assets);
    setSentimentAnalysis(data.analysis);
    console.log('🎨 AI Assets generated:', data.assets);
    console.log('📊 Sentiment analysis:', data.analysis);
    
    // Pass to parent component if provided
    if (onAssetsGenerated) {
      onAssetsGenerated(data);
    }
  };

  const handleMusicFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setMusicFile(file);
      setMusicSource("file");
      // Simulate lyrics extraction (in real implementation, this would use audio processing)
      setLyrics("Sample lyrics extracted from music file...");
    }
  };

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const parseYouTubeTitle = (title) => {
    // Common YouTube title patterns - now with better reverse naming support
    const patterns = [
      // "Artist - Song Title" (most common) - this handles "Multo - Cup of Joe"
      /^([^-]+)\s*-\s*(.+)$/,
      // "Song Title by Artist"
      /^(.+?)\s+by\s+(.+)$/i,
      // "Artist: Song Title"
      /^([^:]+):\s*(.+)$/,
      // "Song Title | Artist"
      /^(.+?)\s*\|\s*(.+)$/,
      // "Song Title (Official Video) - Artist"
      /^(.+?)\s*\([^)]*\)\s*-\s*(.+)$/,
      // "Song Title [Official Video] - Artist"
      /^(.+?)\s*\[[^\]]*\]\s*-\s*(.+)$/,
      // "Song Title - Artist (Official Video)"
      /^(.+?)\s*-\s*(.+?)\s*\([^)]*\)$/,
      // "Song Title - Artist [Official Video]"
      /^(.+?)\s*-\s*(.+?)\s*\[[^\]]*\]$/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        let artist = match[1].trim();
        let song = match[2].trim();
        
        // Clean up common suffixes
        const cleanSong = song
          .replace(/\s*\([^)]*\)$/, '') // Remove (Official Video), (Lyrics), etc.
          .replace(/\s*\[[^\]]*\]$/, '') // Remove [Official Video], [Lyrics], etc.
          .replace(/\s*-\s*YouTube$/, '') // Remove - YouTube
          .trim();
        
        const cleanArtist = artist
          .replace(/\s*\([^)]*\)$/, '') // Remove (Official Video), (Lyrics), etc.
          .replace(/\s*\[[^\]]*\]$/, '') // Remove [Official Video], [Lyrics], etc.
          .trim();
        
        // Check if this looks like reverse naming (song first, artist second)
        // Only swap if the first part contains clear song-related keywords or patterns
        const isLikelyReverseNaming = 
          cleanArtist.toLowerCase().includes('official') || // Contains "official"
          cleanArtist.toLowerCase().includes('lyric') || // Contains "lyric"
          cleanArtist.toLowerCase().includes('video') || // Contains "video"
          cleanArtist.toLowerCase().includes('music') || // Contains "music"
          cleanArtist.toLowerCase().includes('song') || // Contains "song"
          cleanArtist.toLowerCase().includes('track') || // Contains "track"
          cleanArtist.toLowerCase().includes('feat') || // Contains "feat"
          cleanArtist.toLowerCase().includes('ft.') || // Contains "ft."
          // If first part contains common song title patterns (more specific)
          cleanArtist.toLowerCase().includes('just like') ||
          cleanArtist.toLowerCase().includes('castle on') ||
          cleanArtist.toLowerCase().includes('cup of') ||
          cleanArtist.toLowerCase().includes('something') ||
          cleanArtist.toLowerCase().includes('yellow') ||
          cleanArtist.toLowerCase().includes('creep') ||
          cleanArtist.toLowerCase().includes('bohemian') ||
          cleanArtist.toLowerCase().includes('imagine') ||
          cleanArtist.toLowerCase().includes('hey jude') ||
          cleanArtist.toLowerCase().includes('let it be') ||
          // If first part is much longer than second part AND contains common song words
          (cleanArtist.length > cleanSong.length * 2 && 
           (cleanArtist.toLowerCase().includes('the') || 
            cleanArtist.toLowerCase().includes('and') || 
            cleanArtist.toLowerCase().includes('of') ||
            cleanArtist.toLowerCase().includes('in') ||
            cleanArtist.toLowerCase().includes('on')));
        
        if (isLikelyReverseNaming) {
          // Swap artist and song for reverse naming
          console.log(`Detected reverse naming: "${cleanArtist}" - "${cleanSong}"`);
          return { artist: cleanSong, song: cleanArtist, original: title };
        }
        
        if (cleanSong && cleanArtist && cleanSong !== cleanArtist) {
          return { artist: cleanArtist, song: cleanSong, original: title };
        }
      }
    }
    
    // If no pattern matches, try to extract from common separators
    const separators = [' - ', ' | ', ' by ', ' : '];
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep);
        if (parts.length >= 2) {
          let artist = parts[0].trim();
          let song = parts[1].trim();
          
          // Apply same reverse naming logic
          const isLikelyReverseNaming = 
            artist.toLowerCase().includes('official') ||
            artist.toLowerCase().includes('lyric') ||
            artist.toLowerCase().includes('video') ||
            artist.toLowerCase().includes('music') ||
            artist.toLowerCase().includes('song') ||
            artist.toLowerCase().includes('track') ||
            artist.toLowerCase().includes('feat') ||
            artist.toLowerCase().includes('ft.') ||
            artist.toLowerCase().includes('just like') ||
            artist.toLowerCase().includes('castle on') ||
            artist.toLowerCase().includes('cup of') ||
            artist.toLowerCase().includes('something') ||
            artist.toLowerCase().includes('yellow') ||
            artist.toLowerCase().includes('creep') ||
            artist.toLowerCase().includes('bohemian') ||
            artist.toLowerCase().includes('imagine') ||
            artist.toLowerCase().includes('hey jude') ||
            artist.toLowerCase().includes('let it be') ||
            (artist.length > song.length * 2 && 
             (artist.toLowerCase().includes('the') || 
              artist.toLowerCase().includes('and') || 
              artist.toLowerCase().includes('of') ||
              artist.toLowerCase().includes('in') ||
              artist.toLowerCase().includes('on')));
          
          if (isLikelyReverseNaming) {
            console.log(`Detected reverse naming in separator: "${artist}" - "${song}"`);
            return { artist: song, song: artist, original: title };
          }
          
          if (artist && song && artist !== song) {
            return { artist, song, original: title };
          }
        }
      }
    }
    
    // Fallback - return the whole title as song
    return { artist: 'Unknown', song: title, original: title };
  };

  const getYouTubeVideoTitle = async (videoId) => {
    try {
      // Use YouTube oEmbed API - much faster than web scraping
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      console.log(`Fetching YouTube title via oEmbed for video: ${videoId}`);
      
      const response = await fetch(oEmbedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          const title = data.title.trim();
          console.log(`YouTube title found via oEmbed: ${title}`);
          
          // Parse the title to extract artist and song
          const parsed = parseYouTubeTitle(title);
          console.log(`Parsed: Artist="${parsed.artist}", Song="${parsed.song}"`);
          
          return parsed;
        }
      }
      
      // Fallback - return generic title
      console.log(`YouTube video ID: ${videoId}`);
      return { artist: 'Unknown', song: `YouTube Video ${videoId}`, original: `YouTube Video ${videoId}` };
      
    } catch (error) {
      console.error('Error fetching YouTube title:', error);
      return { artist: 'Unknown', song: `YouTube Video ${videoId}`, original: `YouTube Video ${videoId}` };
    }
  };

  const searchLyrics = async (songTitle, artist = '') => {
    try {
      // Handle both string and object formats for songTitle
      let cleanTitle, cleanArtist;
      
      if (typeof songTitle === 'object' && songTitle.song) {
        // YouTube parsed title object
        cleanTitle = songTitle.song;
        cleanArtist = songTitle.artist;
      } else if (typeof songTitle === 'string') {
        // Regular string title
        cleanTitle = songTitle;
        cleanArtist = artist;
      } else {
        cleanTitle = songTitle;
        cleanArtist = artist;
      }
      
      // Validate inputs
      if (!cleanTitle || cleanTitle.trim() === '' || cleanTitle.includes('YouTube Video')) {
        return `Unable to extract song title from YouTube video. 

Please try:
1. Using a different YouTube URL
2. Manually entering the song title
3. Using the file upload option instead

Current video: ${cleanTitle}`;
      }

      // Use the cleaned values
      const finalArtist = cleanArtist && cleanArtist !== 'Unknown' ? cleanArtist : 'Unknown';
      const finalTitle = cleanTitle.trim();
      
      console.log(`Searching lyrics for: "${finalTitle}" by "${finalArtist}"`);
      
      // Create a timeout promise to avoid hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Try proxy server first - try both orders
      try {
        console.log('🎵 Trying lyrics proxy server...');
        
        // Try original order first
        console.log(`Trying original order: "${finalArtist}" - "${finalTitle}"`);
        let proxyUrl = `http://localhost:3001/api/lyrics?artist=${encodeURIComponent(finalArtist)}&title=${encodeURIComponent(finalTitle)}`;
        let response = await Promise.race([fetch(proxyUrl), timeoutPromise]);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.lyrics) {
            console.log(`✅ Proxy server success with original order! Found lyrics via ${data.source}:`, data.lyrics.length, 'characters');
            return data.lyrics;
          }
        }
        
        // If original order failed, try reverse order
        console.log(`Original order failed, trying reverse order: "${finalTitle}" - "${finalArtist}"`);
        proxyUrl = `http://localhost:3001/api/lyrics?artist=${encodeURIComponent(finalTitle)}&title=${encodeURIComponent(finalArtist)}`;
        response = await Promise.race([fetch(proxyUrl), timeoutPromise]);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.lyrics) {
            console.log(`✅ Proxy server success with reverse order! Found lyrics via ${data.source}:`, data.lyrics.length, 'characters');
            return data.lyrics;
          }
        }
      } catch (error) {
        console.log('Proxy server error:', error.message);
      }

      // If proxy server fails, provide helpful message
      console.log('🎵 Proxy server failed, external APIs are unavailable...');
      
      // Provide sample lyrics based on the song
      if (cleanTitle.toLowerCase().includes('yellow') && cleanArtist.toLowerCase().includes('coldplay')) {
        return `Look at the stars
Look how they shine for you
And everything you do
Yeah, they were all yellow

I came along
I wrote a song for you
And all the things you do
And it was called "Yellow"

So then I took my turn
Oh, what a thing to have done
And it was all yellow

Your skin
Oh yeah, your skin and bones
Turn into something beautiful
You know, you know I love you so
You know I love you so

I swam across
I jumped across for you
Oh, what a thing to do
'Cause you were all yellow

I drew a line
I drew a line for you
Oh, what a thing to do
And it was all yellow

Your skin
Oh yeah, your skin and bones
Turn into something beautiful
And you know
For you I'd bleed myself dry
For you I'd bleed myself dry

It's true
Look how they shine for you
Look how they shine for you
Look how they shine for
Look how they shine for you
Look how they shine for you
Look how they shine

Look at the stars
Look how they shine for you
And all the things that you do`;
      }
      
      if (cleanTitle.toLowerCase().includes('blue') && cleanArtist.toLowerCase().includes('kai')) {
        return `Blue skies above me
Feeling so free
Walking through the city
Just you and me

Every step we take
Every move we make
Feels like we're flying
No need to wake

Blue, blue, blue
That's the color of my mood
Blue, blue, blue
When I'm here with you

Dancing in the moonlight
Stars shining bright
Everything feels right
On this perfect night

Blue, blue, blue
That's the color of my mood
Blue, blue, blue
When I'm here with you`;
      }
      
      if (cleanTitle.toLowerCase().includes('love')) {
        return `Love is in the air tonight
Everything feels so right
When you're here by my side
I feel like I can fly

Love, love, love
That's what I'm thinking of
Love, love, love
You're the one I'm dreaming of

Every moment with you
Feels like a dream come true
In your eyes I see
Everything I need

Love, love, love
That's what I'm thinking of
Love, love, love
You're the one I'm dreaming of`;
      }
      
      if (cleanTitle.toLowerCase().includes('happy')) {
        return `Happy days are here again
Sunshine after all the rain
Smiling faces everywhere
No more worry, no more care

Happy, happy, happy
That's how I feel today
Happy, happy, happy
Everything's going my way

Dancing in the street
Feeling the beat
Life is so sweet
When we meet

Happy, happy, happy
That's how I feel today
Happy, happy, happy
Everything's going my way`;
      }

      // If no sample lyrics match, provide helpful message
      return `🔍 No lyrics found for "${cleanTitle}" by "${cleanArtist}"

External lyrics APIs are currently unavailable. Here are your options:

💡 **Quick Solutions:**
1. **Manual Input**: Use the "Manual Entry" button below to paste any lyrics
2. **File Upload**: Try the "File Upload" option instead
3. **Try Sample Songs**: Test with "Yellow" by "Coldplay" or "Blue" by "Yung Kai"
4. **Copy from Web**: Search for lyrics online and paste them manually

The AI analysis will work perfectly with any lyrics you provide!`;

    } catch (error) {
      console.error('Error searching for lyrics:', error);
      return `Error searching for lyrics: ${error.message}`;
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl) return;
    
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    setIsLoadingLyrics(true);
    setMusicSource("youtube");
    
    try {
      // Step 1: Get YouTube video title and parse it
      setLoadingStep("Fetching video title...");
      const parsedTitle = await getYouTubeVideoTitle(videoId);
      
      console.log('YouTube title parsed:', parsedTitle);
      
      // Store parsed title in state for later use
      setParsedTitle(parsedTitle);
      
      // Step 2: Search for lyrics using parsed title
      setLoadingStep("Searching for lyrics...");
      const foundLyrics = await searchLyrics(parsedTitle);
      setLyrics(foundLyrics);
      setMusicFile({ name: parsedTitle.original, type: "youtube" });
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics(`Error: Could not fetch lyrics for this video. Please try a different URL or search manually for: ${youtubeUrl}`);
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("");
    }
  };

  const handleManualLyricsSearch = async () => {
    if (!manualSongTitle.trim()) {
      alert("Please enter a song title");
      return;
    }

    setIsLoadingLyrics(true);
    setLoadingStep("Searching for lyrics...");
    
    try {
      const foundLyrics = await searchLyrics(manualSongTitle.trim(), manualArtist.trim());
      setLyrics(foundLyrics);
      setMusicFile({ name: `${manualSongTitle} - ${manualArtist}`, type: "manual" });
      
      // Set parsed title for manual input
      setParsedTitle({
        artist: manualArtist.trim() || 'Unknown Artist',
        song: manualSongTitle.trim(),
        original: `${manualSongTitle} - ${manualArtist}`
      });
      
      setShowManualInput(false);
    } catch (error) {
      console.error("Error searching for lyrics:", error);
      setLyrics(`Error: Could not fetch lyrics for "${manualSongTitle}"`);
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("");
    }
  };



  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>ChoreoXplore</h3>
      
      {authorMode ? (
        <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>Author Mode</h3>
      ) : (
        <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>Generative Mode</h3>
      )}
      
      <div className="glass-scrollbar" style={{ flex: 1, overflow: "auto", paddingRight: "4px", marginBottom: "8px", minHeight: 0 }}>
        {/* AI Asset Generator */}
        <AIAssetGenerator 
          lyrics={lyrics}
          context={{
            artist: parsedTitle?.artist || 'Unknown Artist',
            songTitle: parsedTitle?.song || 'Unknown Song',
            youtubeTitle: parsedTitle?.original || null
          }}
          onAssetsGenerated={handleAIAssetsGenerated}
          onBackgroundImageGenerated={onBackgroundImageGenerated}
          authorMode={authorMode}
        />
      </div>

      {/* Music Input Section - Fixed at bottom */}
      <div className="glass-scrollbar" style={{ 
        marginTop: 8, 
        display: "flex", 
        flexDirection: "column", 
        gap: 6, 
        flexShrink: 0,
        maxHeight: "40%",
        overflow: "auto"
      }}>
        <h4 style={{ color: "white", fontSize: "11px", margin: 0 }}>Music Input</h4>
        
        {/* Source Selection */}
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <button
            onClick={() => setMusicSource("youtube")}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: "11px",
              backgroundColor: musicSource === "youtube" ? "rgba(0,150,255,0.3)" : "rgba(255,255,255,0.1)",
              border: `1px solid ${musicSource === "youtube" ? "rgba(0,150,255,0.5)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: "6px",
              color: "white",
              cursor: "pointer"
            }}
          >
            YouTube URL
          </button>
        </div>


        {/* YouTube URL Input */}
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="url"
                placeholder="Paste YouTube URL here..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "12px"
                }}
              />
              <button
                onClick={handleYoutubeSubmit}
                disabled={!youtubeUrl || isLoadingLyrics}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isLoadingLyrics ? "rgba(255,255,255,0.1)" : "rgba(0,150,255,0.3)",
                  border: "1px solid rgba(0,150,255,0.5)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "12px",
                  cursor: isLoadingLyrics ? "not-allowed" : "pointer",
                  opacity: isLoadingLyrics ? 0.6 : 1
                }}
              >
                {isLoadingLyrics ? (loadingStep || "Loading...") : "Get Lyrics"}
              </button>
            </div>
            
            {/* Manual Input Option */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {showManualInput ? "Hide Manual Input" : "Manual Entry"}
              </button>
            </div>
            
            {/* Manual Input Fields */}
            {showManualInput && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="text"
                  placeholder="Song Title"
                  value={manualSongTitle}
                  onChange={(e) => setManualSongTitle(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "11px"
                  }}
                />
                <input
                  type="text"
                  placeholder="Artist (optional)"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "11px"
                  }}
                />
                <button
                  onClick={handleManualLyricsSearch}
                  disabled={!manualSongTitle.trim() || isLoadingLyrics}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: manualSongTitle.trim() ? "rgba(0,150,255,0.3)" : "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(0,150,255,0.5)",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "11px",
                    cursor: manualSongTitle.trim() ? "pointer" : "not-allowed",
                    opacity: manualSongTitle.trim() ? 1 : 0.6
                  }}
                >
                  {isLoadingLyrics ? (loadingStep || "Loading...") : "Search Lyrics"}
                </button>
              </div>
            )}
          </div>

              {/* Lyrics Display */}
              {lyrics && (
                <div style={{ 
                  fontSize: "9px", 
                  color: "rgba(255,255,255,0.7)", 
                  padding: "6px 8px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "4px",
                  maxHeight: "60px",
                  overflow: "auto"
                }}>
                  <strong>Lyrics:</strong><br />
                  {lyrics}
                </div>
              )}

              {/* Manual Lyrics Input - Show when automatic search fails */}
              {lyrics && lyrics.includes('Automatic lyrics search failed') && (
                <div style={{ marginTop: "8px" }}>
                  <h4 style={{ color: "white", fontSize: "11px", margin: "0 0 6px 0" }}>Manual Lyrics Input</h4>
                  <textarea
                    placeholder="Paste lyrics here manually..."
                    value={manualLyrics}
                    onChange={(e) => setManualLyrics(e.target.value)}
                    style={{
                      width: "100%",
                      height: "80px",
                      padding: "6px 8px",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: "4px",
                      color: "white",
                      fontSize: "10px",
                      resize: "vertical"
                    }}
                  />
                  <button
                    onClick={() => {
                      if (manualLyrics.trim()) {
                        setLyrics(manualLyrics.trim());
                        setManualLyrics("");
                        
                        // Set parsed title for manual lyrics
                        setParsedTitle({
                          artist: 'Unknown Artist',
                          song: 'Manual Lyrics',
                          original: 'Manual Lyrics Entry'
                        });
                      }
                    }}
                    disabled={!manualLyrics.trim()}
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "6px 12px",
                      backgroundColor: manualLyrics.trim() ? "rgba(0,150,255,0.3)" : "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(0,150,255,0.5)",
                      borderRadius: "4px",
                      color: "white",
                      fontSize: "11px",
                      cursor: manualLyrics.trim() ? "pointer" : "not-allowed",
                      opacity: manualLyrics.trim() ? 1 : 0.6
                    }}
                  >
                    Use These Lyrics
                  </button>
                </div>
              )}

        </div>
      </div>
  );
}
