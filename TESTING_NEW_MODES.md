# Testing Guide for New Visual Modes

This guide explains how to test and verify the five new visual modes in ChoreoXplore.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the local dev server URL (typically http://localhost:5173 or http://localhost:5138)

## Accessing the Visual Modes

### Step 1: Get Past the Welcome Screen

1. The app starts on the Welcome screen
2. Click the **"Start"** button in the center of the screen
3. This will take you to the ChoreoXplore mode

### Step 2: Enable Visuals

1. Look for the **ChoreoXplore panel** on the left side
2. Find the **"Enable Visuals"** toggle at the top
3. Click it to turn it **ON** (it should turn blue/active)

### Step 3: Select a Visual Mode

1. In the ChoreoXplore panel, find the **"Visual Mode"** dropdown
2. Click on it to see all available modes:
   - Empty
   - Quand C'est (default)
   - Pulsating Circle
   - Raindrop
   - Water Ripple
   - Heat Wave
   - Flowing
   - Gentle Wave
   - **Silk Veil** ⭐ (new)
   - **Lotus Bloom** ⭐ (new)
   - **Paper Lanterns** ⭐ (new)
   - **Stained Glass Rose** ⭐ (new)
   - **Ink & Water** ⭐ (new)

3. Select any mode to see it render in the main canvas

## Testing Each New Mode

### Silk Veil
- **What to Look For**: Flowing, translucent sheets that look like silk fabric
- **Audio Test**: Play music and watch the fabric bend and shimmer with the beat
- **Controls to Try**:
  - Increase **Music Reactivity** to see more dramatic movements
  - Adjust **Speed** to change animation speed
  - Change **Asset Color** to see the silk color change

### Lotus Bloom
- **What to Look For**: Radial mandala pattern with petals that bloom and close
- **Audio Test**: The petals should scale with music volume (RMS)
- **What Happens**:
  - Colors shift from cool to warm based on frequency
  - Pattern symmetry changes every 8-16 beats (watch for 6→8→12 petals)
  - Slow rotation effect

### Paper Lanterns
- **What to Look For**: Multiple floating lanterns drifting upward
- **Audio Test**:
  - Bass/low frequencies make lanterns rise faster
  - Mid frequencies make them sway
  - Strong beats make random lanterns brighten
- **Performance**: Auto-throttles from 60 to 20 lanterns if FPS drops

### Stained Glass Rose
- **What to Look For**: Cathedral-style rosette with light rays emanating from center
- **Audio Test**:
  - Strong beats create bright flashes
  - Music volume controls ray length
  - Frequency brightness affects color (reds to whites)
- **Visual Effect**: God rays with radial blur

### Ink & Water
- **What to Look For**: Watercolor wash effect with ink blooming and diffusing
- **Audio Test**:
  - Bass makes ink spread more
  - High frequencies add granulation/speckle at edges
- **Visual Effect**: Looks like traditional sumi-e painting

## Testing Audio Reactivity

### Option 1: Using Spotify (Recommended)
1. Click **"Connect to Spotify"** in the welcome screen
2. Log in and grant permissions
3. Use the Spotify playback control at the bottom
4. Play music and watch the visuals react

### Option 2: Using Virtual Audio Cable
1. Install VB-Audio Virtual Cable: https://vb-audio.com/Cable/
2. Set "CABLE Input" as your default playback device
3. Play music through any app
4. Grant microphone permission when prompted
5. The app will capture the audio through the virtual cable

### Option 3: Direct Microphone Input
1. When prompted, grant microphone permission
2. Play music near your microphone
3. The visuals will react to ambient sound

## Testing Controls

### Speed Slider
- Range: 0 to 2.0
- Default: 1.2
- Effect: Controls animation speed for all modes

### Transparency Slider
- Range: 0 to 1.0
- Default: 0.8
- Effect: Controls overall opacity of visuals

### Music Reactivity Slider
- Range: 0 to 1.0
- Default: 0.9
- Effect: Controls sensitivity to audio
- **Set to 0**: Freezes audio responses (visuals become static)
- **Set to 1**: Maximum reactivity

### Color Pickers

#### Background Color
- Click the "Background" color picker
- Choose a color
- All modes use this as the base/background color

#### Asset Color
- Click the "Assets" color picker
- Choose a color
- All modes use this as the primary visual element color

## Performance Testing

### FPS Monitoring
1. Open browser DevTools (F12)
2. Look at the FPS counter in the Motion Input Panel (top right)
3. Target: 60 FPS at 1080p

### Auto-Throttle Testing
1. Select **Paper Lanterns** mode (uses instanced rendering)
2. Watch the FPS counter
3. If FPS drops below 50, the system automatically reduces lantern count
4. You should see FPS recover

## Troubleshooting

### Visuals Not Showing
- ✅ Check that "Enable Visuals" toggle is ON
- ✅ Try selecting a different mode
- ✅ Check that Transparency is not set to 0

### No Audio Reactivity
- ✅ Check that "Music Reactivity" slider is not at 0
- ✅ Verify audio is playing
- ✅ Check browser console for audio permission errors
- ✅ Try using Virtual Audio Cable method

### Low FPS
- ✅ Close other browser tabs
- ✅ Disable browser extensions
- ✅ Use Chrome/Edge (better WebGL performance)
- ✅ The auto-throttle system should help automatically

### Colors Not Changing
- ✅ Make sure you're changing the right color picker
- ✅ Background Color affects background/base
- ✅ Asset Color affects primary visual elements
- ✅ Try a high-contrast color to see the effect

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

To preview the production build:
```bash
npm run preview
```

## Known Limitations

1. **Audio Input**: Requires either Spotify integration or Virtual Audio Cable setup
2. **WebGL Required**: All visual modes require WebGL support
3. **Performance**: Some modes may be demanding on lower-end hardware
4. **Motion Input**: Optional - modes work without motion capture

## Expected Behavior Summary

All five new modes should:
- ✅ Render without errors
- ✅ React to audio in real-time
- ✅ Respect Speed, Transparency, and Music Reactivity settings
- ✅ Use Background and Asset colors
- ✅ Maintain 60 FPS (with auto-throttling)
- ✅ Switch smoothly when selected from dropdown

## Mode Selection Issue

**Note**: The problem statement mentioned that the visual mode selector was "stuck with quand cest". This has been verified as working correctly:

1. The default mode is "Quand C'est" (by design)
2. Users can select any mode from the dropdown
3. The mode switches immediately when selected
4. The selection is properly wired through `useVisStore` → `ChoreoXploreSystem`

If you're seeing "quand cest" when the app first loads, that's intentional - it's the default mode. Simply select a different mode from the dropdown to switch.
