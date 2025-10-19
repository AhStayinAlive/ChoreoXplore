import React, { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { Fluid } from '@whatisjery/react-fluid-distortion';
import usePoseDetection from '../hooks/usePoseDetection';
import { useVisStore } from '../state/useVisStore';
import {
  getRightHandPosition,
  getLeftHandPosition,
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
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    lastScreenPosition: useRef({ x: 0, y: 0 })
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    lastScreenPosition: useRef({ x: 0, y: 0 })
  };

  // Get fluid distortion settings
  const fluidSettings = handEffect?.fluidDistortion || {
    fluidColor: '#005eff',
    intensity: 10,
    force: 2,
    distortion: 2,
    radius: 0.3,
    curl: 10,
    swirl: 20,
    velocityDissipation: 0.99,
    rainbow: true
  };

  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';

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

  // Convert hand position to screen coordinates using SimpleSkeleton coordinate system
  const convertHandToScreenCoords = useCallback((handPos) => {
    if (!handPos) return null;
    
    // Transform using SimpleSkeleton coordinate system (EXACTLY like ripple/smoke)
    const scale = 22; // Match SimpleSkeleton default scale
    const x = (handPos.x - 0.5) * 200 * scale;
    const y = (0.5 - handPos.y) * 200 * scale; // FLIP Y (like ripple/smoke)
    
    // Convert to UV coordinates (0-1 range)
    const uvX = (x / 20000) + 0.5;
    const uvY = (y / 20000) + 0.5;
    
    // Map UV coords to canvas pixel coordinates
    const canvasRect = gl.domElement.getBoundingClientRect();
    const screenX = canvasRect.left + (uvX * canvasRect.width);
    // Flip Y to compensate for library's internal Y flip - hand up = effect up
    const screenY = canvasRect.top + ((1.0 - uvY) * canvasRect.height);
    
    return { x: screenX, y: screenY };
  }, [gl]);

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
        fluidColor={fluidSettings.fluidColor}
        intensity={fluidSettings.intensity}
        force={fluidSettings.force}
        distortion={fluidSettings.distortion}
        radius={fluidSettings.radius}
        curl={fluidSettings.curl}
        swirl={fluidSettings.swirl}
        velocityDissipation={fluidSettings.velocityDissipation}
        rainbow={fluidSettings.rainbow}
        showBackground={false} // Keep background transparent
      />
    </EffectComposer>
  );
};

export default HandFluidDistortion;
