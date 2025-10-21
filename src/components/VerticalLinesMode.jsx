import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import usePoseDetection from '../hooks/usePoseDetection';
import { 
  getRightHandPosition,
  getLeftHandPosition
} from '../utils/handTracking';

const VerticalLinesMode = () => {
  const { poseData } = usePoseDetection();
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  // Configuration (raindrop mode)
  const numDrops = 1000; // denser rain
  const lineWidth = 0.08; // Thickness of lines
  const baseLineSegmentHeight = 250; // Base height of each segment (shorter drops)
  const baseFall = 400; // base fall multiplier (a bit faster)

  // World bounds (same coordinate space used elsewhere ~ +/-10000)
  const worldHalfSize = 10000;
  const minX = -worldHalfSize;
  const maxX = worldHalfSize;
  const topY = worldHalfSize;
  const bottomY = -worldHalfSize;
  
  // Hand push parameters
  const pushRadius = 0.12; // relative to 10000 space
  const pushRadiusWorld = pushRadius * 10000;
  const pushImpulse = 220; // impulse applied when near hand
  const maxXSpeed = 2000;
  const xFriction = 0.12; // per-frame fraction damped
  const homeSpring = 0.05; // pull back toward homeX
  
  // Create refs for instanced mesh and state
  const instancedMeshRef = useRef();
  const lineStates = useRef([]); // Store state for each line
  const clockRef = useRef(0);
  const tempMatrix = useRef(new THREE.Matrix4());
  
  // Smoothed audio values
  const smoothedEnergy = useRef(0);
  const smoothedRms = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Hand interaction enabled
  
  // Convert hex color to THREE.Color
  const lineColor = useMemo(() => {
    const rgb = hexToRGB(userColors.assetColor);
    // hexToRGB already returns values in 0-1 range, don't divide by 255
    return new THREE.Color(rgb.r, rgb.g, rgb.b);
  }, [userColors.assetColor]);
  
  // Create shared geometry and material for instanced mesh
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(lineWidth * 200, baseLineSegmentHeight);
    const mat = new THREE.MeshBasicMaterial({ 
      color: lineColor.clone(),
      transparent: true,
      opacity: params.intensity || 0.8,
      side: THREE.DoubleSide
    });

    // Initialize line states
    lineStates.current = [];
    for (let i = 0; i < numDrops; i++) {
      const x = THREE.MathUtils.lerp(minX, maxX, Math.random());
      // Seed across full vertical span for a filled, continuous field
      const y = THREE.MathUtils.lerp(bottomY, topY, Math.random());
      const speed = 3.0; // Uniform speed for all raindrops

      lineStates.current[i] = {
        homeX: x,
        x,
        y,
        speed,
        vx: 0
      };
    }

    return { geometry: geo, material: mat };
  }, [numDrops, lineWidth, baseLineSegmentHeight, lineColor, params.intensity]);
  
  // Update line positions based on music energy with hand-reactive lateral push
  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return;
    
    clockRef.current += delta;
    
    // Get raw audio features
    const energy = (music?.energy ?? 0) * params.musicReact;
    const rms = (music?.rms ?? 0) * params.musicReact;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;
    
    // Smooth audio values with lerp to prevent jarring changes
    smoothedEnergy.current = THREE.MathUtils.lerp(smoothedEnergy.current, energy, 0.25);
    smoothedRms.current = THREE.MathUtils.lerp(smoothedRms.current, rms, 0.3);
    smoothedBeat.current = THREE.MathUtils.lerp(smoothedBeat.current, beat, 0.5);
    
    // Combine audio features for overall loudness
    const audioLoudness = smoothedEnergy.current + smoothedRms.current + smoothedBeat.current * 0.3;
    
    // Map audio loudness to speed multiplier (1.0x to 20.0x)
    // Quiet music = slower rain speed (1.0x)
    // Loud music = dramatically fast rain (20.0x)
    const minSpeed = 1.0;
    const maxSpeed = 20.0;
    const speedMul = minSpeed + audioLoudness * (maxSpeed - minSpeed);
    
    const lengthMul = 1; // fixed length for simple mode

    // Hand positions (world coords)
    const scale = 22;
    const toWorld = (handPos) => {
      if (!handPos || handPos.visibility < 0.6) return null;
      const x = (handPos.x - 0.5) * 200 * scale;
      const y = (0.5 - handPos.y) * 200 * scale;
      return { x, y };
    };
    const leftHand = toWorld(getLeftHandPosition(poseData?.landmarks));
    const rightHand = toWorld(getRightHandPosition(poseData?.landmarks));

    // Update each line position
    for (let i = 0; i < numDrops; i++) {
      const state = lineStates.current[i];
      if (!state) continue;
      
      // Apply lateral impulse when near hands
      if (leftHand) {
        const dx = state.x - leftHand.x;
        const dy = state.y - leftHand.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pushRadiusWorld) {
          const s = 1 - dist / pushRadiusWorld;
          const dir = dx === 0 ? 1 : Math.sign(dx);
          state.vx += dir * pushImpulse * s;
        }
      }
      if (rightHand) {
        const dx = state.x - rightHand.x;
        const dy = state.y - rightHand.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pushRadiusWorld) {
          const s = 1 - dist / pushRadiusWorld;
          const dir = dx === 0 ? 1 : Math.sign(dx);
          state.vx += dir * pushImpulse * s;
        }
      }

      // Clamp, decay, and softly home toward spawn X
      if (state.vx > maxXSpeed) state.vx = maxXSpeed;
      if (state.vx < -maxXSpeed) state.vx = -maxXSpeed;
      state.vx *= (1 - xFriction);
      state.vx += (state.homeX - state.x) * homeSpring;
      state.x += state.vx * delta;
      if (state.x < minX) state.x = minX;
      if (state.x > maxX) state.x = maxX;

      // Fall with music-influenced speed (straight down)
      state.y -= state.speed * baseFall * speedMul * delta;
      // Wrap to top when below bottom
      if (state.y < bottomY) {
        // Keep the same X and current vx; continue from the top
        state.y += (topY - bottomY);
        // Speed remains constant for synchronized movement
      }

      // Apply position and scale using matrix
      tempMatrix.current.makeScale(1, lengthMul, 1);
      tempMatrix.current.setPosition(state.x, state.y, 0);
      instancedMeshRef.current.setMatrixAt(i, tempMatrix.current);
    }
    
    // Mark instance matrix as needing update
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    
    // Update material properties based on music loudness and user color
    if (instancedMeshRef.current.material) {
      // Opacity scales with audio loudness (0.5 → 1.0)
      // More dramatic change based on combined audio features
      const opacityBase = 0.5;
      const opacityRange = 0.5;
      const targetOpacity = opacityBase + audioLoudness * opacityRange;
      instancedMeshRef.current.material.opacity = Math.min(1.0, Math.max(0.3, targetOpacity * params.intensity));
      
      // Update color dynamically
      instancedMeshRef.current.material.color.copy(lineColor);
    }
  });
  
  return (
    <group>
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, numDrops]}
      />
    </group>
  );
};

export default VerticalLinesMode;
