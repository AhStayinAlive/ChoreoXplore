import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import { getLeftHandPosition, getRightHandPosition } from '../utils/handTracking';

const HandParticleTrailEffect = () => {
  const leftParticlesRef = useRef();
  const rightParticlesRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const handSelection = handEffect?.handSelection || 'none';
  const particleSettings = handEffect?.particleTrail || {};
  
  // Separate trail state for each hand
  const leftTrailPositions = useRef([]);
  const rightTrailPositions = useRef([]);
  const leftLastPosition = useRef({ x: 0.5, y: 0.5 });
  const rightLastPosition = useRef({ x: 0.5, y: 0.5 });
  const leftSmoothedPosition = useRef({ x: 0.5, y: 0.5 });
  const rightSmoothedPosition = useRef({ x: 0.5, y: 0.5 });
  
  const trailLength = Math.floor(particleSettings.trailLength || 50);
  const particleSize = particleSettings.particleSize || 0.15;
  const color = particleSettings.color || '#00ffff';
  const intensity = particleSettings.intensity || 0.8;
  const fadeSpeed = particleSettings.fadeSpeed || 0.95;
  
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
      sizes[i] = particleSize * (1 - i / trailLength);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [trailLength, particleSize]);
  
  // Create material
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 1.5,
      transparent: true,
      opacity: intensity,
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
    if (!handPos || handPos.visibility < 0.3 || !particlesRef.current) return;
    
    // Convert MediaPipe coords to SimpleSkeleton coordinate system
    const scale = 22;
    const x = (handPos.x - 0.5) * 200 * scale;
    const y = (0.5 - handPos.y) * 200 * scale;
    
    // Smooth the position
    const smoothingFactor = 0.3;
    smoothedPosition.current.x = smoothedPosition.current.x * (1 - smoothingFactor) + x * smoothingFactor;
    smoothedPosition.current.y = smoothedPosition.current.y * (1 - smoothingFactor) + y * smoothingFactor;
    
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
      const fade = Math.pow(fadeSpeed, i);
      
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = -i * 0.5 + energy * 5;
      
      sizes[i] = particleSize * (1 - i / trailLength) * fade * (1 + energy * 0.2);
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
        <points ref={leftParticlesRef} geometry={leftGeometry} material={leftMaterial} />
      )}
      {rightHandEnabled && (
        <points ref={rightParticlesRef} geometry={rightGeometry} material={rightMaterial} />
      )}
    </>
  );
};

export default HandParticleTrailEffect;
