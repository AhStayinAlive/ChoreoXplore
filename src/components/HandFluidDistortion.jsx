import React, { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { Fluid } from '@whatisjery/react-fluid-distortion';
import * as THREE from 'three';
import usePoseDetection from '../hooks/usePoseDetection';
import { useVisStore } from '../state/useVisStore';
import {
  getRightHandAnchor as getRightHandPosition,
  getLeftHandAnchor as getLeftHandPosition,
  calculateHandVelocity,
  smoothHandPosition
} from '../utils/handTracking';

const HandFluidDistortion = () => {
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const isActive = useVisStore(s => s.isActive);
  const { gl, size, camera } = useThree(); // Get canvas DOM element, size, and camera
  
  // Separate tracking state for each hand
  const leftHandRefs = {
    lastPosition: useRef({ x: 0, y: 0 }),
    smoothedPosition: useRef({ x: 0, y: 0 }),
    velocity: useRef(0),
    lastScreenPosition: useRef({ x: 0, y: 0 })
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0, y: 0 }),
    smoothedPosition: useRef({ x: 0, y: 0 }),
    velocity: useRef(0),
    lastScreenPosition: useRef({ x: 0, y: 0 })
  };

  // Get fluid distortion settings - read directly from store (defaults are set in useVisStore and overridden by themeToStore)
  const fluidSettings = handEffect?.fluidDistortion || {};
  
  // Extract individual values for proper dependency tracking (like particle trail does)
  const fluidColor = fluidSettings.fluidColor || '#005eff';
  const fluidIntensity = fluidSettings.intensity || 1;
  const fluidForce = fluidSettings.force || 1.5;
  const fluidDistortion = fluidSettings.distortion || 1;
  const fluidRadius = fluidSettings.radius || 0.1;
  const fluidCurl = fluidSettings.curl || 6;
  const fluidSwirl = fluidSettings.swirl || 0;
  const fluidVelocityDissipation = fluidSettings.velocityDissipation || 0.99;
  const fluidRainbow = fluidSettings.rainbow || false;

  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  // When both hands are selected, override all settings except radius and fluidColor to be 0
  const effectiveSettings = handSelection === 'both' ? {
    fluidColor: fluidColor,
    intensity: 0,
    force: 0,
    distortion: 0,
    radius: fluidRadius,
    curl: 0,
    swirl: 0,
    velocityDissipation: fluidVelocityDissipation,
    rainbow: false
  } : {
    fluidColor: fluidColor,
    intensity: fluidIntensity,
    force: fluidForce,
    distortion: fluidDistortion,
    radius: fluidRadius,
    curl: fluidCurl,
    swirl: fluidSwirl,
    velocityDissipation: fluidVelocityDissipation,
    rainbow: fluidRainbow
  };

  // THE REAL SOLUTION: Intercept at WINDOW level (library listens to window!)
  useEffect(() => {
    // Intercept at WINDOW level, not canvas
    const interceptWindowEvent = (e) => {
      // If it's NOT a hand-tracking event, block it
      if (!e.isHandTracking) {
        e.stopImmediatePropagation(); // Stop ALL listeners including library
        e.preventDefault();
      }
    };
    
    // Capture phase on WINDOW = intercept before library
    window.addEventListener('pointermove', interceptWindowEvent, { capture: true });
    
    return () => {
      window.removeEventListener('pointermove', interceptWindowEvent, { capture: true });
    };
  }, []);

  // Convert hand position to screen coordinates using THREE.js projection
  const convertHandToScreenCoords = useCallback((handPos) => {
    if (!handPos) return null;
    
    // Get canvas dimensions
    const canvasRect = gl.domElement.getBoundingClientRect();
    
    // handPos is now in scene coordinates from handTracking.js
    // Use coordinates directly (already in SimpleSkeleton system)
    const sceneX = handPos.x;
    const sceneY = handPos.y;
    const sceneZ = 2; // Same Z as avatar (in front)
    
    // Create 3D vector in scene space
    const vector = new THREE.Vector3(sceneX, sceneY, sceneZ);
    
    // Project to screen space using camera
    vector.project(camera);
    
    // Convert from normalized device coordinates (-1 to 1) to screen pixels
    const screenX = canvasRect.left + ((vector.x + 1) / 2) * canvasRect.width;
    const screenY = canvasRect.top + ((-vector.y + 1) / 2) * canvasRect.height;
    
    return { x: screenX, y: screenY };
  }, [gl, camera]);

  // Dispatch PointerEvent to WINDOW (library listens to window!)
  const dispatchPointerEvent = useCallback((screenPos, velocity) => {
    if (!screenPos) return;
    
    // Calculate movement delta from velocity
    const movementX = velocity * 50; // Scale velocity to movement pixels
    const movementY = velocity * 50;
    
    // Create synthetic PointerEvent
    const event = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: screenPos.x,
      clientY: screenPos.y,
      movementX: movementX,
      movementY: movementY,
      pointerId: 1, // Use a consistent pointer ID
      pointerType: 'touch', // Simulate touch input
      pressure: 0.5,
      width: 1,
      height: 1
    });
    
    // Mark as hand-tracking event so our interceptor allows it through
    event.isHandTracking = true;
    
    // Dispatch the event to WINDOW (not canvas!)
    window.dispatchEvent(event);
  }, []);

  // Update hand tracking and dispatch pointer events
  const updateHandFluid = useCallback((currentHandPos, handRefs, delta) => {
    if (currentHandPos) {
      // Smooth hand position to reduce jitter
      const smoothedPos = smoothHandPosition(currentHandPos, handRefs.smoothedPosition.current, 0.15);
      handRefs.smoothedPosition.current = smoothedPos;
      
      // Calculate hand velocity for effect intensity
      const velocity = calculateHandVelocity(smoothedPos, handRefs.lastPosition.current, delta);
      handRefs.velocity.current = velocity;
      
      // Convert to screen coordinates
      const screenPos = convertHandToScreenCoords(smoothedPos);
      
      if (screenPos) {
        // Dispatch pointer event to canvas
        dispatchPointerEvent(screenPos, velocity);
        
        // Store screen position for next frame
        handRefs.lastScreenPosition.current = screenPos;
      }
      
      // Store current position for next frame
      handRefs.lastPosition.current = smoothedPos;
    }
  }, [convertHandToScreenCoords, dispatchPointerEvent]);

  // Update hand tracking each frame
  useFrame((state, delta) => {
    // Update left hand if enabled
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      updateHandFluid(leftHandPos, leftHandRefs, delta);
    }
    
    // Update right hand if enabled
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateHandFluid(rightHandPos, rightHandRefs, delta);
    }
  });

  // Don't render if no hands are enabled or ChoreoXplore is not active
  if ((!leftHandEnabled && !rightHandEnabled) || !isActive) {
    return null;
  }

  return (
    <EffectComposer>
      <Fluid
        fluidColor={effectiveSettings.fluidColor}
        intensity={effectiveSettings.intensity}
        force={effectiveSettings.force}
        distortion={effectiveSettings.distortion}
        radius={effectiveSettings.radius}
        curl={effectiveSettings.curl}
        swirl={effectiveSettings.swirl}
        velocityDissipation={effectiveSettings.velocityDissipation}
        rainbow={effectiveSettings.rainbow}
        showBackground={false} // Keep background transparent
      />
    </EffectComposer>
  );
};

export default HandFluidDistortion;
