import React, { useRef, useEffect } from 'react';
import { extend, useThree, useFrame } from '@react-three/fiber';
import { HandRipplePass } from './HandRipplePass';
import * as THREE from 'three';

// Extend to make HandRipplePass available in JSX (not used directly but good practice)
extend({ HandRipplePass });

/**
 * HandRippleEffect - React Three Fiber component wrapper for HandRipplePass
 * Manages the ripple pass as a screen-space postprocess effect
 */
const HandRippleEffect = React.forwardRef(({ enabled = false, ripplePass }, ref) => {
  const { gl, scene, camera, size } = useThree();
  const sceneTargetRef = useRef(null);
  const outputTargetRef = useRef(null);
  const quadSceneRef = useRef(null);
  const quadCameraRef = useRef(null);

  // Initialize render targets and quad scene
  useEffect(() => {
    const width = size.width;
    const height = size.height;
    
    // Create render targets
    sceneTargetRef.current = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    
    outputTargetRef.current = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Create fullscreen quad for final display
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMaterial = new THREE.MeshBasicMaterial();
    const quad = new THREE.Mesh(quadGeometry, quadMaterial);
    quadSceneRef.current = new THREE.Scene();
    quadSceneRef.current.add(quad);
    quadCameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return () => {
      sceneTargetRef.current?.dispose();
      outputTargetRef.current?.dispose();
      quadGeometry.dispose();
      quadMaterial.dispose();
    };
  }, [size]);

  // Update render target sizes
  useEffect(() => {
    if (sceneTargetRef.current && outputTargetRef.current) {
      sceneTargetRef.current.setSize(size.width, size.height);
      outputTargetRef.current.setSize(size.width, size.height);
    }
    if (ripplePass) {
      ripplePass.setSize(size.width, size.height);
    }
  }, [size, ripplePass]);

  // Expose methods via ref
  useEffect(() => {
    if (ref && ripplePass) {
      if (typeof ref === 'function') {
        ref(ripplePass);
      } else {
        ref.current = ripplePass;
      }
    }
  }, [ripplePass, ref]);

  // Render loop with postprocess
  useFrame((state, delta) => {
    if (!enabled || !ripplePass || !sceneTargetRef.current || !outputTargetRef.current) {
      return;
    }

    // 1. Render main scene to texture
    const currentTarget = gl.getRenderTarget();
    gl.setRenderTarget(sceneTargetRef.current);
    gl.clear();
    gl.render(scene, camera);

    // 2. Apply ripple pass
    ripplePass.render(
      gl,
      sceneTargetRef.current,
      outputTargetRef.current,
      delta
    );

    // 3. Display result to screen
    gl.setRenderTarget(currentTarget);
    if (quadSceneRef.current && quadCameraRef.current) {
      const quad = quadSceneRef.current.children[0];
      quad.material.map = outputTargetRef.current.texture;
      quad.material.needsUpdate = true;
      gl.render(quadSceneRef.current, quadCameraRef.current);
    }
  }, 1); // Priority 1 = after normal render

  return null;
});

HandRippleEffect.displayName = 'HandRippleEffect';

export default HandRippleEffect;
