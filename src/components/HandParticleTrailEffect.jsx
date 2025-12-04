import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import usePoseDetection from '../hooks/usePoseDetection';
import { getLeftHandAnchor as getLeftHandPosition, getRightHandAnchor as getRightHandPosition } from '../utils/handTracking';

const HandParticleTrailEffect = () => {
  const leftParticlesRef = useRef();
  const rightParticlesRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const inverseHands = useStore(s => s.inverseHands);
  const handSelection = handEffect?.handSelection || 'none';
  const particleSettings = handEffect?.particleTrail || {};
  
  // Separate trail state for each hand
  const leftTrailPositions = useRef([]);
  const rightTrailPositions = useRef([]);
  const leftLastPosition = useRef({ x: 0, y: 0 }); // Scene coordinates center
  const rightLastPosition = useRef({ x: 0, y: 0 }); // Scene coordinates center
  const leftSmoothedPosition = useRef({ x: 0, y: 0 });
  const rightSmoothedPosition = useRef({ x: 0, y: 0 });
  const leftInitialized = useRef(false); // Track if left hand trail has been initialized
  const rightInitialized = useRef(false); // Track if right hand trail has been initialized
  
  const trailLength = Math.floor(particleSettings.trailLength ?? 50);
  const particleSize = particleSettings.particleSize ?? 0.15;
  const color = particleSettings.color || '#00ffff';
  const intensity = particleSettings.intensity ?? 0.8;
  const fadeSpeed = particleSettings.fadeSpeed ?? 0.95;
  const smoothness = particleSettings.smoothness ?? 0.15; // Lower = less responsive, more smoothing; Higher = more responsive, less smoothing
  
  // Animation constants for smoother trail rendering
  const POSITION_BLEND_FACTOR = 0.3; // How much to blend particle positions with next particle
  const Z_SPACING = 0.3; // Spacing between particles in depth
  const DEPTH_CURVE_FACTOR = 0.5; // Curve factor for depth perception
  const CUBIC_FADE_WEIGHT = 0.6; // Weight for cubic fade in combined fade
  const EXP_FADE_WEIGHT = 1 - CUBIC_FADE_WEIGHT; // Weight for exponential fade (ensures sum = 1.0)
  
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  
  // Initialize trail arrays
  useEffect(() => {
    leftTrailPositions.current = new Array(trailLength).fill(null).map(() => ({ x: 0, y: 0, age: 0 }));
    rightTrailPositions.current = new Array(trailLength).fill(null).map(() => ({ x: 0, y: 0, age: 0 }));
  }, [trailLength]);
  
  // Create separate geometries for each hand (not cloned - independent buffers)
  const leftGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(trailLength * 3);
    const sizes = new Float32Array(trailLength);
    
    for (let i = 0; i < trailLength; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0; // Initialize with size 0 to hide particles until hand is detected
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [trailLength]);
  
  const rightGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(trailLength * 3);
    const sizes = new Float32Array(trailLength);
    
    for (let i = 0; i < trailLength; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0; // Initialize with size 0 to hide particles until hand is detected
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [trailLength]);
  
  // Create separate materials for each hand (not cloned - independent instances)
  const leftMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 500,
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity, particleSize]);
  
  const rightMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 500,
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity, particleSize]);
  
  // Reset materials and geometries when effect is re-enabled
  useEffect(() => {
    if (leftMaterial && rightMaterial && leftGeometry && rightGeometry) {
      // Reset material opacity to base intensity
      leftMaterial.opacity = intensity;
      rightMaterial.opacity = intensity;
      
      // Reset all particle sizes to 0
      const leftSizes = leftGeometry.getAttribute('size').array;
      const rightSizes = rightGeometry.getAttribute('size').array;
      for (let i = 0; i < trailLength; i++) {
        leftSizes[i] = 0;
        rightSizes[i] = 0;
      }
      leftGeometry.getAttribute('size').needsUpdate = true;
      rightGeometry.getAttribute('size').needsUpdate = true;
      
      // Reset initialization flags so hands will reinitialize when detected
      leftInitialized.current = false;
      rightInitialized.current = false;
    }
  }, [leftMaterial, rightMaterial, leftGeometry, rightGeometry, intensity, trailLength]);
  
  // Update hand positions and trail
  const updateTrail = (handPos, trailPositions, lastPosition, smoothedPosition, particlesRef, initializedRef) => {
    if (!particlesRef.current) return;
    
    // If hand not detected, fade out all particles quickly and completely
    if (!handPos || handPos.visibility < 0.01) {
      const sizes = particlesRef.current.geometry.attributes.size.array;
      for (let i = 0; i < sizes.length; i++) {
        sizes[i] *= 0.85; // Faster fade (was 0.9)
      }
      particlesRef.current.geometry.attributes.size.needsUpdate = true;
      
      // Fade material opacity to zero completely
      if (particlesRef.current.material) {
        particlesRef.current.material.opacity *= 0.85; // Fade to 0 (removed minimum)
      }
      return;
    }
    
    // handPos is now in scene coordinates from handTracking.js
    // No transformation needed - already in SimpleSkeleton coordinate system
    const x = handPos.x;
    const y = handPos.y;
    
    // Initialize or reinitialize when:
    // 1. Never initialized before (!initializedRef.current)
    // 2. Opacity faded below threshold (hand disappeared and came back)
    const needsReinit = !initializedRef.current || 
                        (particlesRef.current.material && particlesRef.current.material.opacity < 0.1);
    
    if (needsReinit) {
      smoothedPosition.current.x = x;
      smoothedPosition.current.y = y;
      initializedRef.current = true; // Mark as initialized
      // Restore full opacity when hand appears/reappears
      if (particlesRef.current.material) {
        particlesRef.current.material.opacity = intensity;
      }
    }
    
    // Smooth the position with configurable smoothness
    // Use exponential moving average for smoother transitions
    smoothedPosition.current.x = smoothedPosition.current.x * (1 - smoothness) + x * smoothness;
    smoothedPosition.current.y = smoothedPosition.current.y * (1 - smoothness) + y * smoothness;
    
    // Shift trail positions
    for (let i = trailPositions.current.length - 1; i > 0; i--) {
      trailPositions.current[i] = { ...trailPositions.current[i - 1] };
    }
    trailPositions.current[0] = { 
      x: smoothedPosition.current.x, 
      y: smoothedPosition.current.y, 
      age: 0 
    };
    
    lastPosition.current = { x: smoothedPosition.current.x, y: smoothedPosition.current.y };
    
    // Update geometry
    const energy = (music?.energy ?? 0) * params.musicReact;
    const positions = particlesRef.current.geometry.attributes.position.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < trailPositions.current.length; i++) {
      const pos = trailPositions.current[i];
      
      // Interpolate position with next particle for smoother transitions
      let interpolatedX = pos.x;
      let interpolatedY = pos.y;
      
      if (i < trailPositions.current.length - 1) {
        const nextPos = trailPositions.current[i + 1];
        interpolatedX = pos.x * (1 - POSITION_BLEND_FACTOR) + nextPos.x * POSITION_BLEND_FACTOR;
        interpolatedY = pos.y * (1 - POSITION_BLEND_FACTOR) + nextPos.y * POSITION_BLEND_FACTOR;
      }
      
      // Combine exponential fade with smoothed linear fade for gradual disappearance
      const linearFade = 1 - i / trailLength;
      const expFade = Math.pow(fadeSpeed, i);
      
      // Use cubic easing for even smoother fade (slower start, faster end)
      const cubicFade = Math.pow(linearFade, 3);
      
      // Blend between cubic and exponential for best visual result
      const combinedFade = cubicFade * CUBIC_FADE_WEIGHT + expFade * EXP_FADE_WEIGHT;
      
      positions[i * 3] = interpolatedX;
      positions[i * 3 + 1] = interpolatedY;
      // Smoother z-spacing with slight curve for depth perception
      positions[i * 3 + 2] = -i * Z_SPACING * (1 + linearFade * DEPTH_CURVE_FACTOR) + energy * 5;
      
      // Smooth size transition with combined fade - very large initial size
      sizes[i] = particleSize * 500 * combinedFade * (1 + energy * 0.2);
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Update material opacity
    if (particlesRef.current.material) {
      particlesRef.current.material.opacity = intensity * (1 + energy * 0.3);
    }
  };
  
  useFrame(() => {
    const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
    const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
    
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      updateTrail(leftHandPos, leftTrailPositions, leftLastPosition, leftSmoothedPosition, leftParticlesRef, leftInitialized);
    }
    
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateTrail(rightHandPos, rightTrailPositions, rightLastPosition, rightSmoothedPosition, rightParticlesRef, rightInitialized);
    }
  });
  
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  // Early return if no hands are enabled
  if (!leftHandEnabled && !rightHandEnabled) {
    return null;
  }
  
  return (
    <>
      {leftHandEnabled && (
        <points key="left-hand-particles" ref={leftParticlesRef} geometry={leftGeometry} material={leftMaterial} position={[0, 0, 10]} renderOrder={100} />
      )}
      {rightHandEnabled && (
        <points key="right-hand-particles" ref={rightParticlesRef} geometry={rightGeometry} material={rightMaterial} position={[0, 0, 10.1]} renderOrder={100} />
      )}
    </>
  );
};

export default HandParticleTrailEffect;
