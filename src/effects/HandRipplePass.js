import * as THREE from 'three';
import rippleFragmentShader from '../shaders/rippleFragment.glsl?raw';

/**
 * HandRipplePass - Post-process pass for screen-space hand ripple effects
 * Compatible with EffectComposer-style interface
 */
export class HandRipplePass {
  constructor(resolutionScale = 0.5) {
    this.resolutionScale = resolutionScale;
    this.enabled = false;
    
    // Ripple pool settings
    this.maxRipples = 8;
    this.ripples = [];
    
    // Shader parameters
    this.expansionSpeed = 0.5;
    this.decay = 1.5;
    this.maxRadius = 0.4;
    this.baseAmplitude = 1.0;
    
    // Time tracking
    this.time = 0;
    
    // Create shader material
    this.uniforms = {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(512, 512) },
      time: { value: 0 },
      maxRipples: { value: this.maxRipples },
      rippleCenters: { value: new Array(8).fill(new THREE.Vector2(0.5, 0.5)) },
      rippleStarts: { value: new Array(8).fill(-999) },
      rippleAmps: { value: new Array(8).fill(0) },
      expansionSpeed: { value: this.expansionSpeed },
      decay: { value: this.decay },
      maxRadius: { value: this.maxRadius }
    };
    
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: rippleFragmentShader
    });
    
    // Create scene and camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quad);
    
    // Render target at half resolution
    this.renderTarget = null;
  }
  
  /**
   * Initialize render targets based on renderer size
   */
  setSize(width, height) {
    const scaledWidth = Math.floor(width * this.resolutionScale);
    const scaledHeight = Math.floor(height * this.resolutionScale);
    
    if (this.renderTarget) {
      this.renderTarget.dispose();
    }
    
    this.renderTarget = new THREE.WebGLRenderTarget(scaledWidth, scaledHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    
    this.uniforms.resolution.value.set(scaledWidth, scaledHeight);
  }
  
  /**
   * Add a new ripple to the pool
   * @param {THREE.Vector2} screenUV - Ripple center in UV coordinates (0-1)
   * @param {number} amplitude - Ripple amplitude (0-1.5)
   */
  addRipple(screenUV, amplitude = 1.0) {
    if (!this.enabled) return;
    
    const ripple = {
      center: screenUV.clone(),
      startTime: this.time,
      amplitude: amplitude * this.baseAmplitude
    };
    
    // Pool management: overwrite oldest if at capacity
    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift(); // Remove oldest
    }
    
    this.ripples.push(ripple);
    this._updateUniforms();
  }
  
  /**
   * Update shader uniforms from ripple pool
   */
  _updateUniforms() {
    // Fill arrays with active ripples
    for (let i = 0; i < this.maxRipples; i++) {
      if (i < this.ripples.length) {
        const ripple = this.ripples[i];
        this.uniforms.rippleCenters.value[i] = ripple.center;
        this.uniforms.rippleStarts.value[i] = ripple.startTime;
        this.uniforms.rippleAmps.value[i] = ripple.amplitude;
      } else {
        // Inactive slot
        this.uniforms.rippleCenters.value[i] = new THREE.Vector2(0.5, 0.5);
        this.uniforms.rippleStarts.value[i] = -999;
        this.uniforms.rippleAmps.value[i] = 0;
      }
    }
  }
  
  /**
   * Clean up expired ripples (older than 2.5s)
   */
  _cleanupRipples() {
    const maxAge = 2.5;
    this.ripples = this.ripples.filter(ripple => {
      return (this.time - ripple.startTime) < maxAge;
    });
  }
  
  /**
   * Update pass parameters
   */
  updateParameters() {
    this.uniforms.maxRipples.value = this.maxRipples;
    this.uniforms.expansionSpeed.value = this.expansionSpeed;
    this.uniforms.decay.value = this.decay;
    this.uniforms.maxRadius.value = this.maxRadius;
  }
  
  /**
   * Render pass (EffectComposer-compatible interface)
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderTarget} readBuffer - Input texture
   * @param {WebGLRenderTarget} writeBuffer - Output texture
   * @param {number} delta - Time delta in seconds
   */
  render(renderer, readBuffer, writeBuffer, delta) {
    if (!this.enabled) {
      // Pass through
      renderer.setRenderTarget(writeBuffer);
      renderer.clear();
      const passThroughMaterial = new THREE.MeshBasicMaterial({ map: readBuffer.texture });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passThroughMaterial);
      const scene = new THREE.Scene();
      scene.add(quad);
      renderer.render(scene, this.camera);
      return;
    }
    
    // Update time
    this.time += delta;
    this.uniforms.time.value = this.time;
    
    // Clean up expired ripples
    this._cleanupRipples();
    this._updateUniforms();
    
    // Set input texture
    this.uniforms.tDiffuse.value = readBuffer.texture;
    
    // Render to output
    renderer.setRenderTarget(writeBuffer);
    renderer.render(this.scene, this.camera);
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    if (this.renderTarget) {
      this.renderTarget.dispose();
    }
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
