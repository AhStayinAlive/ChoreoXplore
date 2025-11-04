import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import { useVisStore } from '../state/useVisStore';
import * as THREE from 'three';
import {
  fluidBaseVertexShader,
  splatFragmentShader,
  advectionFragmentShader,
  divergenceFragmentShader,
  curlFragmentShader,
  vorticityFragmentShader,
  pressureFragmentShader,
  gradientSubtractFragmentShader,
  displayFragmentShader,
  clearFragmentShader,
} from '../shaders/webglFluidShader';
import {
  getRightHandPosition,
  getLeftHandPosition,
  calculateHandVelocity,
  smoothHandPosition,
} from '../utils/handTracking';

const HandWebGLFluid = () => {
  const meshRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const isActive = useVisStore(s => s.isActive);
  const { size } = useThree();

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

  // Get WebGL fluid settings
  const fluidSettings = handEffect?.webglFluid || {
    simResolution: 128,
    dyeResolution: 512,
    densityDissipation: 0.98,
    velocityDissipation: 0.99,
    pressure: 0.8,
    pressureIterations: 20,
    curl: 30,
    splatRadius: 0.25,
    splatForce: 6000,
    shading: true,
    colorful: true,
  };

  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';

  // Calculate resolution based on canvas size
  const simResolution = useMemo(() => {
    const aspectRatio = size.width / size.height;
    const res = fluidSettings.simResolution;
    return {
      width: res,
      height: Math.round(res / aspectRatio)
    };
  }, [size, fluidSettings.simResolution]);

  const dyeResolution = useMemo(() => {
    const aspectRatio = size.width / size.height;
    const res = fluidSettings.dyeResolution;
    return {
      width: res,
      height: Math.round(res / aspectRatio)
    };
  }, [size, fluidSettings.dyeResolution]);

  // Create render targets (FBOs)
  const renderTargets = useMemo(() => {
    const createDoubleFBO = (width, height, format = THREE.RGBAFormat, type = THREE.FloatType) => {
      const options = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: format,
        type: type,
        stencilBuffer: false,
        depthBuffer: false,
      };

      return {
        read: new THREE.WebGLRenderTarget(width, height, options),
        write: new THREE.WebGLRenderTarget(width, height, options),
        swap: function() {
          const temp = this.read;
          this.read = this.write;
          this.write = temp;
        }
      };
    };

    return {
      velocity: createDoubleFBO(simResolution.width, simResolution.height, THREE.RGBAFormat),
      dye: createDoubleFBO(dyeResolution.width, dyeResolution.height, THREE.RGBAFormat),
      divergence: new THREE.WebGLRenderTarget(simResolution.width, simResolution.height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
      }),
      curl: new THREE.WebGLRenderTarget(simResolution.width, simResolution.height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
      }),
      pressure: createDoubleFBO(simResolution.width, simResolution.height, THREE.RGBAFormat),
    };
  }, [simResolution, dyeResolution]);

  // Create shader materials
  const materials = useMemo(() => {
    const simTexelSize = new THREE.Vector2(
      1.0 / simResolution.width,
      1.0 / simResolution.height
    );
    const dyeTexelSize = new THREE.Vector2(
      1.0 / dyeResolution.width,
      1.0 / dyeResolution.height
    );

    return {
      splat: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: splatFragmentShader,
        uniforms: {
          texelSize: { value: dyeTexelSize },
          uTarget: { value: null },
          aspectRatio: { value: size.width / size.height },
          color: { value: new THREE.Vector3(1, 1, 1) },
          point: { value: new THREE.Vector2(0.5, 0.5) },
          radius: { value: fluidSettings.splatRadius / 100.0 }
        }
      }),
      advection: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: advectionFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uVelocity: { value: null },
          uSource: { value: null },
          dt: { value: 0.016 },
          dissipation: { value: fluidSettings.velocityDissipation }
        }
      }),
      divergence: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: divergenceFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uVelocity: { value: null }
        }
      }),
      curl: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: curlFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uVelocity: { value: null }
        }
      }),
      vorticity: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: vorticityFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uVelocity: { value: null },
          uCurl: { value: null },
          curl: { value: fluidSettings.curl },
          dt: { value: 0.016 }
        }
      }),
      pressure: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: pressureFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uPressure: { value: null },
          uDivergence: { value: null }
        }
      }),
      gradientSubtract: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: gradientSubtractFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uPressure: { value: null },
          uVelocity: { value: null }
        }
      }),
      display: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: displayFragmentShader,
        uniforms: {
          texelSize: { value: dyeTexelSize },
          uTexture: { value: null },
          shading: { value: fluidSettings.shading }
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      }),
      clear: new THREE.ShaderMaterial({
        vertexShader: fluidBaseVertexShader,
        fragmentShader: clearFragmentShader,
        uniforms: {
          texelSize: { value: simTexelSize },
          uTexture: { value: null },
          value: { value: fluidSettings.pressureIterations }
        }
      })
    };
  }, [size, simResolution, dyeResolution, fluidSettings]);

  // Create a full-screen quad for rendering
  const quadGeometry = useMemo(() => {
    // Using large plane to match SimpleSkeleton coordinate system (scale 22, range ±200*22)
    return new THREE.PlaneGeometry(20000, 20000);
  }, []);

  // Render a shader pass
  const { gl, camera } = useThree();
  const renderShader = useCallback((material, target) => {
    const currentRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(target);
    
    const quad = new THREE.Mesh(quadGeometry, material);
    const tempScene = new THREE.Scene();
    tempScene.add(quad);
    
    gl.render(tempScene, camera);
    gl.setRenderTarget(currentRenderTarget);
  }, [gl, camera, quadGeometry]);

  // Apply a splat at the given position
  const splat = useCallback((x, y, dx, dy, color) => {
    const aspectRatio = size.width / size.height;
    
    // Splat velocity
    materials.splat.uniforms.uTarget.value = renderTargets.velocity.read.texture;
    materials.splat.uniforms.aspectRatio.value = aspectRatio;
    materials.splat.uniforms.point.value.set(x, y);
    materials.splat.uniforms.color.value.set(dx, dy, 0.0);
    materials.splat.uniforms.radius.value = fluidSettings.splatRadius / 100.0;
    renderShader(materials.splat, renderTargets.velocity.write);
    renderTargets.velocity.swap();

    // Splat dye (color)
    materials.splat.uniforms.uTarget.value = renderTargets.dye.read.texture;
    materials.splat.uniforms.color.value.set(color.r, color.g, color.b);
    renderShader(materials.splat, renderTargets.dye.write);
    renderTargets.dye.swap();
  }, [materials, renderTargets, renderShader, size, fluidSettings]);

  // Simulation step
  const step = useCallback((dt) => {
    // Curl calculation
    materials.curl.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    renderShader(materials.curl, renderTargets.curl);

    // Vorticity confinement
    materials.vorticity.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    materials.vorticity.uniforms.uCurl.value = renderTargets.curl.texture;
    materials.vorticity.uniforms.curl.value = fluidSettings.curl;
    materials.vorticity.uniforms.dt.value = dt;
    renderShader(materials.vorticity, renderTargets.velocity.write);
    renderTargets.velocity.swap();

    // Divergence
    materials.divergence.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    renderShader(materials.divergence, renderTargets.divergence);

    // Clear pressure
    materials.clear.uniforms.uTexture.value = renderTargets.pressure.read.texture;
    materials.clear.uniforms.value.value = 0.0; // Clear to zero for pressure initialization
    renderShader(materials.clear, renderTargets.pressure.write);
    renderTargets.pressure.swap();

    // Pressure solve
    for (let i = 0; i < fluidSettings.pressureIterations; i++) {
      materials.pressure.uniforms.uPressure.value = renderTargets.pressure.read.texture;
      materials.pressure.uniforms.uDivergence.value = renderTargets.divergence.texture;
      renderShader(materials.pressure, renderTargets.pressure.write);
      renderTargets.pressure.swap();
    }

    // Gradient subtract
    materials.gradientSubtract.uniforms.uPressure.value = renderTargets.pressure.read.texture;
    materials.gradientSubtract.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    renderShader(materials.gradientSubtract, renderTargets.velocity.write);
    renderTargets.velocity.swap();

    // Advect velocity
    materials.advection.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    materials.advection.uniforms.uSource.value = renderTargets.velocity.read.texture;
    materials.advection.uniforms.dt.value = dt;
    materials.advection.uniforms.dissipation.value = fluidSettings.velocityDissipation;
    renderShader(materials.advection, renderTargets.velocity.write);
    renderTargets.velocity.swap();

    // Advect dye
    materials.advection.uniforms.uVelocity.value = renderTargets.velocity.read.texture;
    materials.advection.uniforms.uSource.value = renderTargets.dye.read.texture;
    materials.advection.uniforms.dissipation.value = fluidSettings.densityDissipation;
    renderShader(materials.advection, renderTargets.dye.write);
    renderTargets.dye.swap();
  }, [materials, renderTargets, renderShader, fluidSettings]);

  // Generate color based on settings
  const generateColor = useCallback(() => {
    if (fluidSettings.colorful) {
      const hue = Math.random();
      const saturation = 1.0;
      const lightness = 0.5;
      
      // Convert HSL to RGB
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
      const p = 2 * lightness - q;
      
      return {
        r: hue2rgb(p, q, hue + 1/3) * 10.0,
        g: hue2rgb(p, q, hue) * 10.0,
        b: hue2rgb(p, q, hue - 1/3) * 10.0
      };
    }
    return { r: 10.0, g: 10.0, b: 10.0 };
  }, [fluidSettings.colorful]);

  // Update hand tracking and apply splats
  const updateHandFluid = useCallback((currentHandPos, handRefs, delta) => {
    if (currentHandPos && currentHandPos.visibility > 0.3) {
      // Smooth hand position to reduce jitter
      const smoothedPos = smoothHandPosition(currentHandPos, handRefs.smoothedPosition.current, 0.3);
      handRefs.smoothedPosition.current = smoothedPos;
      
      // Calculate hand velocity
      const velocity = calculateHandVelocity(smoothedPos, handRefs.lastPosition.current, delta);
      handRefs.velocity.current = velocity;
      
      // Calculate delta for splat
      const dx = (smoothedPos.x - handRefs.lastPosition.current.x) * fluidSettings.splatForce;
      const dy = (smoothedPos.y - handRefs.lastPosition.current.y) * fluidSettings.splatForce;
      
      // Only splat if there's significant movement
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        const color = generateColor();
        splat(smoothedPos.x, smoothedPos.y, dx, dy, color);
      }
      
      // Store current position for next frame
      handRefs.lastPosition.current = smoothedPos;
    }
  }, [splat, generateColor, fluidSettings.splatForce]);

  // Update each frame
  useFrame((state, delta) => {
    const clampedDelta = Math.min(delta, 0.016666);
    timeRef.current += delta;
    
    // Update hand tracking and apply splats
    if (leftHandEnabled) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      updateHandFluid(leftHandPos, leftHandRefs, clampedDelta);
    }
    
    if (rightHandEnabled) {
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      updateHandFluid(rightHandPos, rightHandRefs, clampedDelta);
    }
    
    // Run simulation step
    step(clampedDelta);
    
    // Update display material
    if (meshRef.current) {
      materials.display.uniforms.uTexture.value = renderTargets.dye.read.texture;
      materials.display.uniforms.shading.value = fluidSettings.shading;
    }
  });

  // Cleanup render targets on unmount
  useEffect(() => {
    return () => {
      Object.values(renderTargets).forEach(rt => {
        if (rt.read) {
          rt.read.dispose();
          rt.write.dispose();
        } else {
          rt.dispose();
        }
      });
    };
  }, [renderTargets]);

  // Don't render if no hands are enabled or ChoreoXplore is not active
  if ((!leftHandEnabled && !rightHandEnabled) || !isActive) {
    return null;
  }

  return (
    <mesh 
      ref={meshRef}
      geometry={quadGeometry}
      material={materials.display}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      renderOrder={-1}
    />
  );
};

export default HandWebGLFluid;
