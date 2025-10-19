import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import { getLeftHandPosition, getRightHandPosition } from '../utils/handTracking';

const HandSmokeEffect = ({ smokeTexture, smokeTextureInstance }) => {
  const meshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const handSelection = handEffect?.handSelection || 'none';

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

    // Add left hand point
    if (leftHandPos && leftHandPos.visibility > 0.3) {
      smokeTextureInstance.addPoint(
        { x: leftHandPos.x, y: leftHandPos.y },
        'left'
      );
    }

    // Add right hand point
    if (rightHandPos && rightHandPos.visibility > 0.3) {
      smokeTextureInstance.addPoint(
        { x: rightHandPos.x, y: rightHandPos.y },
        'right'
      );
    }

    // Update texture
    smokeTextureInstance.update();
    
    // Mark texture as needing update
    if (smokeTexture) {
      smokeTexture.needsUpdate = true;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={planeGeometry}
      material={material}
      position={[0, 0, -1]}
      rotation={[0, 0, 0]}
      renderOrder={-2}
    />
  );
};

export default HandSmokeEffect;
