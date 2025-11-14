import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import useStore from '../core/store';
import { getLeftHandAnchor as getLeftHandPosition, getRightHandAnchor as getRightHandPosition } from '../utils/handTracking';

const HandSmokeEffect = ({ smokeTexture, smokeTextureInstance }) => {
  const meshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const inverseHands = useStore(s => s.inverseHands);
  const handSelection = handEffect?.handSelection || 'none';
  const smokeSettings = handEffect?.smoke || {};
  
  // Extract individual values for proper dependency tracking (like particle trail does)
  const smokeColor = smokeSettings.color || '#ffffff';
  const smokeIntensity = smokeSettings.intensity ?? 0.7;
  const smokeRadius = smokeSettings.radius ?? 0.8;
  const smokeVelocitySensitivity = smokeSettings.velocitySensitivity ?? 1.0;
  const smokeTrailLength = smokeSettings.trailLength ?? 0.5;
  
  const [hasParticles, setHasParticles] = useState(false);

  // Update smoke texture settings when they change (like ripple effect does with uniforms)
  useEffect(() => {
    if (smokeTextureInstance) {
      smokeTextureInstance.updateSettings({
        intensity: smokeIntensity,
        radiusMultiplier: smokeRadius,
        velocitySensitivity: smokeVelocitySensitivity,
        color: smokeColor,
        trailLength: smokeTrailLength
      });
    }
  }, [smokeColor, smokeIntensity, smokeRadius, smokeVelocitySensitivity, smokeTrailLength, smokeTextureInstance]); // Use extracted values

  // Create plane geometry (same size as ripple effect)
  const planeGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(20000, 20000, 1, 1);
  }, []);

  // Create material with smoke texture
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [smokeTexture]);

  // Update material map when texture changes
  React.useEffect(() => {
    if (smokeTexture && material) {
      material.map = smokeTexture;
      material.needsUpdate = true;
    }
  }, [smokeTexture, material]);

  // Update texture with hand positions each frame
  useFrame(() => {
    if (!smokeTextureInstance) return;

    const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
    const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
    
    const leftHandPos = leftHandEnabled ? getLeftHandPosition(poseData?.landmarks) : null;
    const rightHandPos = rightHandEnabled ? getRightHandPosition(poseData?.landmarks) : null;

    // Helper to convert MediaPipe coords to match SimpleSkeleton coordinate system (MIRRORED)
    const transformHandCoords = (handPos) => {
      // Use SimpleSkeleton's coordinate system (scale 38, plane 20000x20000)
      const scale = 38; // Match SimpleSkeleton
      const x = (handPos.x - 0.5) * 200 * scale; // Normal X coordinate
      const y = (0.5 - handPos.y) * 200 * scale;
      
      // Convert to UV coordinates (0-1 range) for the canvas
      const uvX = (x / 20000) + 0.5;
      const uvY = (y / 20000) + 0.5;
      
      return { x: uvX, y: uvY };
    };

    // Add left hand point
    if (leftHandPos && leftHandPos.visibility > 0.3) {
      const transformedPos = transformHandCoords(leftHandPos);
      smokeTextureInstance.addPoint(transformedPos, 'left');
    }

    // Add right hand point
    if (rightHandPos && rightHandPos.visibility > 0.3) {
      const transformedPos = transformHandCoords(rightHandPos);
      smokeTextureInstance.addPoint(transformedPos, 'right');
    }

    // Update texture
    smokeTextureInstance.update();
    
    // Update particle state - check if there are any active particles
    const particleCount = smokeTextureInstance.points.length;
    setHasParticles(particleCount > 0);
    
    // Mark texture as needing update
    if (smokeTexture) {
      smokeTexture.needsUpdate = true;
    }
  });

  // Don't render the mesh if there are no particles
  if (!hasParticles) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={planeGeometry}
      material={material}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      renderOrder={100}
    />
  );
};

export default HandSmokeEffect;
