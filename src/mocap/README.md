# Hand Ripple Manager

## Overview
Helper utilities for converting hand positions from world space to screen UV coordinates and spawning ripples.

## Functions

### `worldToScreenUV(worldPos, camera, renderer)`
Converts a 3D world position to 2D screen UV coordinates (0-1 range).

### `spawnHandRipple(ripplePass, worldPos, camera, renderer, velocity, pressure, options)`
Spawns a ripple at the given world position with amplitude mapped from velocity and pressure.

### `isPalmContactingSurface(palmPos, threshold)`
Simple distance-to-plane check for palm contact detection.

### `getPalmWorldPosition(landmarks, hand, scale)`
Extracts palm position from MediaPipe landmarks and converts to scene coordinates.

## Usage
```javascript
import { spawnHandRipple, getPalmWorldPosition } from '../mocap/handRippleManager';

const palmPos = getPalmWorldPosition(landmarks, 'left');
spawnHandRipple(ripplePass, palmPos, camera, gl, velocity, 0, {});
```
