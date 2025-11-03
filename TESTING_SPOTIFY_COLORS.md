# Testing Guide: Spotify Auto-Color Feature

## Prerequisites

1. **Spotify Account** (free or premium)
2. **Spotify Developer App** configured
3. **Environment variables** set in `.env.local`

## Setup

### 1. Create Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create an App"**
3. Fill in:
   - App name: `ChoreoXplore` (or your choice)
   - App description: `Motion-reactive visuals with Spotify integration`
4. Click **"Create"**
5. In app settings, add Redirect URI: `http://localhost:5173`
6. Save changes
7. Copy your **Client ID** (you'll need this)
8. For existing flow: Copy your **Client Secret** (optional, if using legacy auth)

### 2. Configure Environment

Create or update `.env.local` in project root:

```env
# Spotify Configuration
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173

# Optional: Client secret (only needed for legacy auth flow)
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Test Scenarios

### Test 1: Fresh Start Without Spotify

**Expected Behavior:**
- Landing page shows "Connect to Spotify" button
- Color pickers show default black/white
- "Auto from Spotify" toggle is NOT visible
- "Continue" button is disabled

**Steps:**
1. Open app in incognito/private window
2. Verify default state as described above
3. Try clicking "Continue" - should be disabled

### Test 2: Connect to Spotify

**Expected Behavior:**
- Redirect to Spotify authorization page
- After auth, return to landing page
- "Connected to Spotify" status shown
- "Auto from Spotify" toggle becomes visible
- "Continue" button is enabled

**Steps:**
1. Click "Connect to Spotify"
2. Log in to Spotify (if not already)
3. Click "Agree" on authorization screen
4. Should redirect back to app
5. Verify connection status

### Test 3: Auto-Color with Playing Track

**Expected Behavior:**
- Colors update automatically within ~5 seconds
- Track info shows: "Auto-selected from: [Track] – [Artist]"
- Colors reflect album art palette + audio features
- Manual pickers show the auto-selected colors

**Steps:**
1. Open Spotify app/web player
2. Start playing a track (any song)
3. In ChoreoXplore, toggle "Auto from Spotify" ON
4. Wait ~5 seconds
5. Verify:
   - Background color changes (darker)
   - Asset color changes (vibrant)
   - Track name and artist displayed
   - Color pickers reflect new colors

### Test 4: Track Changes Update Colors

**Expected Behavior:**
- Colors update within ~5 seconds of track change
- Each track produces different colors
- Track info updates to show new track

**Steps:**
1. With "Auto from Spotify" ON
2. Change to a different track in Spotify
3. Wait ~5 seconds
4. Verify colors and track info update
5. Try 3-4 different tracks with different moods/genres
6. Observe color variations:
   - Energetic tracks → more saturated colors
   - Calm tracks → muted colors
   - Different keys → different base hues

### Test 5: Manual Override with Toggle OFF

**Expected Behavior:**
- Track changes do NOT update colors
- Manual color picker changes work
- Selected colors persist

**Steps:**
1. Toggle "Auto from Spotify" OFF
2. Change track in Spotify
3. Wait ~10 seconds
4. Verify colors do NOT change
5. Manually adjust background color picker
6. Verify color updates in UI
7. Repeat for asset color picker

### Test 6: Re-enable Auto-Sync

**Expected Behavior:**
- Colors immediately sync to current track
- Track info displays
- Future track changes update colors again

**Steps:**
1. With "Auto from Spotify" OFF
2. Toggle "Auto from Spotify" ON
3. Should update immediately (no 5s wait)
4. Change track
5. Wait ~5 seconds
6. Verify colors update

### Test 7: Continue to Visuals

**Expected Behavior:**
- Selected colors apply to 3D scene
- Background color visible on canvas
- Asset color tints visual elements

**Steps:**
1. With colors set (auto or manual)
2. Click "Continue"
3. Enable ChoreoXplore visuals
4. Verify:
   - Canvas background matches bgColor
   - Visual elements use assetColor tint

### Test 8: No Track Playing

**Expected Behavior:**
- No errors or crashes
- Colors remain at last known values
- Track info shows last track or nothing

**Steps:**
1. Toggle "Auto from Spotify" ON
2. Stop playback in Spotify
3. Wait ~10 seconds
4. Verify no errors in console
5. Colors should remain stable

### Test 9: Edge Cases

**Test different track types:**
- **Grayscale album art** (e.g., black & white albums)
  - Should still produce vivid colors via audio features
- **Colorful album art** (e.g., pop music)
  - Should extract vibrant palette
- **Classical music** (low energy)
  - Should produce calmer, less saturated colors
- **Electronic/EDM** (high energy)
  - Should produce bright, saturated colors
- **Jazz** (minor keys)
  - Should shift hue for minor mode

## Debugging

### Issue: Colors Not Updating

**Check:**
1. Browser console for errors
2. Network tab for API calls to Spotify
3. Token expiry: localStorage → `spotify_token_expiry`
4. Currently playing: https://api.spotify.com/v1/me/player/currently-playing

**Common causes:**
- Token expired → Reconnect to Spotify
- No track playing → Start playback
- Network issues → Check connection
- CORS errors on album art → Feature falls back to audio features only

### Issue: Connection Fails

**Check:**
1. `VITE_SPOTIFY_CLIENT_ID` matches Dashboard
2. Redirect URI matches exactly (including port)
3. App not in "development mode" in Spotify Dashboard

### Console Logs to Monitor

Enable verbose logging by checking console for:
- `🎵 New track detected: ...` - Track change detected
- `🎨 Theme applied: ...` - Theme generated and applied
- `🎨 Theme synced to store: ...` - Store updated

## Success Criteria

✅ All test scenarios pass without errors
✅ Colors update smoothly with track changes
✅ Manual override works correctly
✅ No console errors during normal operation
✅ Visuals reflect selected colors
✅ Feature gracefully handles edge cases (no track, expired token, etc.)

## Performance Notes

- Polling interval: 5 seconds (configurable in spotifyThemeBootstrap.js)
- Only updates when track ID changes (not on every poll)
- Album art extraction is async, doesn't block UI
- Falls back to audio features if image fails
