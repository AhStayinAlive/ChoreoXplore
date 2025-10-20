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
  const numDrops = 650; // denser rain
  const lineWidth = 0.08; // Thickness of lines
  const baseLineSegmentHeight = 350; // Base height of each segment (shorter drops)
  const baseFall = 400; // base fall multiplier (a bit faster)

  // World bounds (same coordinate space used elsewhere ~ +/-10000)
  const worldHalfSize = 10000;
  const minX = -worldHalfSize;
  const maxX = worldHalfSize;
  const topY = worldHalfSize;
  const bottomY = -worldHalfSize;

  // Music reactivity knobs (simple)
  const speedMulFromEnergy = 3.0; // up to 3x speed at high energy
  
  // Hand push parameters
  const pushRadius = 0.12; // relative to 10000 space
  const pushRadiusWorld = pushRadius * 10000;
  const pushImpulse = 220; // impulse applied when near hand
  const maxXSpeed = 2000;
  const xFriction = 0.12; // per-frame fraction damped
  const homeSpring = 0.05; // pull back toward homeX
  
  // Create refs for each line
  const linesRef = useRef([]);
  const lineStates = useRef([]); // Store state for each line
  const clockRef = useRef(0);
  
  // Hand interaction enabled
  
  // Convert hex color to THREE.Color
  const lineColor = useMemo(() => {
    const rgb = hexToRGB(userColors.assetColor);
    // hexToRGB already returns values in 0-1 range, don't divide by 255
    return new THREE.Color(rgb.r, rgb.g, rgb.b);
  }, [userColors.assetColor]);
  
  // Create raindrop line geometries and materials (random spawn)
  const lines = useMemo(() => {
    const lineArray = [];
    // geometry/material per drop for simplicity (could be instanced later)
    for (let i = 0; i < numDrops; i++) {
      const x = THREE.MathUtils.lerp(minX, maxX, Math.random());
      // Seed across full vertical span for a filled, continuous field
      const y = THREE.MathUtils.lerp(bottomY, topY, Math.random());
      const speed = THREE.MathUtils.lerp(1.8, 3.6, Math.random()); // a little faster

      const geometry = new THREE.PlaneGeometry(lineWidth * 200, baseLineSegmentHeight);
      const material = new THREE.MeshBasicMaterial({ 
        color: lineColor.clone(),
        transparent: true,
        opacity: params.intensity || 0.8,
        side: THREE.DoubleSide
      });

      lineStates.current[i] = {
        homeX: x,
        x,
        y,
        speed,
        vx: 0
      };

      lineArray.push({
        geometry,
        material,
        index: i
      });
    }

    return lineArray;
  }, [numDrops, lineWidth, baseLineSegmentHeight, lineColor, params.intensity]);
  
  // Lerp helper
  const lerp = (start, end, alpha) => start + (end - start) * alpha;
  
  // Update line positions based on music energy with hand-reactive lateral push
  useFrame((state, delta) => {
    if (!linesRef.current || linesRef.current.length === 0) return;
    
    clockRef.current += delta;
    
    // Compute energy and derived multipliers
    const energyRaw = (params.intensity || 0) * (1 + (music.energy || 0) * 0.3);
    const energy = Math.min(1, Math.max(0, energyRaw));
    const speedMul = 1 + energy * (speedMulFromEnergy - 1);
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
    linesRef.current.forEach((mesh, i) => {
      if (!mesh || !lineStates.current[i]) return;
      
      const state = lineStates.current[i];
      
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
        // Slightly vary speed to avoid visible syncing
        state.speed = Math.max(0.1, state.speed * THREE.MathUtils.lerp(0.9, 1.1, Math.random()));
      }

      // Apply position
      mesh.position.x = state.x;
      mesh.position.y = state.y;
      // Fixed length
      mesh.scale.y = lengthMul;
    });
    
    // Update material properties based on music energy and user color
    const musicIntensity = Math.min(1, Math.max(0, (params.intensity || 0) * (1 + (music.energy || 0) * 0.3)));
    linesRef.current.forEach((mesh) => {
      if (mesh && mesh.material) {
        // Opacity scales with energy (0.6 → 1.0)
        mesh.material.opacity = Math.min(1.0, Math.max(0.0, 0.6 + 0.4 * musicIntensity));
        mesh.material.color.copy(lineColor); // Update color dynamically
      }
    });
  });
  
  return (
    <group>
      {lines.map((line, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) {
              linesRef.current[i] = el;
              // Initialize position
              const s = lineStates.current[i];
              el.position.set(s ? s.currentX : 0, s ? s.y : 0, 0);
            }
          }}
          geometry={line.geometry}
          material={line.material}
        />
      ))}
    </group>
  );
};

export default VerticalLinesMode;
