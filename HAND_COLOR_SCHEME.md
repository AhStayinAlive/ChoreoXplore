# Hand Color Scheme - 3 Colors

## Color Wheel Distribution

The Spotify auto-color feature now generates **3 distinct hand colors** for hand effects, creating a harmonious triadic color scheme:

```
                     0° (Base Hue)
                          │
                          │ asset color
                          │
                          ▼
        330° ◄─────── Base Hue ───────► 30°
       (handRight)                   (handLeft)
                          │
                          │
                        120°
                    (handCenter)
```

## Hand Colors Generated

1. **handLeft** (Base + 30°)
   - Analogous warm variation
   - Shifts hue 30° clockwise
   - Example: If base is Blue (210°), handLeft is Cyan (240°)

2. **handRight** (Base - 30°)
   - Analogous cool variation
   - Shifts hue 30° counter-clockwise
   - Example: If base is Blue (210°), handRight is Blue-Violet (180°)

3. **handCenter** (Base + 120°) ⭐ NEW
   - Triadic complementary color
   - Creates strong visual contrast
   - Shifts hue 120° clockwise
   - Example: If base is Blue (210°), handCenter is Yellow-Orange (330°)

## Usage

The 3rd hand color is available as:
- **CSS Variable**: `--cx-hand-center`
- **Theme Object**: `theme.handCenter`
- **Color Format**: Hex string (e.g., `#ff6b9d`)

## Color Properties

All hand colors share the same:
- **Saturation**: Derived from audio energy (50-90%)
- **Lightness**: Derived from danceability (50-70%)
- **Only Hue varies**: Creates harmonious but distinct colors

## Example Color Set

For a track with:
- Key: G (7) → Base hue: 210° (Blue)
- Energy: 0.8 → Saturation: 82%
- Danceability: 0.6 → Lightness: 62%

Generated colors:
```
handLeft:   HSL(240°, 82%, 62%) = #4dd6ff (Cyan)
handRight:  HSL(180°, 82%, 62%) = #4dffb8 (Turquoise)
handCenter: HSL(330°, 82%, 62%) = #ff4dac (Pink-Magenta) ⭐
```

## Visual Harmony

The triadic scheme (0°, +30°, -30°, +120°) creates:
- **Balanced contrast**: Not too similar, not too different
- **Visual interest**: 3 distinct colors for variety
- **Musical coherence**: All derived from the same base hue
- **Energetic feel**: Spacing allows each color to stand out

## Implementation

The 3rd color is automatically generated and applied whenever:
1. User connects to Spotify
2. "Auto from Spotify" toggle is ON
3. A track is playing

**Automatic Application to Hand Effects:**
When the theme updates, the hand effect colors are automatically set:
- **Ripple Effect**: 
  - Base Color → `handLeft`
  - Ripple Color → `handRight`
- **Smoke Effect**: 
  - Color → `handCenter`
- **Fluid Effect**: 
  - Fluid Color → `handLeft`

No manual configuration needed! The colors update automatically when you:
1. Enable "Auto from Spotify" on the landing page
2. Have a track playing in Spotify
3. Enable hand effects in the Hand Effects Panel

The hand effect settings panel will show the auto-selected colors, and they update automatically when the track changes (~5 seconds).
