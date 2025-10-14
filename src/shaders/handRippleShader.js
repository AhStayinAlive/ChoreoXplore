// Hand Ripple Shader for fluid distortion effect
export const handRippleVertexShader = `
  uniform vec2 uHandPosition;
  uniform float uRippleStrength;
  uniform float uTime;
  uniform float uRippleRadius;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    
    // Calculate distance from hand position
    float dist = distance(uv, uHandPosition);
    
    // Create ripple effect using sine waves with dynamic frequency
    float frequency = 15.0 + uRippleStrength * 10.0;
    float ripple = sin(dist * frequency - uTime * 2.0) * uRippleStrength;
    
    // Apply smooth falloff based on distance
    float falloff = 1.0 - smoothstep(0.0, uRippleRadius, dist);
    
    // Displace vertices in Z direction (more pronounced for visibility)
    pos.z += ripple * falloff * 0.5;
    
    // Add secondary wave for more complex distortion
    float ripple2 = sin(dist * (frequency * 0.7) - uTime * 1.5) * uRippleStrength * 0.6;
    pos.z += ripple2 * falloff * 0.3;
    
    // Add tertiary wave for fine detail
    float ripple3 = sin(dist * (frequency * 1.3) - uTime * 2.5) * uRippleStrength * 0.3;
    pos.z += ripple3 * falloff * 0.1;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const handRippleFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uHandPosition;
  uniform float uRippleStrength;
  uniform float uTime;
  uniform float uRippleRadius;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    // Calculate distance from hand for ripple effect
    float dist = distance(vUv, uHandPosition);
    float falloff = 1.0 - smoothstep(0.0, uRippleRadius, dist);
    
    // Create multiple ripple rings for more visible effect
    float ripple1 = sin(dist * 20.0 - uTime * 3.0) * 0.5 + 0.5;
    float ripple2 = sin(dist * 30.0 - uTime * 4.0) * 0.3 + 0.7;
    float ripple3 = sin(dist * 40.0 - uTime * 5.0) * 0.2 + 0.8;
    
    // Combine ripples
    float combinedRipple = ripple1 * ripple2 * ripple3;
    
    // Simple color scheme for visibility testing
    vec3 baseColor = vec3(0.0, 0.8, 1.0); // Bright cyan
    vec3 rippleColor = vec3(1.0, 0.0, 0.8); // Magenta
    
    // Mix colors based on ripple strength and distance
    vec3 finalColor = mix(baseColor, rippleColor, falloff * uRippleStrength * combinedRipple);
    
    // Add some brightness variation
    finalColor += vec3(falloff * uRippleStrength * 0.8);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shader uniforms configuration
export const handRippleUniforms = {
  uTexture: { value: null },
  uHandPosition: { value: { x: 0.5, y: 0.5 } },
  uRippleStrength: { value: 0.0 },
  uTime: { value: 0.0 },
  uRippleRadius: { value: 0.3 }
};
