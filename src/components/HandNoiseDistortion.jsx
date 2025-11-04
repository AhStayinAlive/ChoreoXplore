import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import {
  getLeftHandAnchor as getLeftHandPosition,
  getRightHandAnchor as getRightHandPosition,
  calculateHandVelocity,
  smoothHandPosition
} from '../utils/handTracking';

// Vertex shader - passes UV coordinates
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader with Perlin noise and hand distortion
const fragmentShader = `
  uniform float uTime;
  uniform vec2 uLeftHand;
  uniform vec2 uRightHand;
  uniform float uLeftVelocity;
  uniform float uRightVelocity;
  uniform bool uLeftActive;
  uniform bool uRightActive;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uIntensity;
  uniform float uDistortionStrength;
  
  varying vec2 vUv;
  
  // Perlin noise implementation
  // Based on Stefan Gustavson's noise implementation
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
  }
  
  // 3D Perlin noise
  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Calculate distortion based on hand positions
    vec2 distortion = vec2(0.0);
    float totalInfluence = 0.0;
    
    // Left hand influence
    if (uLeftActive) {
      vec2 leftDiff = uv - uLeftHand;
      float leftDist = length(leftDiff);
      float leftInfluence = 1.0 - smoothstep(0.0, 0.5, leftDist);
      float leftVelFactor = 1.0 + uLeftVelocity * 2.0;
      
      // Warp noise field around left hand
      distortion += normalize(leftDiff) * leftInfluence * leftVelFactor * uDistortionStrength;
      totalInfluence += leftInfluence;
    }
    
    // Right hand influence
    if (uRightActive) {
      vec2 rightDiff = uv - uRightHand;
      float rightDist = length(rightDiff);
      float rightInfluence = 1.0 - smoothstep(0.0, 0.5, rightDist);
      float rightVelFactor = 1.0 + uRightVelocity * 2.0;
      
      // Warp noise field around right hand
      distortion += normalize(rightDiff) * rightInfluence * rightVelFactor * uDistortionStrength;
      totalInfluence += rightInfluence;
    }
    
    // When both hands are present, blend smoothly
    if (uLeftActive && uRightActive) {
      // Average the distortion for smooth blending
      distortion *= 0.5;
    }
    
    // Apply distortion to UV coordinates
    vec2 distortedUV = uv + distortion;
    
    // Generate moving noise pattern using 3D noise with time
    vec3 noiseCoord = vec3(distortedUV * 3.0, uTime * 0.3);
    float noise = cnoise(noiseCoord);
    
    // Add second octave for more detail
    noiseCoord = vec3(distortedUV * 6.0, uTime * 0.5);
    noise += cnoise(noiseCoord) * 0.5;
    
    // Normalize noise to 0-1 range
    noise = (noise + 1.0) * 0.5;
    
    // Add hand influence to noise intensity
    noise = mix(noise, noise * (1.0 + totalInfluence), 0.5);
    
    // Blend two colors based on noise intensity
    vec3 finalColor = mix(uColor1, uColor2, noise);
    
    // Calculate alpha based on intensity and hand influence
    float alpha = uIntensity * (0.3 + totalInfluence * 0.7);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const HandNoiseDistortion = () => {
  const meshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const isActive = useVisStore(s => s.isActive);
  
  // Separate tracking state for each hand
  const leftHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
  };

  // Get noise distortion settings
  const noiseSettings = handEffect?.noiseDistortion || {};
  const color1 = noiseSettings.color1 || '#00ffff';
  const color2 = noiseSettings.color2 || '#ff00ff';
  const intensity = noiseSettings.intensity !== undefined ? noiseSettings.intensity : 0.8;
  const distortionStrength = noiseSettings.distortionStrength !== undefined ? noiseSettings.distortionStrength : 0.2;

  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLeftHand: { value: new THREE.Vector2(0.5, 0.5) },
        uRightHand: { value: new THREE.Vector2(0.5, 0.5) },
        uLeftVelocity: { value: 0 },
        uRightVelocity: { value: 0 },
        uLeftActive: { value: false },
        uRightActive: { value: false },
        uColor1: { value: new THREE.Color(color1) },
        uColor2: { value: new THREE.Color(color2) },
        uIntensity: { value: intensity },
        uDistortionStrength: { value: distortionStrength }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color1, color2, intensity, distortionStrength]);

  // Update hand tracking
  const updateHandTracking = useCallback((handRefs, currentHandPos, delta) => {
    if (currentHandPos && currentHandPos.visibility > 0.3) {
      // Smooth hand position
      const smoothedPos = smoothHandPosition(currentHandPos, handRefs.smoothedPosition.current, 0.15);
      handRefs.smoothedPosition.current = smoothedPos;
      
      // Calculate velocity
      const velocity = calculateHandVelocity(smoothedPos, handRefs.lastPosition.current, delta);
      handRefs.velocity.current = velocity;
      
      // Store current position for next frame
      handRefs.lastPosition.current = smoothedPos;
      
      return { position: smoothedPos, velocity, active: true };
    }
    
    return { position: handRefs.smoothedPosition.current, velocity: 0, active: false };
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Update time uniform
    meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;

    // Update left hand
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      const leftData = updateHandTracking(leftHandRefs, leftHandPos, delta);
      
      meshRef.current.material.uniforms.uLeftHand.value.set(leftData.position.x, leftData.position.y);
      meshRef.current.material.uniforms.uLeftVelocity.value = leftData.velocity;
      meshRef.current.material.uniforms.uLeftActive.value = leftData.active;
    } else {
      meshRef.current.material.uniforms.uLeftActive.value = false;
    }

    // Update right hand
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      const rightData = updateHandTracking(rightHandRefs, rightHandPos, delta);
      
      meshRef.current.material.uniforms.uRightHand.value.set(rightData.position.x, rightData.position.y);
      meshRef.current.material.uniforms.uRightVelocity.value = rightData.velocity;
      meshRef.current.material.uniforms.uRightActive.value = rightData.active;
    } else {
      meshRef.current.material.uniforms.uRightActive.value = false;
    }

    // Update color and intensity uniforms
    meshRef.current.material.uniforms.uColor1.value.set(color1);
    meshRef.current.material.uniforms.uColor2.value.set(color2);
    meshRef.current.material.uniforms.uIntensity.value = intensity;
    meshRef.current.material.uniforms.uDistortionStrength.value = distortionStrength;
  });

  // Don't render if no hands are enabled or ChoreoXplore is not active
  if ((!leftHandEnabled && !rightHandEnabled) || !isActive) {
    return null;
  }

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export default HandNoiseDistortion;
