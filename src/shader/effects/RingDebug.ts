export const RingDebugEffect = {
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform vec2  uPointer;
    uniform vec2  u_resolution;

    void main() {
      vec2 uvp = gl_FragCoord.xy / u_resolution;
      float ring = 1.0 - smoothstep(0.145, 0.155, distance(uvp, uPointer));
      vec3 base  = vec3(0.05, 0.10, 0.60);
      gl_FragColor = vec4(base + ring, 1.0);
    }
  `
};
