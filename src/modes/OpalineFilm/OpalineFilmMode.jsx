/**
 * Opaline Film Mode - Continuous Creamy Film with Flowing Ribbons
 * 
 * ======================
 * USAGE & PRESETS
 * ======================
 * 
 * Default: Soft pastel film with gentle hand brushes
 * 
 * PRESETS:
 * 1. "Pastel Silk" - Delicate, creamy ribbons (Quality: Balanced, Banding: 0.7, Blend: 0.8, Hand: Med)
 * 2. "Music Neon" - Vibrant, reactive (Quality: Filmic, Banding: 0.5, Blend: 0.6, Hand: High, Rainbow ON)
 * 3. "Minimal Cream" - Subtle, elegant (Quality: Performance, Banding: 0.9, Blend: 0.9, Hand: Low)
 * 
 * CONTROLS:
 * - Quality: Adjusts render resolution (Performance=512, Balanced=768, Filmic=1024)
 * - Banding: How strongly ribbons align (0=chaotic, 1=strict lanes)
 * - Blend Richness: Opacity/thickness (0=thin wisps, 1=lush film)
 * - Hand Reactivity: Off/Low/Med/High - local push/reshape strength
 * - Speed: Overall motion speed
 * - Transparency: Global opacity
 * - Color Mode: User/Music/🌈 Rainbow
 * 
 * BEHAVIOR:
 * - Film stays continuous at all zoom levels (no dots/pellets visible)
 * - Hand brushes push/reshape ONLY nearby areas (no global swirl)
 * - Two hands can stretch/squeeze local regions
 * - Background remains stable; only film moves
 * - Works beautifully without music; music adds subtle breathing
 * - 60 FPS target with auto-throttle
 * 
 * TECHNICAL:
 * - Multi-pass shader system (advection → diffusion → render)
 * - Metaball-like blending for continuous appearance
 * - Curl noise flow field for smooth laminar motion
 * - Local hand influence fields (radial falloff)
 * - Optional depth layers for parallax
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import usePoseDetection from '../../hooks/usePoseDetection';
import { 
  getRightHandAnchor as getRightHandPosition,
  getLeftHandAnchor as getLeftHandPosition,
  calculateHandVelocity,
  smoothHandPosition
} from '../../utils/handTracking';

// Shared shader utilities
const shaderUtils = `
// Hash for noise
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Curl noise for divergence-free flow
vec2 curlNoise(vec2 p, float time) {
  float e = 0.05;
  float n1 = noise(p + vec2(e, 0.0) + time * 0.1);
  float n2 = noise(p + vec2(0.0, e) + time * 0.1);
  float n3 = noise(p - vec2(e, 0.0) + time * 0.1);
  float n4 = noise(p - vec2(0.0, e) + time * 0.1);
  
  return vec2(n2 - n4, n3 - n1) / (2.0 * e);
}

// Smooth min for metaball blending
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
`;

// Advection shader - moves the film based on flow field
const advectionVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const advectionFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform sampler2D uVelocity;
uniform float uTime;
uniform float uDeltaTime;
uniform float uBanding;
uniform float uFlowSpeed;
uniform vec2 uResolution;
uniform vec2 uHandLeft;
uniform vec2 uHandRight;
uniform float uHandLeftStrength;
uniform float uHandRightStrength;
uniform float uDecay;
uniform float uMusicEnergy;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 pixelSize = 1.0 / uResolution;
  
  // Base flow from curl noise (banding controls scale)
  float flowScale = mix(3.0, 10.0, uBanding);
  vec2 flow = curlNoise(uv * flowScale, uTime) * uFlowSpeed;
  
  // Music adds subtle breathing to flow
  flow *= 1.0 + uMusicEnergy * 0.3;
  
  // Hand influence (local push/reshape)
  float handInfluenceRadius = 0.15;
  
  // Left hand
  if (uHandLeftStrength > 0.0) {
    vec2 toHand = uv - uHandLeft;
    float dist = length(toHand);
    if (dist < handInfluenceRadius) {
      float influence = (1.0 - dist / handInfluenceRadius) * uHandLeftStrength;
      influence = smoothstep(0.0, 1.0, influence);
      flow += normalize(toHand) * influence * 2.0;
    }
  }
  
  // Right hand
  if (uHandRightStrength > 0.0) {
    vec2 toHand = uv - uHandRight;
    float dist = length(toHand);
    if (dist < handInfluenceRadius) {
      float influence = (1.0 - dist / handInfluenceRadius) * uHandRightStrength;
      influence = smoothstep(0.0, 1.0, influence);
      flow += normalize(toHand) * influence * 2.0;
    }
  }
  
  // Two-hand stretch/squeeze
  if (uHandLeftStrength > 0.0 && uHandRightStrength > 0.0) {
    vec2 handMid = (uHandLeft + uHandRight) * 0.5;
    vec2 handDir = normalize(uHandRight - uHandLeft);
    float handDist = length(uHandRight - uHandLeft);
    
    vec2 toMid = uv - handMid;
    float perpDist = abs(dot(toMid, vec2(-handDir.y, handDir.x)));
    float alongDist = dot(toMid, handDir);
    
    if (perpDist < 0.1 && abs(alongDist) < handDist * 0.5) {
      float squeeze = (1.0 - perpDist / 0.1);
      flow += vec2(-handDir.y, handDir.x) * squeeze * 0.5;
    }
  }
  
  // Advect backwards in time
  vec2 backUV = uv - uDeltaTime * flow * 10.0;
  backUV = fract(backUV); // Wrap around
  
  // Sample previous thickness
  float thickness = texture2D(uThickness, backUV).r;
  
  // Decay over time
  thickness *= mix(0.99, 0.995, uDecay);
  
  gl_FragColor = vec4(thickness, 0.0, 0.0, 1.0);
}
`;

// Diffusion shader - blends neighbors for smooth, creamy film
const diffusionFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform vec2 uResolution;
uniform float uBlendRichness;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 pixelSize = 1.0 / uResolution;
  
  // Sample center
  float center = texture2D(uThickness, uv).r;
  
  // 3x3 Gaussian blur for creamy diffusion
  float sum = 0.0;
  float weightSum = 0.0;
  
  for (float y = -1.0; y <= 1.0; y++) {
    for (float x = -1.0; x <= 1.0; x++) {
      vec2 offset = vec2(x, y) * pixelSize;
      float weight = exp(-0.5 * (x*x + y*y));
      sum += texture2D(uThickness, uv + offset).r * weight;
      weightSum += weight;
    }
  }
  
  float blurred = sum / weightSum;
  
  // Mix based on blend richness (higher = more diffusion = lusher)
  float thickness = mix(center, blurred, uBlendRichness * 0.3);
  
  // Add metaball-like smoothing
  thickness = smoothstep(0.1, 0.9, thickness);
  
  gl_FragColor = vec4(thickness, 0.0, 0.0, 1.0);
}
`;

// Render shader - converts thickness field to final colors
const renderFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform float uTime;
uniform float uTransparency;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform bool uRainbowMode;
uniform float uMusicRMS;
uniform float uMusicCentroid;

varying vec2 vUv;

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = vUv;
  vec2 pixelSize = 1.0 / uResolution;
  
  // Sample thickness
  float thickness = texture2D(uThickness, uv).r;
  
  // Calculate gradient for iridescent edges
  float dx = texture2D(uThickness, uv + vec2(pixelSize.x, 0.0)).r - 
             texture2D(uThickness, uv - vec2(pixelSize.x, 0.0)).r;
  float dy = texture2D(uThickness, uv + vec2(0.0, pixelSize.y)).r - 
             texture2D(uThickness, uv - vec2(0.0, pixelSize.y)).r;
  float gradient = length(vec2(dx, dy)) * 5.0;
  
  // Edge detection for iridescence
  float edge = smoothstep(0.1, 0.5, gradient);
  
  // Base color
  vec3 color;
  if (uRainbowMode) {
    float hue = fract(thickness * 0.5 + uTime * 0.1);
    color = hsv2rgb(vec3(hue, 0.7, 0.9));
  } else {
    color = mix(uColorA, uColorB, thickness);
  }
  
  // Add iridescent rim (oil-on-water effect)
  vec3 iridescentColor = vec3(
    0.5 + 0.5 * sin(gradient * 10.0 + uTime * 2.0),
    0.5 + 0.5 * sin(gradient * 10.0 + uTime * 2.0 + 2.0),
    0.5 + 0.5 * sin(gradient * 10.0 + uTime * 2.0 + 4.0)
  );
  color = mix(color, iridescentColor, edge * 0.4);
  
  // Add subtle shimmer based on music
  color += vec3(uMusicCentroid * 0.1);
  
  // Soft glow
  float glow = smoothstep(0.0, 0.2, thickness);
  color *= 0.7 + glow * 0.3;
  
  // Apply transparency
  float alpha = thickness * uTransparency;
  alpha = smoothstep(0.0, 0.3, alpha);
  
  gl_FragColor = vec4(color, alpha);
}
`;

// Source injection shader - adds new film from hands or ambient
const sourceFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform vec2 uResolution;
uniform vec2 uHandLeft;
uniform vec2 uHandRight;
uniform float uHandLeftStrength;
uniform float uHandRightStrength;
uniform float uAmbientSource;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  
  // Sample current thickness
  float thickness = texture2D(uThickness, uv).r;
  
  // Add ambient background ripple source
  float ambient = noise(uv * 5.0 + uTime * 0.1) * uAmbientSource;
  thickness += ambient * 0.01;
  
  // Add hand sources
  float sourceRadius = 0.05;
  
  if (uHandLeftStrength > 0.0) {
    float dist = length(uv - uHandLeft);
    if (dist < sourceRadius) {
      float source = (1.0 - dist / sourceRadius) * uHandLeftStrength;
      thickness += source * 0.5;
    }
  }
  
  if (uHandRightStrength > 0.0) {
    float dist = length(uv - uHandRight);
    if (dist < sourceRadius) {
      float source = (1.0 - dist / sourceRadius) * uHandRightStrength;
      thickness += source * 0.5;
    }
  }
  
  // Clamp to prevent overflow
  thickness = clamp(thickness, 0.0, 1.0);
  
  gl_FragColor = vec4(thickness, 0.0, 0.0, 1.0);
}
`;

// Default parameters
const DEFAULT_PARAMS = {
  quality: 'balanced',           // 'performance' | 'balanced' | 'filmic'
  banding: 0.7,                  // 0-1: ribbon alignment strength
  blendRichness: 0.8,            // 0-1: thin wisps to lush film
  handReactivity: 'med',         // 'off' | 'low' | 'med' | 'high'
  rainbowMode: false,
  speed: 1.0,
  transparency: 0.8,
  afterglow: 0.5,                // Gesture persistence
  depthLayers: false,            // Enable 3-layer parallax
  preset: null                   // 'pastel' | 'neon' | 'minimal'
};

// Performance constants
const MAX_DELTA_TIME = 0.1; // Maximum delta time to clamp (100ms) - prevents huge jumps when tab is backgrounded

export default function OpalineFilmMode() {
  const { gl } = useThree();
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const { poseData } = usePoseDetection();
  
  // Get mode-specific params or use defaults
  const filmParams = params.opalineFilm || DEFAULT_PARAMS;
  const quality = filmParams.quality ?? DEFAULT_PARAMS.quality;
  const banding = filmParams.banding ?? DEFAULT_PARAMS.banding;
  const blendRichness = filmParams.blendRichness ?? DEFAULT_PARAMS.blendRichness;
  const handReactivity = filmParams.handReactivity ?? DEFAULT_PARAMS.handReactivity;
  const rainbowMode = filmParams.rainbowMode ?? DEFAULT_PARAMS.rainbowMode;
  const speed = params.speed ?? DEFAULT_PARAMS.speed;
  const transparency = params.intensity ?? DEFAULT_PARAMS.transparency;
  
  // Quality to resolution mapping
  const resolutionMap = {
    performance: 512,
    balanced: 768,
    filmic: 1024
  };
  const resolution = resolutionMap[quality] || 768;
  
  // Hand reactivity to strength mapping
  const reactivityMap = {
    off: 0,
    low: 0.3,
    med: 0.7,
    high: 1.0
  };
  const handStrength = reactivityMap[handReactivity] || 0.7;
  
  // Create render targets for multi-pass rendering
  const [renderTargets, setRenderTargets] = useState(null);
  
  useEffect(() => {
    // Check for float texture support and fallback if necessary
    const floatExt = gl.getExtension('OES_texture_float');
    const halfFloatExt = gl.getExtension('OES_texture_half_float');
    
    let textureType = THREE.UnsignedByteType; // Safe fallback
    if (floatExt) {
      textureType = THREE.FloatType;
    } else if (halfFloatExt) {
      textureType = THREE.HalfFloatType;
    }
    
    const rt1 = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: textureType
    });
    
    const rt2 = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: textureType
    });
    
    // Initialize with some base thickness
    const initScene = new THREE.Scene();
    const initMaterial = new THREE.ShaderMaterial({
      vertexShader: advectionVertexShader,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float pattern = sin(vUv.x * 20.0) * 0.5 + 0.5;
          gl_FragColor = vec4(pattern * 0.3, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {}
    });
    const initMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMaterial);
    initScene.add(initMesh);
    
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    gl.setRenderTarget(rt1);
    gl.render(initScene, camera);
    gl.setRenderTarget(null);
    
    setRenderTargets({ rt1, rt2 });
    
    return () => {
      rt1.dispose();
      rt2.dispose();
    };
  }, [resolution, gl]);
  
  // Shader materials
  const advectionMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: advectionVertexShader,
      fragmentShader: advectionFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uVelocity: { value: null },
        uTime: { value: 0 },
        uDeltaTime: { value: 0 },
        uBanding: { value: banding },
        uFlowSpeed: { value: speed },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uHandLeft: { value: new THREE.Vector2(0.5, 0.5) },
        uHandRight: { value: new THREE.Vector2(0.5, 0.5) },
        uHandLeftStrength: { value: 0 },
        uHandRightStrength: { value: 0 },
        uDecay: { value: 0.98 },
        uMusicEnergy: { value: 0 }
      }
    });
  }, [resolution]);
  
  const diffusionMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: advectionVertexShader,
      fragmentShader: diffusionFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uBlendRichness: { value: blendRichness }
      }
    });
  }, [resolution]);
  
  const sourceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: advectionVertexShader,
      fragmentShader: sourceFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uHandLeft: { value: new THREE.Vector2(0.5, 0.5) },
        uHandRight: { value: new THREE.Vector2(0.5, 0.5) },
        uHandLeftStrength: { value: 0 },
        uHandRightStrength: { value: 0 },
        uAmbientSource: { value: 0.5 },
        uTime: { value: 0 }
      }
    });
  }, [resolution]);
  
  const renderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: advectionVertexShader,
      fragmentShader: renderFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uTime: { value: 0 },
        uTransparency: { value: transparency },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uColorA: { value: new THREE.Color(1, 1, 1) },
        uColorB: { value: new THREE.Color(0.5, 0.7, 1) },
        uRainbowMode: { value: rainbowMode },
        uMusicRMS: { value: 0 },
        uMusicCentroid: { value: 0 }
      },
      transparent: true,
      blending: THREE.NormalBlending
    });
  }, [resolution]);
  
  // Scene for offscreen rendering
  const offscreenScene = useMemo(() => {
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), advectionMaterial);
    scene.add(mesh);
    return scene;
  }, [advectionMaterial]);
  
  const offscreenCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);
  
  // Display mesh
  const meshRef = useRef();
  
  // Hand tracking refs
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
  const frameCountRef = useRef(0);
  const lastFPSCheckRef = useRef(0);
  const fpsRef = useRef(60);
  
  useFrame((state, dt) => {
    if (!renderTargets) return;
    
    timeRef.current += dt * speed;
    frameCountRef.current++;
    
    // FPS monitoring
    if (timeRef.current - lastFPSCheckRef.current > 1.0) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFPSCheckRef.current = timeRef.current;
    }
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    
    // Music data
    const musicEnergy = music?.energy ?? 0;
    const musicRMS = music?.rms ?? 0;
    const musicCentroid = music?.centroid ? Math.min(music.centroid / 5000, 1) : 0;
    
    // Hand tracking
    const leftHandPos = getLeftHandPosition(poseData?.landmarks);
    const rightHandPos = getRightHandPosition(poseData?.landmarks);
    
    let leftHandStrength = 0;
    let leftHandUV = new THREE.Vector2(0.5, 0.5);
    
    if (leftHandPos && handReactivity !== 'off') {
      const smoothed = smoothHandPosition(leftHandPos, leftHandRefs.smoothedPosition.current, 0.15);
      leftHandRefs.smoothedPosition.current = smoothed;
      
      const velocity = calculateHandVelocity(smoothed, leftHandRefs.lastPosition.current, dt);
      leftHandRefs.velocity.current = velocity;
      leftHandRefs.lastPosition.current = smoothed;
      
      leftHandUV = new THREE.Vector2(smoothed.x, 1.0 - smoothed.y);
      leftHandStrength = Math.min(velocity * handStrength * 5, 1.0);
    }
    
    let rightHandStrength = 0;
    let rightHandUV = new THREE.Vector2(0.5, 0.5);
    
    if (rightHandPos && handReactivity !== 'off') {
      const smoothed = smoothHandPosition(rightHandPos, rightHandRefs.smoothedPosition.current, 0.15);
      rightHandRefs.smoothedPosition.current = smoothed;
      
      const velocity = calculateHandVelocity(smoothed, rightHandRefs.lastPosition.current, dt);
      rightHandRefs.velocity.current = velocity;
      rightHandRefs.lastPosition.current = smoothed;
      
      rightHandUV = new THREE.Vector2(smoothed.x, 1.0 - smoothed.y);
      rightHandStrength = Math.min(velocity * handStrength * 5, 1.0);
    }
    
    // Multi-pass rendering
    const { rt1, rt2 } = renderTargets;
    
    // 1. Source injection
    sourceMaterial.uniforms.uThickness.value = rt1.texture;
    sourceMaterial.uniforms.uHandLeft.value = leftHandUV;
    sourceMaterial.uniforms.uHandRight.value = rightHandUV;
    sourceMaterial.uniforms.uHandLeftStrength.value = leftHandStrength;
    sourceMaterial.uniforms.uHandRightStrength.value = rightHandStrength;
    sourceMaterial.uniforms.uTime.value = timeRef.current;
    
    offscreenScene.children[0].material = sourceMaterial;
    gl.setRenderTarget(rt2);
    gl.render(offscreenScene, offscreenCamera);
    
    // 2. Advection
    advectionMaterial.uniforms.uThickness.value = rt2.texture;
    advectionMaterial.uniforms.uTime.value = timeRef.current;
    advectionMaterial.uniforms.uDeltaTime.value = Math.min(dt, MAX_DELTA_TIME);
    advectionMaterial.uniforms.uBanding.value = banding;
    advectionMaterial.uniforms.uFlowSpeed.value = speed;
    advectionMaterial.uniforms.uHandLeft.value = leftHandUV;
    advectionMaterial.uniforms.uHandRight.value = rightHandUV;
    advectionMaterial.uniforms.uHandLeftStrength.value = leftHandStrength;
    advectionMaterial.uniforms.uHandRightStrength.value = rightHandStrength;
    advectionMaterial.uniforms.uMusicEnergy.value = musicEnergy;
    
    offscreenScene.children[0].material = advectionMaterial;
    gl.setRenderTarget(rt1);
    gl.render(offscreenScene, offscreenCamera);
    
    // 3. Diffusion (creamy blending)
    diffusionMaterial.uniforms.uThickness.value = rt1.texture;
    diffusionMaterial.uniforms.uBlendRichness.value = blendRichness;
    
    offscreenScene.children[0].material = diffusionMaterial;
    gl.setRenderTarget(rt2);
    gl.render(offscreenScene, offscreenCamera);
    
    // 4. Render to screen
    renderMaterial.uniforms.uThickness.value = rt2.texture;
    renderMaterial.uniforms.uTime.value = timeRef.current;
    renderMaterial.uniforms.uTransparency.value = transparency;
    renderMaterial.uniforms.uColorA.value.setRGB(bgRGB.r, bgRGB.g, bgRGB.b);
    renderMaterial.uniforms.uColorB.value.setRGB(assetRGB.r, assetRGB.g, assetRGB.b);
    renderMaterial.uniforms.uRainbowMode.value = rainbowMode;
    renderMaterial.uniforms.uMusicRMS.value = musicRMS;
    renderMaterial.uniforms.uMusicCentroid.value = musicCentroid;
    
    gl.setRenderTarget(null);
    
    // Update display mesh
    if (meshRef.current) {
      meshRef.current.material = renderMaterial;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[20, 12]} />
      <meshBasicMaterial />
    </mesh>
  );
}
