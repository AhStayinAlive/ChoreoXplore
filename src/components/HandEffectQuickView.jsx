import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import * as THREE from 'three';
import {
  handRippleVertexShader,
  handRippleFragmentShader,
  handRippleUniforms
} from '../shaders/handRippleShader';

// Import ChoreoXploreSystem which contains all visual modes
import ChoreoXploreSystem from './ChoreoXploreSystem';

// Constants for positioning and animation
const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 300;
const DEFAULT_BOTTOM = 12;
const DEFAULT_RIGHT = 342;

// Animation constants
const PARTICLE_TRAIL_LENGTH = 50;
const PARTICLE_SIZE_MULTIPLIER = 0.15;
const SMOKE_SPHERE_SIZE = 0.2;
const FIGURE8_X_AMPLITUDE = 0.3;
const FIGURE8_Y_AMPLITUDE = 0.25;
const FIGURE8_Y_FREQUENCY = 2;
const COORDINATE_SCALE_X = 4;
const COORDINATE_SCALE_Y = 3;
const PULSE_AMPLITUDE = 0.3;
const PULSE_FREQUENCY = 3;
const FLUID_MARKER_BASE_SIZE = 0.2;
const FLUID_OPACITY_MULTIPLIER = 0.5;
const FLUID_OPACITY_MAX = 0.9;

/**
 * Enhanced smoke trail with more particles and music reactivity
 */
function SmokeTrail({ handSide, color, intensity, radius }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const trailPositions = useRef([]);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  const particleCount = PARTICLE_TRAIL_LENGTH;
  
  // Initialize trail positions
  useEffect(() => {
    trailPositions.current = new Array(particleCount).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      age: 0
    }));
  }, [particleCount]);
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = radius * PARTICLE_SIZE_MULTIPLIER * (1 - i / particleCount);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [radius, particleCount]);
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: SMOKE_SPHERE_SIZE,
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Calculate current hand position (figure-8)
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Shift trail positions
    for (let i = trailPositions.current.length - 1; i > 0; i--) {
      trailPositions.current[i] = { ...trailPositions.current[i - 1] };
      trailPositions.current[i].age += delta;
    }
    trailPositions.current[0] = { x, y, age: 0 };
    
    // Update geometry positions with music reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    const positions = particlesRef.current.geometry.attributes.position.array;
    for (let i = 0; i < trailPositions.current.length; i++) {
      const pos = trailPositions.current[i];
      positions[i * 3] = (pos.x - 0.5) * COORDINATE_SCALE_X;
      positions[i * 3 + 1] = (0.5 - pos.y) * COORDINATE_SCALE_Y;
      positions[i * 3 + 2] = -i * 0.01 + energy * 0.1; // Add depth based on music
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

/**
 * Enhanced particle trail effect (the preview smoke effect now as a real effect)
 */
function ParticleTrailEffect({ handSide, color, intensity, particleSize, trailLength, fadeSpeed }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const trailPositions = useRef([]);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  const particleCount = Math.floor(trailLength);
  
  // Initialize trail positions
  useEffect(() => {
    trailPositions.current = new Array(particleCount).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      age: 0
    }));
  }, [particleCount]);
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = particleSize * (1 - i / particleCount);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [particleCount, particleSize]);
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 2.5, // Increased from 1.5 to match main UI better
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity, particleSize]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Calculate current hand position (figure-8)
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Shift trail positions with fade
    for (let i = trailPositions.current.length - 1; i > 0; i--) {
      trailPositions.current[i] = { ...trailPositions.current[i - 1] };
      trailPositions.current[i].age += delta;
    }
    trailPositions.current[0] = { x, y, age: 0 };
    
    // Update geometry positions with music reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    const positions = particlesRef.current.geometry.attributes.position.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < trailPositions.current.length; i++) {
      const pos = trailPositions.current[i];
      const fade = Math.pow(fadeSpeed, i);
      
      positions[i * 3] = (pos.x - 0.5) * COORDINATE_SCALE_X;
      positions[i * 3 + 1] = (0.5 - pos.y) * COORDINATE_SCALE_Y;
      positions[i * 3 + 2] = -i * 0.01 + energy * 0.1; // Add depth based on music
      
      // Adjust size with fade
      sizes[i] = particleSize * (1 - i / particleCount) * fade * (1 + energy * 0.2);
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Update material opacity based on music
    if (particlesRef.current.material) {
      particlesRef.current.material.opacity = intensity * (1 + energy * 0.3);
    }
  });
  
  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

/**
 * Fluid effect wrapper - simplified for preview to avoid window-level event conflicts
 * Shows visual markers instead of actual fluid distortion to keep it contained
 */
function FluidEffectPreview({ settings, showLeftHand, showRightHand }) {
  // For preview, we'll show enhanced visual markers that represent the fluid effect
  // This avoids the issue of the Fluid library listening to window events globally
  
  return (
    <>
      {showLeftHand && <FluidVisualMarker handSide="left" settings={settings} />}
      {showRightHand && <FluidVisualMarker handSide="right" settings={settings} />}
    </>
  );
}

