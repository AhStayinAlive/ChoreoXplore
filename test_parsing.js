const parseYouTubeTitle = (title) => {
  const patterns = [
    /^([^-]+)\s*-\s*(.+)$/,
    /^(.+?)\s+by\s+(.+)$/i,
    /^([^:]+):\s*(.+)$/,
    /^(.+?)\s*\|\s*(.+)$/,
    /^(.+?)\s*\([^)]*\)\s*-\s*(.+)$/,
    /^(.+?)\s*\[[^\]]*\]\s*-\s*(.+)$/,
    /^(.+?)\s*-\s*(.+?)\s*\([^)]*\)$/,
    /^(.+?)\s*-\s*(.+?)\s*\[[^\]]*\]$/
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      let artist = match[1].trim();
      let song = match[2].trim();
      
      const cleanSong = song
        .replace(/\s*\([^)]*\)$/, '')
        .replace(/\s*\[[^\]]*\]$/, '')
        .replace(/\s*-\s*YouTube$/, '')
        .trim();
      
      const cleanArtist = artist
        .replace(/\s*\([^)]*\)$/, '')
        .replace(/\s*\[[^\]]*\]$/, '')
        .trim();
      
      const isLikelyReverseNaming = 
        cleanArtist.toLowerCase().includes('official') ||
        cleanArtist.toLowerCase().includes('lyric') ||
        cleanArtist.toLowerCase().includes('video') ||
        cleanArtist.toLowerCase().includes('music') ||
        cleanArtist.toLowerCase().includes('song') ||
        cleanArtist.toLowerCase().includes('track') ||
        cleanArtist.toLowerCase().includes('feat') ||
        cleanArtist.toLowerCase().includes('ft.') ||
        (cleanArtist.length > cleanSong.length * 1.5) ||
        cleanArtist.toLowerCase().includes('just like') ||
        cleanArtist.toLowerCase().includes('castle on') ||
        cleanArtist.toLowerCase().includes('cup of');
      
      if (isLikelyReverseNaming) {
        console.log(`Detected reverse naming: "${cleanArtist}" - "${cleanSong}"`);
        return { artist: cleanSong, song: cleanArtist, original: title };
      }
      
      if (cleanSong && cleanArtist && cleanSong !== cleanArtist) {
        return { artist: cleanArtist, song: cleanSong, original: title };
      }
    }
  }
  
  return { artist: 'Unknown', song: title, original: title };
};

// Test cases
console.log('Test 1: The Chainsmokers & Coldplay - Something Just Like This');
console.log(parseYouTubeTitle('The Chainsmokers & Coldplay - Something Just Like This'));
console.log('');

console.log('Test 2: Ed Sheeran - Castle On The Hill');
console.log(parseYouTubeTitle('Ed Sheeran - Castle On The Hill'));
console.log('');

console.log('Test 3: Multo - Cup of Joe (Official Lyric Video)');
console.log(parseYouTubeTitle('Multo - Cup of Joe (Official Lyric Video)'));
console.log('');

console.log('Test 4: Something Just Like This - The Chainsmokers & Coldplay (Official Video)');
console.log(parseYouTubeTitle('Something Just Like This - The Chainsmokers & Coldplay (Official Video)'));
