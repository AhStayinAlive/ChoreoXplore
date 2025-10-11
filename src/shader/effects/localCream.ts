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
      vec2 center = mix(vec2(0.5), uPointer, 0.85);
      vec2 d = uv - center; float r = max(1e-3, length(d)); vec2 dir = normalize(d);
      float turb = noise(uv * 4.0 + uTime * (1.0 + 2.0*length(uPointerVel))) + noise(uv * 9.0 + uTime * 0.5);
      turb *= (0.6 + 0.8 * clamp(length(uPointerVel), 0.0, 1.5) + 0.6 * uAccent);
      float widen = 0.4 + 0.8 * uExpand; float speed = 0.2 + 0.9 * uBodySpeed;
      vec2 flow = dir * (widen / (1.0 + 6.0*r)) + (turb - 0.5) * 0.15;
      flow *= mix(1.0, 1.6, uMotionReactivity);
      vec3 col = mix(vec3(0.96,0.96,0.94), vec3(1.0), 0.2) + vec3(flow.x, flow.y, turb) * 0.25;
      col *= 0.9 + 0.2 * uMusicReactivity;
      gl_FragColor = vec4(col, 1.0);
    }
  `
};
