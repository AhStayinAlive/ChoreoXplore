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
  const leftLastPosition = useRef({ x: 0.5, y: 0.5 });
  const rightLastPosition = useRef({ x: 0.5, y: 0.5 });
  const leftSmoothedPosition = useRef({ x: 0.5, y: 0.5 });
  const rightSmoothedPosition = useRef({ x: 0.5, y: 0.5 });
  
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
    leftTrailPositions.current = new Array(trailLength).fill(null).map(() => ({ x: 0.5, y: 0.5, age: 0 }));
    rightTrailPositions.current = new Array(trailLength).fill(null).map(() => ({ x: 0.5, y: 0.5, age: 0 }));
  }, [trailLength]);
  
  // Create geometry for particles
  const createGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(trailLength * 3);
    const sizes = new Float32Array(trailLength);
    
    for (let i = 0; i < trailLength; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      // Initialize with size 0 to hide particles until hand is detected
      sizes[i] = 0;
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [trailLength, particleSize]);
  
  // Create material
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 500, // Very large initial size for visibility
      transparent: true,
      opacity: intensity, // Start with configured intensity
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity, particleSize]);
  
  // Clone geometry and material for second hand
  const leftGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const rightGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const leftMaterial = useMemo(() => material.clone(), [material]);
  const rightMaterial = useMemo(() => material.clone(), [material]);
  
  // Update hand positions and trail
  const updateTrail = (handPos, trailPositions, lastPosition, smoothedPosition, particlesRef) => {
    if (!particlesRef.current) return;
    
    // If hand not detected, fade out all particles
    if (!handPos || handPos.visibility < 0.3) {
      const sizes = particlesRef.current.geometry.attributes.size.array;
      for (let i = 0; i < sizes.length; i++) {
        sizes[i] *= 0.9; // Fade out existing particles
      }
      particlesRef.current.geometry.attributes.size.needsUpdate = true;
      
      // Also fade material opacity
      if (particlesRef.current.material) {
        particlesRef.current.material.opacity *= 0.9;
      }
      return;
    }
    
    // Use SimpleSkeleton's coordinate system (scale 38, plane 20000x20000) - same as HandSmokeEffect
    const scale = 38; // Match SimpleSkeleton and other effects
    const x = (handPos.x - 0.5) * 200 * scale;
    const y = (0.5 - handPos.y) * 200 * scale;
    
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
      updateTrail(leftHandPos, leftTrailPositions, leftLastPosition, leftSmoothedPosition, leftParticlesRef);
    }
    
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateTrail(rightHandPos, rightTrailPositions, rightLastPosition, rightSmoothedPosition, rightParticlesRef);
    }
  });
  
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  return (
    <>
      {leftHandEnabled && (
        <points ref={leftParticlesRef} geometry={leftGeometry} material={leftMaterial} position={[0, 0, 10]} renderOrder={100} />
      )}
      {rightHandEnabled && (
        <points ref={rightParticlesRef} geometry={rightGeometry} material={rightMaterial} position={[0, 0, 10]} renderOrder={100} />
      )}
    </>
  );
};

export default HandParticleTrailEffect;
