import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import { useVisStore } from '../state/useVisStore';
import * as THREE from 'three';
import { 
  handRippleVertexShader, 
  handRippleFragmentShader, 
  handRippleUniforms 
} from '../shaders/handRippleShader';
import { 
  getRightHandPosition,
  getLeftHandPosition,
  calculateHandVelocity, 
  smoothHandPosition,
  calculateRippleParams 
} from '../utils/handTracking';

const HandFluidEffect = ({ fluidTexture, fluidCanvas }) => {
  const leftMeshRef = useRef();
  const rightMeshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
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

  // Get hand ripple settings
  const rippleSettings = handEffect?.ripple || {
    baseColor: '#00ccff',
    rippleColor: '#ff00cc',
    radius: 0.4,
    intensity: 0.8
  };

  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';

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
      uRippleRadius: { value: settings.radius },
      uBaseColor: { value: new THREE.Vector3(...hexToRgb(settings.baseColor)) },
      uRippleColor: { value: new THREE.Vector3(...hexToRgb(settings.rippleColor)) }
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
  }, []);

  const shaderMaterials = {
    left: useMemo(() => createShaderMaterial(rippleSettings), [rippleSettings, createShaderMaterial]),
    right: useMemo(() => createShaderMaterial(rippleSettings), [rippleSettings, createShaderMaterial])
  };

  // Create plane geometry with high vertex density for smooth distortion
  const planeGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(20000, 20000, 100, 100); // Much larger to fill viewport with 0.1 zoom
  }, []);

  // Update shader uniforms when settings change
  useEffect(() => {
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ] : [0, 0, 0];
    };

    // Update both materials with new settings
    shaderMaterials.left.uniforms.uBaseColor.value.set(...hexToRgb(rippleSettings.baseColor));
    shaderMaterials.left.uniforms.uRippleColor.value.set(...hexToRgb(rippleSettings.rippleColor));
    
    shaderMaterials.right.uniforms.uBaseColor.value.set(...hexToRgb(rippleSettings.baseColor));
    shaderMaterials.right.uniforms.uRippleColor.value.set(...hexToRgb(rippleSettings.rippleColor));
  }, [rippleSettings, shaderMaterials]);

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
      
          // Use SimpleSkeleton's coordinate system
          const scale = 22; // Match SimpleSkeleton default
          const x = (smoothedPos.x - 0.5) * 200 * scale;
          const y = (0.5 - smoothedPos.y) * 200 * scale;

          // Convert to UV coordinates (0-1 range) for the 20000x20000 plane
          const shaderX = (x / 20000) + 0.5;
          const shaderY = (y / 20000) + 0.5;
      
      // Use slider values directly, modulated by velocity and visibility
      const velocityMultiplier = 1.0 + velocity * 0.5; // 1.0 to 1.5x based on movement
      const visibilityMultiplier = Math.max(currentHandPos.visibility, 0.5);

      // Update shader uniforms
      material.uniforms.uHandPosition.value.set(shaderX, shaderY);
      material.uniforms.uRippleStrength.value = rippleSettings.intensity * visibilityMultiplier;
      material.uniforms.uRippleRadius.value = rippleSettings.radius * velocityMultiplier;
      
      // Store current position for next frame
      handRefs.lastPosition.current = smoothedPos;
    } else {
      // No hand detected - set ripple strength to 0 to hide the effect
      material.uniforms.uRippleStrength.value = 0;
    }
  }, [rippleSettings]);

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
    
    // Update left hand if enabled
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      updateHandRipple(leftHandPos, leftHandRefs, shaderMaterials.left, delta);
    }
    
    // Update right hand if enabled
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateHandRipple(rightHandPos, rightHandRefs, shaderMaterials.right, delta);
    }
  });

  // Don't render if no hands are enabled or ChoreoXplore is not active
  if ((!leftHandEnabled && !rightHandEnabled) || !isActive) {
    return null;
  }

  return (
    <>
      {leftHandEnabled && (
        <mesh 
          ref={leftMeshRef}
          geometry={planeGeometry}
          material={shaderMaterials.left}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          renderOrder={-1}
        />
      )}
      
      {rightHandEnabled && (
        <mesh 
          ref={rightMeshRef}
          geometry={planeGeometry}
          material={shaderMaterials.right}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          renderOrder={-1}
        />
      )}
    </>
  );
};

export default HandFluidEffect;
