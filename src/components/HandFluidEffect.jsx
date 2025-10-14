import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import * as THREE from 'three';
import { 
  handRippleVertexShader, 
  handRippleFragmentShader, 
  handRippleUniforms 
} from '../shaders/handRippleShader';
import { 
  getRightHandPosition, 
  calculateHandVelocity, 
  smoothHandPosition,
  calculateRippleParams 
} from '../utils/handTracking';

const HandFluidEffect = ({ fluidTexture, fluidCanvas }) => {
  const meshRef = useRef();
  const { poseData } = usePoseDetection();
  
  // Hand tracking state
  const lastHandPositionRef = useRef({ x: 0.5, y: 0.5 });
  const smoothedHandPositionRef = useRef({ x: 0.5, y: 0.5 });
  const handVelocityRef = useRef(0);
  const timeRef = useRef(0);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    const uniforms = {
      ...handRippleUniforms,
      uTexture: { value: null },
      uHandPosition: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleStrength: { value: 0.5 }, // Start with visible strength
      uTime: { value: 0.0 },
      uRippleRadius: { value: 0.3 }
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: handRippleVertexShader,
      fragmentShader: handRippleFragmentShader,
      transparent: false, // Make opaque for testing
      side: THREE.DoubleSide
    });
  }, []);

  // Create plane geometry with high vertex density for smooth distortion
  const planeGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(20000, 20000, 100, 100); // Much larger to fill viewport with 0.1 zoom
  }, []);

  // Set texture when available
  useEffect(() => {
    if (fluidTexture) {
      shaderMaterial.uniforms.uTexture.value = fluidTexture;
    }
  }, [fluidTexture, shaderMaterial]);

  // Update shader uniforms each frame
  useFrame((state, delta) => {
    timeRef.current += delta * 1000; // Convert to milliseconds
    
    // Update time uniform
    shaderMaterial.uniforms.uTime.value = timeRef.current * 0.001;
    
    // Update texture if canvas is available
    if (fluidTexture && fluidCanvas) {
      fluidTexture.needsUpdate = true;
    }
    
    // Get current hand position using utility function
    const currentHandPos = poseData?.landmarks ? getRightHandPosition(poseData.landmarks) : null;
    
    // Debug: Log pose data occasionally
    if (poseData && Math.random() < 0.01) {
      console.log('Pose data received:', poseData.landmarks?.length, 'landmarks');
    }
    
    // Debug: Log hand position occasionally
    if (currentHandPos && Math.random() < 0.01) {
      console.log('Hand position detected:', currentHandPos);
    }
    
    if (currentHandPos) {
      // Smooth hand position to reduce jitter
      const smoothedPos = smoothHandPosition(currentHandPos, smoothedHandPositionRef.current, 0.15);
      smoothedHandPositionRef.current = smoothedPos;
      
      // Calculate hand velocity for ripple strength
      const velocity = calculateHandVelocity(smoothedPos, lastHandPositionRef.current, delta);
      handVelocityRef.current = velocity;
      
      // Calculate ripple parameters
      const rippleParams = calculateRippleParams(smoothedPos, velocity, currentHandPos.visibility);
      
      // Convert MediaPipe coordinates to visualizer coordinates
      // Use the same transformation as SimpleSkeleton and other components
      const scale = 22; // Same scale as SimpleSkeleton
      const x = (smoothedPos.x - 0.5) * 200 * scale;
      const y = (0.5 - smoothedPos.y) * 200 * scale;
      
      // Convert to UV coordinates for the shader (same as other components)
      // The plane is 20000x20000, so convert to UV space
      const shaderX = (x / 20000) + 0.5; // Convert to UV and center
      const shaderY = (y / 20000) + 0.5; // Convert to UV and center
      
      // Update shader uniforms with corrected coordinates
      shaderMaterial.uniforms.uHandPosition.value.set(shaderX, shaderY);
      shaderMaterial.uniforms.uRippleStrength.value = Math.max(rippleParams.strength, 0.8); // Much higher minimum for visibility
      shaderMaterial.uniforms.uRippleRadius.value = Math.max(rippleParams.radius, 0.4); // Larger radius
      
      // Debug: Log hand position and shader coordinates
      if (Math.random() < 0.01) {
        console.log('MediaPipe pos:', smoothedPos.x.toFixed(2), smoothedPos.y.toFixed(2));
        console.log('Transformed pos:', x.toFixed(0), y.toFixed(0));
        console.log('Shader UV pos:', shaderX.toFixed(2), shaderY.toFixed(2));
        console.log('Ripple strength:', shaderMaterial.uniforms.uRippleStrength.value.toFixed(2));
      }
      
      // Store current position for next frame
      lastHandPositionRef.current = smoothedPos;
    } else {
      // Test mode: Create a moving ripple pattern when no hand is detected
      const testX = 0.5 + Math.sin(timeRef.current * 0.001) * 0.3;
      const testY = 0.5 + Math.cos(timeRef.current * 0.0015) * 0.3;
      
      shaderMaterial.uniforms.uHandPosition.value.set(testX, testY);
      shaderMaterial.uniforms.uRippleStrength.value = 0.8; // High strength for testing
      shaderMaterial.uniforms.uRippleRadius.value = 0.4; // Large radius
      
      // Debug: Log test position
      if (Math.random() < 0.01) {
        console.log('Test mode - no hand detected, using moving pattern');
        console.log('Test pos:', testX.toFixed(2), testY.toFixed(2));
      }
    }
  });

  return (
    <>
      <mesh 
        ref={meshRef}
        geometry={planeGeometry}
        material={shaderMaterial}
        position={[0, 0, 0]} // Same plane as skeleton
        rotation={[0, 0, 0]}
        renderOrder={-1} // Render behind other elements
      />
      
      {/* Debug: Visual hand position indicator */}
      {poseData?.landmarks && (() => {
        const currentHandPos = getRightHandPosition(poseData.landmarks);
        if (currentHandPos) {
          const scale = 22;
          const x = (currentHandPos.x - 0.5) * 200 * scale;
          const y = (0.5 - currentHandPos.y) * 200 * scale;
          
          return (
            <mesh position={[x, y, 1]} renderOrder={10}>
              <sphereGeometry args={[50, 8, 8]} />
              <meshBasicMaterial color="red" transparent opacity={0.8} />
            </mesh>
          );
        }
        return null;
      })()}
    </>
  );
};

export default HandFluidEffect;
