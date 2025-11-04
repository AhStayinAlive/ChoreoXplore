# Hand Ripple Post-Process Effect

## Overview
This directory contains the screen-space hand ripple post-process effect implementation.

## Files
- **HandRipplePass.js** - Post-process pass with ripple pooling and shader management
- **HandRippleEffect.jsx** - React Three Fiber component wrapper for integration
- **rippleFragment.glsl** - GLSL fragment shader for screen-space UV displacement

## Usage
See README.md in the project root for testing and configuration instructions.

## Technical Details
- Half-resolution rendering for performance
- Ripple pooling with 2.5s lifetime
- Compatible with EffectComposer-style interface
- Integrated into React Three Fiber render loop
