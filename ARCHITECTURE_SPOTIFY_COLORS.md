# Spotify Auto-Color Feature - Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Actions                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WelcomeMode.jsx (Landing Page)                    │
│  • Color pickers (Background, Asset)                                │
│  • "Connect to Spotify" button                                      │
│  • "Auto from Spotify" toggle                                       │
│  • Track info display                                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    ▼                            ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐
    │   SpotifyContext         │   │  spotifyThemeBootstrap   │
    │   (Existing Auth)        │   │  (New Polling System)    │
    │  • authenticate()        │   │  • Poll every 5s         │
    │  • accessToken           │   │  • Track change detect   │
    │  • localStorage tokens   │   │  • forceUpdateTheme()    │
    └──────────────────────────┘   └──────────────────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │   Spotify API Module     │
                                    │  • getCurrentlyPlaying() │
                                    │  • getAudioFeatures()    │
                                    └──────────────────────────┘
                                                  │
                    ┌─────────────────────────────┴─────────────┐
                    │                                           │
                    ▼                                           ▼
        ┌──────────────────────┐              ┌──────────────────────────┐
        │  Album Art (Vibrant) │              │   Audio Features         │
        │  • Extract palette   │              │   • Key → Hue            │
        │  • Vibrant colors    │              │   • Energy → Saturation  │
        │  • Muted colors      │              │   • Valence → Hue shift  │
        └──────────────────────┘              └──────────────────────────┘
                    │                                           │
                    └─────────────────┬─────────────────────────┘
                                      ▼
                        ┌──────────────────────────┐
                        │   musicTheme.js          │
                        │   buildMusicTheme()      │
                        │  • Combine art + audio   │
                        │  • Generate theme object │
                        └──────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │   Theme Object           │
                        │  {                       │
                        │    background: '#...',   │
                        │    asset: '#...',        │
                        │    handLeft: '#...',     │
                        │    handRight: '#...',    │
                        │    meta: { ... }         │
                        │  }                       │
                        └──────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    ▼                                    ▼
        ┌──────────────────────┐          ┌──────────────────────────┐
        │   applyTheme.js      │          │   'cx:theme' Event       │
        │  • Set CSS vars      │          │   window.dispatchEvent() │
        │  • --cx-bg           │          └──────────────────────────┘
        │  • --cx-asset        │                        │
        │  • --cx-hand-*       │                        │
        └──────────────────────┘                        │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │   themeToStore.js        │
                                          │   wireThemeToStore()     │
                                          │  • Listen to event       │
                                          │  • Update Zustand store  │
                                          └──────────────────────────┘
                                                        │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │   Zustand Store          │
                                          │   userColors {           │
                                          │     bgColor,             │
                                          │     assetColor           │
                                          │   }                      │
                                          └──────────────────────────┘
                                                        │
                    ┌───────────────────────────────────┴───────────┐
                    ▼                                               ▼
        ┌──────────────────────┐                      ┌──────────────────────┐
        │   Canvas3D.jsx       │                      │   Visual Components  │
        │  • Background color  │                      │  • Lines, Surfaces   │
        │  • Scene rendering   │                      │  • 3D geometries     │
        └──────────────────────┘                      │  • Asset tinting     │
                                                       └──────────────────────┘
```

## Color Derivation Logic

### From Album Art (node-vibrant)
```
Album Image → Vibrant.getPalette() → {
  vibrant: bright, saturated color
  darkVibrant: darker version
  lightVibrant: lighter version
  muted: desaturated color
  darkMuted: darker muted
  lightMuted: lighter muted
}
```

### From Audio Features
```
Key (0-11) + Mode (0/1) → Base Hue (0-360°)
├─ C (0) → Red (0°)
├─ D (2) → Yellow-Orange (60°)
├─ E (4) → Yellow-Green (120°)
├─ G (7) → Blue (210°)
└─ Minor → +15° hue shift

Energy (0-1) → Saturation (50-90%)
Valence (0-1) → Hue adjustment (-30° to +30°)
Danceability (0-1) → Lightness modifier (50-70%)
```

### Final Theme Colors
```
Background:
  - Dark (10-15% lightness)
  - Lower saturation (20-40%)
  - From darkMuted or audio-derived

Asset:
  - Vibrant (50-70% lightness)
  - High saturation (50-90%)
  - From vibrant palette or audio-derived

Hand Colors:
  - handLeft: Analogous warm (+30° hue)
  - handRight: Analogous cool (-30° hue)
  - handCenter: Triadic complementary (+120° hue)
  - Same saturation/lightness as asset
```

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/spotify/auth.js` | PKCE authentication flow | 136 |
| `src/spotify/api.js` | Spotify API wrappers | 83 |
| `src/theme/musicTheme.js` | Color generation from music | 165 |
| `src/theme/applyTheme.js` | CSS variable setter | 26 |
| `src/integrations/spotifyThemeBootstrap.js` | Polling and orchestration | 160 |
| `src/integrations/themeToStore.js` | Event to store bridge | 33 |
| `src/components/WelcomeMode.jsx` | Landing page UI | +100 |

Total: ~700 new lines of production code
