import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import {
  getLeftHandAnchor as getLeftHandPosition,
  getRightHandAnchor as getRightHandPosition
} from '../utils/handTracking';

// Vertex shader with Perlin noise for lightning distortion
const vertexShader = `
  uniform float uTime;
  uniform vec2 uLeftHand;
  uniform vec2 uRightHand;
  uniform float uIntensity;
  uniform float uNoiseScale;
  uniform float uAmplitude;
  uniform bool uLeftHandVisible;
  uniform bool uRightHandVisible;
  uniform bool uBothHandsMode;
  
  varying vec2 vUv;
  varying float vDistanceFactor;
  varying float vSegmentPosition;
  varying float vAlpha;
  
  // Perlin noise implementation (3D)
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
    // Noise amplitude scaling factor (increases range to approximately [-2.2, 2.2])
    const float NOISE_SCALE = 2.2;
    return NOISE_SCALE * n_xyz;
  }
  
  void main() {
    vUv = uv;
    vSegmentPosition = uv.x; // Store segment position (0-1 along the line)
    vAlpha = 1.0; // Default alpha
    
    // Determine line endpoints based on hand visibility
    vec3 startPos, endPos;
    
    if (uBothHandsMode && uLeftHandVisible && uRightHandVisible) {
      // Both hands visible: connect them
      startPos = vec3(uLeftHand.x, uLeftHand.y, 0.0);
      endPos = vec3(uRightHand.x, uRightHand.y, 0.0);
    } else {
      // One or no hands visible: connect to edges
      // Use line index (position.z) to determine which edge to connect to
      float lineIndex = position.z;
      float edgeSelector = fract(lineIndex * 0.37); // Pseudo-random edge selection
      
      // Define edge positions (scattered around screen edges)
      vec2 edgePos;
      if (edgeSelector < 0.25) {
        // Left edge
        edgePos = vec2(0.0, fract(lineIndex * 0.61) * 0.6 + 0.2);
      } else if (edgeSelector < 0.5) {
        // Right edge
        edgePos = vec2(1.0, fract(lineIndex * 0.73) * 0.6 + 0.2);
      } else if (edgeSelector < 0.75) {
        // Top edge
        edgePos = vec2(fract(lineIndex * 0.83) * 0.6 + 0.2, 1.0);
      } else {
        // Bottom edge
        edgePos = vec2(fract(lineIndex * 0.97) * 0.6 + 0.2, 0.0);
      }
      
      if (uLeftHandVisible) {
        startPos = vec3(uLeftHand.x, uLeftHand.y, 0.0);
        endPos = vec3(edgePos.x, edgePos.y, 0.0);
      } else if (uRightHandVisible) {
        startPos = vec3(uRightHand.x, uRightHand.y, 0.0);
        endPos = vec3(edgePos.x, edgePos.y, 0.0);
      } else {
        // No hands visible, don't render
        vAlpha = 0.0;
        startPos = vec3(0.5, 0.5, 0.0);
        endPos = vec3(0.5, 0.5, 0.0);
      }
    }
    
    vec3 basePosition = mix(startPos, endPos, uv.x);
    
    // Calculate distance for intensity
    float handDistance = distance(startPos.xy, endPos.xy);
    vDistanceFactor = 1.0 - smoothstep(0.0, 1.5, handDistance); // Adjusted for edge connections
    
    // Apply noise-based distortion to create organic, wavy lightning effect
    // Use different noise coordinates per segment to create unique waves
    const float LINE_VARIATION_FACTOR = 0.5; // Controls how different each line looks
    float noiseOffset = position.z * LINE_VARIATION_FACTOR; // Use z as line index offset
    vec3 noiseCoord = vec3(
      basePosition.xy * uNoiseScale + noiseOffset,
      uTime * 0.5
    );
    
    // Multi-octave noise for more detail
    float noise1 = cnoise(noiseCoord);
    float noise2 = cnoise(noiseCoord * 2.0 + vec3(100.0, 100.0, 0.0)) * 0.5;
    float noise3 = cnoise(noiseCoord * 4.0 + vec3(200.0, 200.0, 0.0)) * 0.25;
    float totalNoise = noise1 + noise2 + noise3;
    
    // Create perpendicular offset for lightning effect
    vec2 direction = normalize(endPos.xy - startPos.xy);
    vec2 perpendicular = vec2(-direction.y, direction.x);
    
    // Apply noise to create wavy, electrical movement
    vec2 offset = perpendicular * totalNoise * uAmplitude * uIntensity;
    
    // Add flickering/jitter effect
    float flicker = cnoise(vec3(uv.x * 10.0 + noiseOffset, uTime * 8.0, 0.0));
    offset += perpendicular * flicker * uAmplitude * 0.2 * uIntensity;
    
    // Apply the offset to the base position
    vec3 finalPosition = vec3(basePosition.xy + offset, basePosition.z);
    
    // Convert from normalized coordinates (0-1) to world space
    // Use same scale as other effects (19500 width to match Lines1D_Irina viewport)
    const float WORLD_SCALE = 19500.0;
    finalPosition.xy = (finalPosition.xy - 0.5) * WORLD_SCALE;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
  }
`;

