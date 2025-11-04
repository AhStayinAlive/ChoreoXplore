/**
 * Opaline Wave Mode
 * Silky, pastel, oil-on-water swirls with iridescent rims
 * 
 * Audio mapping:
 * - low → base flow strength (big slow bends)
 * - mid → advection/scroll speed (overall motion)
 * - high → shimmer speed (fine iridescent ripples)
 * - onset → spawn swirl vortex
 * - beat → global phase nudge
 * 
 * Motion mapping (optional):
 * - com.xy → vortex position
 * - bodyVelocity → vortex strength
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import {
  advectVertexShader,
  advectFragmentShader,
  renderVertexShader,
  renderFragmentShader
} from './shaders';

// Default parameters
const DEFAULT_PARAMS = {
  colorMode: 'Rainbow',
  // User mode
  primary: '#F5E8FF',
  secondary: '#A4D8FF',
  gradientBias: 0.45,
  // Music mode
  lowColor: '#00C2FF',
  midColor: '#FF4D9A',
  highColor: '#FFE45E',
  paletteSmoothing: 0.6,
  // Rainbow mode (Pastel Silk preset)
  colorSpread: 0.9,
  shimmerSpeed: 0.25,
  whiteMix: 0.65,
  // Core
  waveScale: 1.2,
  flowStrength: 0.55,
  decay: 0.82,
  swirlStrength: 0.6,
  grain: 0.15
};

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const userColors = useStore(s => s.userColors);
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  // FBO refs for ping-pong
  const fboARef = useRef(null);
  const fboBRef = useRef(null);
  const advectMaterialRef = useRef(null);
  const renderMaterialRef = useRef(null);
  const currentFboRef = useRef(0); // 0 = A, 1 = B
  
  // Vortex management
  const vorticesRef = useRef([]);
  const lastOnsetRef = useRef(0);
  
  // Auto-throttle
  const fboScaleRef = useRef(1.0);
  const fpsHistoryRef = useRef([]);
  
  // Initialize FBOs
  useEffect(() => {
    const initSize = 512;
    const fboA = new THREE.WebGLRenderTarget(initSize, initSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    const fboB = new THREE.WebGLRenderTarget(initSize, initSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    
    fboARef.current = fboA;
    fboBRef.current = fboB;
    
    // Initialize with some thickness
    const initMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.5, 0.5, 0.5)
    });
    
    return () => {
      fboA.dispose();
      fboB.dispose();
    };
  }, []);
  
  // Advect material
  const advectMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: advectVertexShader,
      fragmentShader: advectFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uTime: { value: 0 },
        uDeltaTime: { value: 0 },
        uWaveScale: { value: DEFAULT_PARAMS.waveScale },
        uFlowStrength: { value: DEFAULT_PARAMS.flowStrength },
        uSwirlStrength: { value: DEFAULT_PARAMS.swirlStrength },
        uDecay: { value: DEFAULT_PARAMS.decay },
        uHighFreq: { value: 0 },
        uResolution: { value: new THREE.Vector2(512, 512) },
        uVortex1: { value: new THREE.Vector2(0.5, 0.5) },
        uVortex1Strength: { value: 0 },
        uVortex2: { value: new THREE.Vector2(0.5, 0.5) },
        uVortex2Strength: { value: 0 },
        uVortex3: { value: new THREE.Vector2(0.5, 0.5) },
        uVortex3Strength: { value: 0 },
      }
    });
    advectMaterialRef.current = mat;
    return mat;
  }, []);
  
  // Render material
  const renderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      uniforms: {
        uThickness: { value: null },
        uTime: { value: 0 },
        uTransparency: { value: 0.8 },
        uRMS: { value: 0 },
        uHighFreq: { value: 0 },
        uResolution: { value: new THREE.Vector2(512, 512) },
        uColorMode: { value: 2 }, // Rainbow default
        uPrimaryColor: { value: new THREE.Color(DEFAULT_PARAMS.primary) },
        uSecondaryColor: { value: new THREE.Color(DEFAULT_PARAMS.secondary) },
        uGradientBias: { value: DEFAULT_PARAMS.gradientBias },
        uLowColor: { value: new THREE.Color(DEFAULT_PARAMS.lowColor) },
        uMidColor: { value: new THREE.Color(DEFAULT_PARAMS.midColor) },
        uHighColor: { value: new THREE.Color(DEFAULT_PARAMS.highColor) },
        uLowBand: { value: 0 },
        uMidBand: { value: 0 },
        uHighBand: { value: 0 },
        uColorSpread: { value: DEFAULT_PARAMS.colorSpread },
        uShimmerSpeed: { value: DEFAULT_PARAMS.shimmerSpeed },
        uWhiteMix: { value: DEFAULT_PARAMS.whiteMix },
        uBgTint: { value: new THREE.Color(0, 0, 0) },
        uAssetTint: { value: new THREE.Color(1, 1, 1) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    renderMaterialRef.current = mat;
    return mat;
  }, []);
  
  useFrame((state, dt) => {
    if (!fboARef.current || !fboBRef.current) return;
    
    const musicReact = params.musicReact || 0;
    const energy = (music?.energy ?? 0) * musicReact;
    const rms = (music?.rms ?? 0) * musicReact;
    const centroid = music?.centroid ?? 0;
    
    // Frequency bands
    const lowBand = energy * (1 - Math.min(centroid / 5000, 1));
    const midBand = energy * (1 - Math.abs(centroid / 5000 - 0.5) * 2);
    const highBand = energy * Math.min(centroid / 5000, 1);
    
    // Onset detection
    const onset = energy > lastOnsetRef.current * 1.8 && energy > 0.15;
    lastOnsetRef.current = energy;
    
    // Update advect uniforms
    advectMaterial.uniforms.uTime.value += dt * (0.5 + params.speed * 0.5);
    advectMaterial.uniforms.uDeltaTime.value = Math.min(dt, 0.1);
    advectMaterial.uniforms.uWaveScale.value = opalineParams.waveScale;
    advectMaterial.uniforms.uFlowStrength.value = opalineParams.flowStrength * (1 + lowBand * 0.5);
    advectMaterial.uniforms.uSwirlStrength.value = opalineParams.swirlStrength;
    advectMaterial.uniforms.uDecay.value = opalineParams.decay;
    advectMaterial.uniforms.uHighFreq.value = highBand;
    
    // Manage vortices
    // Decay existing vortices
    vorticesRef.current = vorticesRef.current.map(v => ({
      ...v,
      strength: v.strength * 0.95,
      life: v.life - dt
    })).filter(v => v.life > 0 && v.strength > 0.01);
    
    // Spawn new vortex on onset
    if (onset && vorticesRef.current.length < 6) {
      const pos = motion?.com 
        ? new THREE.Vector2(motion.com.x, motion.com.y)
        : new THREE.Vector2(Math.random(), Math.random());
      
      vorticesRef.current.push({
        pos,
        strength: 0.8,
        life: 2.0
      });
    }
    
    // Motion-driven vortex
    if (motion?.com && motion?.bodyVelocity) {
      const strength = Math.min(motion.bodyVelocity * 1.5, 1.0);
      if (strength > 0.1) {
        // Update or create motion vortex
        const motionVortexIndex = vorticesRef.current.findIndex(v => v.isMotion);
        if (motionVortexIndex >= 0) {
          vorticesRef.current[motionVortexIndex].pos.set(motion.com.x, motion.com.y);
          vorticesRef.current[motionVortexIndex].strength = strength;
          vorticesRef.current[motionVortexIndex].life = 1.0;
        } else if (vorticesRef.current.length < 6) {
          vorticesRef.current.push({
            pos: new THREE.Vector2(motion.com.x, motion.com.y),
            strength,
            life: 1.0,
            isMotion: true
          });
        }
      }
    }
    
    // Set vortex uniforms (up to 3)
    for (let i = 0; i < 3; i++) {
      if (i < vorticesRef.current.length) {
        const v = vorticesRef.current[i];
        advectMaterial.uniforms[`uVortex${i + 1}`].value.copy(v.pos);
        advectMaterial.uniforms[`uVortex${i + 1}Strength`].value = v.strength * opalineParams.swirlStrength;
      } else {
        advectMaterial.uniforms[`uVortex${i + 1}Strength`].value = 0;
      }
    }
    
    // Ping-pong advection
    const sourceFbo = currentFboRef.current === 0 ? fboARef.current : fboBRef.current;
    const targetFbo = currentFboRef.current === 0 ? fboBRef.current : fboARef.current;
    
    advectMaterial.uniforms.uThickness.value = sourceFbo.texture;
    
    // Render advect pass to target FBO
    const oldRenderTarget = state.gl.getRenderTarget();
    state.gl.setRenderTarget(targetFbo);
    state.gl.clear();
    
    // Render full-screen quad with advect material
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, advectMaterial);
    scene.add(mesh);
    state.gl.render(scene, camera);
    
    state.gl.setRenderTarget(oldRenderTarget);
    
    // Swap
    currentFboRef.current = 1 - currentFboRef.current;
    
    // Update render uniforms
    renderMaterial.uniforms.uThickness.value = targetFbo.texture;
    renderMaterial.uniforms.uTime.value = advectMaterial.uniforms.uTime.value;
    renderMaterial.uniforms.uTransparency.value = params.intensity || 0.8;
    renderMaterial.uniforms.uRMS.value = rms;
    renderMaterial.uniforms.uHighFreq.value = highBand;
    
    // Color mode
    const colorModeMap = { 'User': 0, 'Music': 1, 'Rainbow': 2 };
    renderMaterial.uniforms.uColorMode.value = colorModeMap[opalineParams.colorMode] ?? 2;
    
    // User mode colors
    renderMaterial.uniforms.uPrimaryColor.value.set(opalineParams.primary);
    renderMaterial.uniforms.uSecondaryColor.value.set(opalineParams.secondary);
    renderMaterial.uniforms.uGradientBias.value = opalineParams.gradientBias;
    
    // Music mode colors
    renderMaterial.uniforms.uLowColor.value.set(opalineParams.lowColor);
    renderMaterial.uniforms.uMidColor.value.set(opalineParams.midColor);
    renderMaterial.uniforms.uHighColor.value.set(opalineParams.highColor);
    renderMaterial.uniforms.uLowBand.value = lowBand;
    renderMaterial.uniforms.uMidBand.value = midBand;
    renderMaterial.uniforms.uHighBand.value = highBand;
    
    // Rainbow mode
    renderMaterial.uniforms.uColorSpread.value = opalineParams.colorSpread;
    renderMaterial.uniforms.uShimmerSpeed.value = opalineParams.shimmerSpeed;
    renderMaterial.uniforms.uWhiteMix.value = opalineParams.whiteMix;
    
    // Global tint
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    renderMaterial.uniforms.uBgTint.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    renderMaterial.uniforms.uAssetTint.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
  });
  
  return (
    <mesh position={[0, 0, 1]} material={renderMaterial}>
      <planeGeometry args={[25000, 13000]} />
    </mesh>
  );
}
