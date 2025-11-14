import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import * as THREE from 'three';
import { 
  handRippleVertexShader, 
  handRippleFragmentShader, 
  handRippleUniforms 
} from '../shaders/handRippleShader';
import { 
  getRightHandAnchor as getRightHandPosition,
  getLeftHandAnchor as getLeftHandPosition,
  calculateHandVelocity, 
  smoothHandPosition,
  calculateRippleParams 
} from '../utils/handTracking';

const HandFluidEffect = ({ fluidTexture, fluidCanvas }) => {
  const leftMeshRef = useRef();
  const rightMeshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const inverseHands = useStore(s => s.inverseHands);
  const isActive = useVisStore(s => s.isActive);
  
  // Separate tracking state for each hand
  const leftHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0)
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0)
  };

  const timeRef = useRef(0);

  // Get hand ripple settings - read directly from store (defaults are set in useVisStore and overridden by themeToStore)
  const rippleSettings = handEffect?.ripple || {};
  
  // Extract individual values for proper dependency tracking (like particle trail does)
  const baseColor = rippleSettings.baseColor || '#00ccff';
  const rippleColor = rippleSettings.rippleColor || '#ff00cc';
  const radius = rippleSettings.radius ?? 0.1;
  const intensity = rippleSettings.intensity ?? 0.8;

  const handSelection = handEffect?.handSelection || 'none';

  // Create shader materials for each hand
  const createShaderMaterial = useCallback((settings) => {
    // Convert hex colors to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ] : [0, 0, 0];
    };

    const uniforms = {
      ...handRippleUniforms,
      uTexture: { value: null },
      uHandPosition: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleStrength: { value: 0.5 },
      uTime: { value: 0.0 },
      uRippleRadius: { value: radius },
      uBaseColor: { value: new THREE.Vector3(...hexToRgb(baseColor)) },
      uRippleColor: { value: new THREE.Vector3(...hexToRgb(rippleColor)) }
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: handRippleVertexShader,
      fragmentShader: handRippleFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [baseColor, rippleColor, radius]); // Use extracted values as dependencies

  const shaderMaterials = {
    left: useMemo(() => createShaderMaterial(rippleSettings), [createShaderMaterial]),
    right: useMemo(() => createShaderMaterial(rippleSettings), [createShaderMaterial])
  };

  // Create plane geometry with high vertex density for smooth distortion
  const planeGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(20000, 20000, 100, 100); // Much larger to fill viewport with 0.1 zoom
  }, []);

  // Set texture when available
  useEffect(() => {
    if (fluidTexture) {
      shaderMaterials.left.uniforms.uTexture.value = fluidTexture;
      shaderMaterials.right.uniforms.uTexture.value = fluidTexture;
    }
  }, [fluidTexture, shaderMaterials]);

  // Helper function to update hand ripple
  const updateHandRipple = useCallback((currentHandPos, handRefs, material, delta) => {
    if (currentHandPos) {
      // Smooth hand position to reduce jitter
      const smoothedPos = smoothHandPosition(currentHandPos, handRefs.smoothedPosition.current, 0.6);
      handRefs.smoothedPosition.current = smoothedPos;
      
      // Calculate hand velocity for ripple strength
      const velocity = calculateHandVelocity(smoothedPos, handRefs.lastPosition.current, delta);
      handRefs.velocity.current = velocity;
      
      // Calculate ripple parameters
      const rippleParams = calculateRippleParams(smoothedPos, velocity, currentHandPos.visibility);
      
          // Use SimpleSkeleton's coordinate system (NOT mirrored)
          const scale = 38; // Match SimpleSkeleton default
          const x = (smoothedPos.x - 0.5) * 200 * scale; // Normal X coordinate
          const y = (0.5 - smoothedPos.y) * 200 * scale;

          // Convert to UV coordinates (0-1 range) for the 20000x20000 plane
          const shaderX = (x / 20000) + 0.5;
          const shaderY = (y / 20000) + 0.5;
      
      // Use slider values directly, modulated by velocity and visibility
  const velocityMultiplier = 1.0 + velocity * 0.5; // 1.0 to 1.5x based on movement
  // Normalize strength to be identical across hands regardless of landmark visibility
  // Visibility already gates detection above; when a hand is present, use fixed intensity
  const visibilityMultiplier = 1.0;

      // Update shader uniforms
      material.uniforms.uHandPosition.value.set(shaderX, shaderY);
      material.uniforms.uRippleStrength.value = intensity * visibilityMultiplier;
      material.uniforms.uRippleRadius.value = radius * velocityMultiplier;
      
      // Store current position for next frame
      handRefs.lastPosition.current = smoothedPos;
    } else {
      // No hand detected - set ripple strength to 0 to hide the effect
      material.uniforms.uRippleStrength.value = 0;
    }
  }, [intensity, radius]); // Use extracted values as dependencies

  // Update shader uniforms each frame
  useFrame((state, delta) => {
    timeRef.current += delta * 1000;
    
    // Update time uniform for both materials
    shaderMaterials.left.uniforms.uTime.value = timeRef.current * 0.001;
    shaderMaterials.right.uniforms.uTime.value = timeRef.current * 0.001;
    
    // Update texture if canvas is available
    if (fluidTexture && fluidCanvas) {
      fluidTexture.needsUpdate = true;
    }
    
    const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
    const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
    
    // Update left hand if enabled
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      updateHandRipple(leftHandPos, leftHandRefs, shaderMaterials.left, delta);
    } else {
      // Disable ripple when hand not enabled
      shaderMaterials.left.uniforms.uRippleStrength.value = 0;
    }
    
    // Update right hand if enabled
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateHandRipple(rightHandPos, rightHandRefs, shaderMaterials.right, delta);
    } else {
      // Disable ripple when hand not enabled
      shaderMaterials.right.uniforms.uRippleStrength.value = 0;
    }
  });

  // Don't render if no hands are enabled or ChoreoXplore is not active
  if (handSelection === 'none' || !isActive) {
    return null;
  }

  return (
    <>
      <mesh 
        ref={leftMeshRef}
        geometry={planeGeometry}
        material={shaderMaterials.left}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        renderOrder={100}
      />
      
      <mesh 
        ref={rightMeshRef}
        geometry={planeGeometry}
        material={shaderMaterials.right}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        renderOrder={100}
      />
    </>
  );
};

export default HandFluidEffect;