// Fragment shader for glow and color blending
const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColorNear;
  uniform vec3 uColorFar;
  uniform float uSparkleIntensity;
  
  varying vec2 vUv;
  varying float vDistanceFactor;
  varying float vSegmentPosition;
  varying float vAlpha;
  
  // Simple noise for brightness pulsing
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }
  
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }
  
  void main() {
    // Distance-based color blending
    vec3 baseColor = mix(uColorFar, uColorNear, vDistanceFactor);
    
    // Add noise-based brightness variation for electrical flicker
    float brightnessNoise = noise(vSegmentPosition * 10.0 + uTime * 5.0);
    float flicker = 0.7 + brightnessNoise * 0.3;
    
    // Center glow effect - brighter in the middle of the line
    float centerGlow = 1.0 - abs(vSegmentPosition - 0.5) * 2.0;
    centerGlow = pow(centerGlow, 2.0); // Sharpen the glow
    
    // Distance-based intensity - brighter when hands are closer
    float intensityFactor = vDistanceFactor * uIntensity;
    
    // Sparkle effect when hands are very close
    const float SPARKLE_THRESHOLD = 0.8; // Distance factor threshold for sparkle activation
    float sparkle = 0.0;
    if (vDistanceFactor > SPARKLE_THRESHOLD) {
      sparkle = sin(uTime * 10.0) * 0.5 + 0.5;
      sparkle *= pow(vDistanceFactor - SPARKLE_THRESHOLD, 2.0) * 5.0; // Exponential burst
      sparkle *= uSparkleIntensity;
    }
    
    // Combine all effects
    vec3 finalColor = baseColor * flicker * (1.0 + centerGlow + sparkle);
    float alpha = intensityFactor * (0.5 + centerGlow * 0.5 + sparkle) * vAlpha;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const HandEnergyLines = () => {
  const groupRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const isActive = useVisStore(s => s.isActive);
  
  // Get energy lines settings with defaults
  const energySettings = handEffect?.energyLines || {};
  const colorNear = energySettings.colorNear || '#00ffff';
  const colorFar = energySettings.colorFar || '#ff00ff';
  const lineCount = energySettings.lineCount || 5;
  const intensity = energySettings.intensity !== undefined ? energySettings.intensity : 0.4;
  const noiseScale = energySettings.noiseScale || 3.0;
  const amplitude = energySettings.amplitude !== undefined ? energySettings.amplitude : 0.0;
  const sparkleIntensity = energySettings.sparkleIntensity !== undefined ? energySettings.sparkleIntensity : 1.0;

  const handSelection = handEffect?.handSelection || 'none';
  
  // Get hand positions from pose detection
  const leftHandPos = getLeftHandPosition(poseData?.landmarks);
  const rightHandPos = getRightHandPosition(poseData?.landmarks);
  
  // Check hand visibility
  const leftHandVisible = leftHandPos?.visibility > 0.3;
  const rightHandVisible = rightHandPos?.visibility > 0.3;
  
  // Convert hand positions to shader UV coordinates (matching HandNoiseDistortion approach)
  const convertToShaderCoords = (handPos, fallbackX, fallbackY) => {
    if (handPos?.visibility > 0.3) {
      // Convert to SimpleSkeleton coordinate system
      const scale = 22; // Match SimpleSkeleton default
      const x = (handPos.x - 0.5) * 200 * scale;
      const y = (0.5 - handPos.y) * 200 * scale; // Invert Y axis
      
      // Convert to UV coordinates (0-1 range) for 19500-width viewport
      const shaderX = (x / 19500) + 0.5;
      const shaderY = (y / 19500) + 0.5;
      
      return { x: shaderX, y: shaderY };
    }
    return { x: fallbackX, y: fallbackY };
  };
  
  const leftHand = convertToShaderCoords(leftHandPos, 0.3, 0.5);
  const rightHand = convertToShaderCoords(rightHandPos, 0.7, 0.6);
  
  // Determine if we're in "both hands" mode
  const bothHandsMode = handSelection === 'both';
  
  // Calculate number of segments per line for smooth curves
  const segmentsPerLine = 64;
  
  // Create geometry for all energy lines using instanced line segments
  const geometry = useMemo(() => {
    const positions = [];
    const uvs = [];
    
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      for (let i = 0; i < segmentsPerLine; i++) {
        const t = i / (segmentsPerLine - 1);
        
        // Position in normalized space (will be transformed in shader)
        positions.push(t, 0, lineIndex); // x = progress, y = offset, z = line index
        uvs.push(t, 0);
      }
    }
    
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    // Create line segments indices
    const indices = [];
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const offset = lineIndex * segmentsPerLine;
      for (let i = 0; i < segmentsPerLine - 1; i++) {
        indices.push(offset + i, offset + i + 1);
      }
    }
    geom.setIndex(indices);
    
    return geom;
  }, [lineCount, segmentsPerLine]);
  
  // Create shader material with uniforms
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLeftHand: { value: new THREE.Vector2(leftHand.x, leftHand.y) },
        uRightHand: { value: new THREE.Vector2(rightHand.x, rightHand.y) },
        uIntensity: { value: intensity },
        uColorNear: { value: new THREE.Color(colorNear) },
        uColorFar: { value: new THREE.Color(colorFar) },
        uNoiseScale: { value: noiseScale },
        uAmplitude: { value: amplitude },
        uSparkleIntensity: { value: sparkleIntensity },
        uLeftHandVisible: { value: leftHandVisible },
        uRightHandVisible: { value: rightHandVisible },
        uBothHandsMode: { value: bothHandsMode }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // Note: linewidth is not supported in most WebGL contexts (ANGLE on Windows, most mobile)
      // For consistent line thickness across platforms, consider using instanced geometry
      // with cylindrical segments or billboarded quads in future iterations
      linewidth: 2,
    });
  }, [leftHand.x, leftHand.y, rightHand.x, rightHand.y, colorNear, colorFar, intensity, noiseScale, amplitude, sparkleIntensity, leftHandVisible, rightHandVisible, bothHandsMode]);
  
  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Update uniforms
    const mat = groupRef.current.material;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uLeftHand.value.set(leftHand.x, leftHand.y);
    mat.uniforms.uRightHand.value.set(rightHand.x, rightHand.y);
    mat.uniforms.uIntensity.value = intensity;
    mat.uniforms.uColorNear.value.set(colorNear);
    mat.uniforms.uColorFar.value.set(colorFar);
    mat.uniforms.uNoiseScale.value = noiseScale;
    mat.uniforms.uAmplitude.value = amplitude;
    mat.uniforms.uSparkleIntensity.value = sparkleIntensity;
    mat.uniforms.uLeftHandVisible.value = leftHandVisible;
    mat.uniforms.uRightHandVisible.value = rightHandVisible;
    mat.uniforms.uBothHandsMode.value = bothHandsMode;
  });
  
  // Don't render if ChoreoXplore is not active
  if (!isActive) {
    return null;
  }
  
  // Render when at least one hand is visible or when "both" is selected
  const shouldRender = handSelection === 'both' || handSelection === 'left' || handSelection === 'right';
  if (!shouldRender) {
    return null;
  }
  
  return (
    <lineSegments ref={groupRef} geometry={geometry} material={material} position={[0, 0, 2]} />
  );
};

export default HandEnergyLines;