/**
 * Visual marker to represent fluid distortion in preview
 */
function FluidVisualMarker({ handSide, settings }) {
  const meshRef = useRef();
  const trailMeshes = useRef([]);
  const timeRef = useRef(0);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  // Create trail of spheres
  const trailCount = 5;
  
  useFrame((state, delta) => {
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Figure-8 pattern
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    
    // Update main sphere
    if (meshRef.current) {
      meshRef.current.position.set((x - 0.5) * COORDINATE_SCALE_X, (0.5 - y) * COORDINATE_SCALE_Y, 0);
      const scale = (settings.radius || 0.1) * 2 * (1 + PULSE_AMPLITUDE * Math.sin(t * PULSE_FREQUENCY) + energy * 0.3);
      meshRef.current.scale.set(scale, scale, scale);
    }
    
    // Update trail spheres with wave distortion
    trailMeshes.current.forEach((mesh, i) => {
      if (mesh) {
        const trailT = t - (i * 0.1);
        const trailX = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(trailT + offset);
        const trailY = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * trailT + offset);
        
        // Add swirl/distortion effect
        const distortion = settings.distortion || 1;
        const swirl = (settings.swirl || 0) * 0.01;
        const angle = trailT * swirl;
        const distX = Math.cos(angle) * distortion * 0.1;
        const distY = Math.sin(angle) * distortion * 0.1;
        
        mesh.position.set(
          (trailX - 0.5 + distX) * COORDINATE_SCALE_X, 
          (0.5 - trailY + distY) * COORDINATE_SCALE_Y, 
          -i * 0.05
        );
        
        const trailScale = (settings.radius || 0.1) * 1.5 * (1 - i / trailCount);
        mesh.scale.set(trailScale, trailScale, trailScale);
      }
    });
  });
  
  const color = settings.fluidColor || '#005eff';
  const intensity = settings.intensity || 1.0;
  
  return (
    <group>
      {/* Main sphere - larger and more visible */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={Math.min(intensity * 0.8, 1.0)}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Trail spheres */}
      {Array.from({ length: trailCount }).map((_, i) => (
        <mesh key={i} ref={el => trailMeshes.current[i] = el}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial 
            color={settings.rainbow ? 
              `hsl(${(i / trailCount) * 360}, 70%, 60%)` : 
              color
            }
            transparent 
            opacity={Math.min((intensity * 0.6 * (1 - i / trailCount)), 0.85)}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Simulates hand movement in a figure-8 pattern for preview with actual ripple effect rendering
 */
function SimulatedHandMovement({ handSide, effectType }) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const lastPositionRef = useRef({ x: 0.5, y: 0.5 });
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  
  // Get effect settings based on type
  const getEffectSettings = () => {
    const handEffect = params.handEffect || {};
    switch (effectType) {
      case 'ripple':
        return handEffect.ripple || {};
      case 'smoke':
        return handEffect.smoke || {};
      case 'fluidDistortion':
        return handEffect.fluidDistortion || {};
      case 'particleTrail':
        return handEffect.particleTrail || {};
      default:
        return {};
    }
  };

  const effectSettings = getEffectSettings();
  const speed = params.speed || 1.0;
  const transparency = params.intensity || 0.8;
  
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  };

  // Create shader material for ripple effect with enhanced visuals
  const material = useMemo(() => {
    if (effectType !== 'ripple') return null;
    
    const uniforms = {
      ...handRippleUniforms,
      uTexture: { value: null },
      uHandPosition: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleStrength: { value: 0.5 },
      uTime: { value: 0.0 },
      uRippleRadius: { value: effectSettings.radius || 0.1 },
      uBaseColor: { value: new THREE.Vector3(...hexToRgb(effectSettings.baseColor || '#00ccff')) },
      uRippleColor: { value: new THREE.Vector3(...hexToRgb(effectSettings.rippleColor || '#ff00cc')) }
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: handRippleVertexShader,
      fragmentShader: handRippleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [effectType, effectSettings.radius, effectSettings.baseColor, effectSettings.rippleColor]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Figure-8 pattern for hand movement
    // Offset pattern for left vs right hand
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Calculate velocity for motion-reactive effects
    const dx = x - lastPositionRef.current.x;
    const dy = y - lastPositionRef.current.y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / delta;
    
    lastPositionRef.current = { x, y };
    
    // Get music energy for reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    
    // Update material uniforms for ripple effect
    if (material && material.uniforms) {
      material.uniforms.uHandPosition.value.set(x, y);
      material.uniforms.uTime.value = t;
      // Add music reactivity to ripple strength
      const baseStrength = Math.min(velocity * 0.5 * (effectSettings.intensity || 0.8), 1.0);
      material.uniforms.uRippleStrength.value = baseStrength + energy * 0.5;
      material.uniforms.uRippleRadius.value = (effectSettings.radius || 0.1) * (1 + energy * 0.3);
      material.uniforms.uBaseColor.value.set(...hexToRgb(effectSettings.baseColor || '#00ccff'));
      material.uniforms.uRippleColor.value.set(...hexToRgb(effectSettings.rippleColor || '#ff00cc'));
    }
    
    // Position the visual element
    if (effectType === 'ripple') {
      // Ripple covers full screen
      meshRef.current.position.set(0, 0, 0);
      // Apply transparency
      if (material) {
        material.opacity = transparency;
      }
    }
  });

  // Render different visuals based on effect type
  if (effectType === 'ripple') {
    return (
      <mesh ref={meshRef} material={material}>
        <planeGeometry args={[8, 6]} />
      </mesh>
    );
  }
  
  if (effectType === 'smoke') {
    return <SmokeTrail 
      handSide={handSide}
      color={effectSettings.color || '#ffffff'}
      intensity={effectSettings.intensity || 0.7}
      radius={effectSettings.radius || 0.8}
    />;
  }
  
  if (effectType === 'particleTrail') {
    return <ParticleTrailEffect 
      handSide={handSide}
      color={effectSettings.color || '#00ffff'}
      intensity={effectSettings.intensity || 0.8}
      particleSize={effectSettings.particleSize || 0.15}
      trailLength={effectSettings.trailLength || 50}
      fadeSpeed={effectSettings.fadeSpeed || 0.95}
    />;
  }
  
  // Fluid distortion is handled separately by FluidEffectPreview
  // Return null here as the fluid effect needs to be at a different level
  if (effectType === 'fluidDistortion') {
    return null;
  }
  
  return null;
}

/**
 * Quick View component for previewing hand effects without user motion
 * Now with draggable positioning, background visuals, and music reactivity
 */
export default function HandEffectQuickView() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  const handEffect = useMemo(() => params.handEffect || {}, [params.handEffect]);
  const userColors = useStore(s => s.userColors); // Get user colors for background
  
  const effectType = handEffect.type || 'none';
  const handSelection = handEffect.handSelection || 'none';
  const showQuickView = handEffect.showQuickView !== false; // Default to true
  
  // Draggable state
  const [position, setPosition] = useState({
    x: handEffect.previewPosition?.x || DEFAULT_RIGHT,
    y: handEffect.previewPosition?.y || DEFAULT_BOTTOM
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  
  // Handle drag start
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.preview-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);
  
  // Handle drag move
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within window bounds
      const maxX = window.innerWidth - PREVIEW_WIDTH - 10;
      const maxY = window.innerHeight - PREVIEW_HEIGHT - 10;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);
  
  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to state
      setParams({
        handEffect: {
          ...handEffect,
          previewPosition: position
        }
      });
    }
  }, [isDragging, position, handEffect, setParams]);
  
  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Don't render if no effect selected or preview is disabled
  if (effectType === 'none' || handSelection === 'none' || !showQuickView) {
    return null;
  }
  
  const showLeftHand = handSelection === 'left' || handSelection === 'both';
  const showRightHand = handSelection === 'right' || handSelection === 'both';
  
  return (
    <div 
      ref={dragRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(0,150,255,0.5)',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable */}
      <div 
        className="preview-header"
        style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,150,255,0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'grab',
        userSelect: 'none',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '12px', 
          fontWeight: 600,
          color: 'white'
        }}>
          Effect Preview (Drag to Move)
        </h4>
      </div>
      
      {/* Canvas for preview */}
      <div style={{ width: '100%', height: 'calc(100% - 40px)', position: 'relative' }}>
        <Canvas
          orthographic
          camera={{ 
            zoom: 0.1, 
            position: [0, 0, 5] 
          }}
          dpr={[1, 2]}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true
          }}
        >
          {/* Background color matches main UI exactly */}
          <color attach="background" args={[userColors.bgColor]} />
          
          {/* Render the full ChoreoXplore system just like the main canvas */}
          <ChoreoXploreSystem />
          
          {/* Hand effects - conditional rendering based on effect type */}
          {effectType === 'fluidDistortion' ? (
            // Fluid distortion uses visual markers to stay within preview canvas
            <FluidEffectPreview 
              settings={handEffect.fluidDistortion || {}}
              showLeftHand={showLeftHand}
              showRightHand={showRightHand}
            />
          ) : (
            // Other effects (ripple, smoke, particleTrail) render normally
            <>
              {showLeftHand && (
                <SimulatedHandMovement 
                  handSide="left" 
                  effectType={effectType}
                />
              )}
              {showRightHand && (
                <SimulatedHandMovement 
                  handSide="right" 
                  effectType={effectType}
                />
              )}
            </>
          )}
        </Canvas>
      </div>
      
      {/* Bottom info text removed per request */}
    </div>
  );
}
