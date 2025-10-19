import React, { useRef, useEffect, useCallback } from 'react';
import { HandSmokeTexture } from '../utils/HandSmokeTexture';
import { useVisStore } from '../state/useVisStore';

const HandSmokeCanvas = ({ width = 512, height = 512, onCanvasReady }) => {
  const canvasRef = useRef(null);
  const smokeTextureRef = useRef(null);
  const callbackCalledRef = useRef(false);
  const handEffect = useVisStore(s => s.params.handEffect);
  const smokeSettings = handEffect?.smoke || {};

  // Initialize smoke texture
  useEffect(() => {
    if (!smokeTextureRef.current) {
      console.log('[HandSmokeCanvas] Creating new HandSmokeTexture instance');
      smokeTextureRef.current = new HandSmokeTexture({
        size: width,
        intensity: smokeSettings.intensity || 0.7,
        radiusMultiplier: smokeSettings.radius || 1.5,
        velocitySensitivity: smokeSettings.velocitySensitivity || 1.0,
        color: smokeSettings.color || '#ffffff'
      });

      // Update trail length
      if (smokeSettings.trailLength !== undefined) {
        smokeTextureRef.current.maxAge = Math.floor(20 + smokeSettings.trailLength * 100);
      }

      canvasRef.current = smokeTextureRef.current.canvas;

      // Notify parent that canvas is ready (only once)
      if (onCanvasReady && !callbackCalledRef.current) {
        onCanvasReady(canvasRef.current, smokeTextureRef.current);
        callbackCalledRef.current = true;
      }
    }

    return () => {
      if (smokeTextureRef.current) {
        smokeTextureRef.current.dispose();
        smokeTextureRef.current = null;
      }
    };
  }, [width, height, onCanvasReady]);

  // Canvas is created by HandSmokeTexture, just return null
  // The canvas exists but is managed internally
  return null;
};

export default HandSmokeCanvas;

