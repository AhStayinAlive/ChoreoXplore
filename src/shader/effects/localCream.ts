export const localCreamEffect = {
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec2 uPointer; uniform vec2 uPointerVel;
    uniform float uBodySpeed; uniform float uExpand; uniform float uAccent;
    uniform float uMusicReactivity; uniform float uMotionReactivity;
    uniform float uTime; uniform float uDelta;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0));
      float d = hash(i + vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
    }

    void main(){
      vec2 uv = vUv;
      vec2 center = uPointer; // direct follow
      float d = distance(uv, center);
      float ring = 1.0 - smoothstep(0.145, 0.155, d);
      gl_FragColor = vec4(vec3(0.05, 0.10, 0.60) + ring, 1.0);
    }
  `
};
