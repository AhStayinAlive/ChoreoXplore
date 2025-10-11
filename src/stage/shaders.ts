export const creamEffect = {
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

    void main(){
      vec2 uv = vUv;
      vec2 center = mix(vec2(0.5), uPointer, 0.85);
      vec2 d = uv - center; float r = max(1e-3, length(d)); vec2 dir = normalize(d);
      float t = uTime; float widen = 0.4 + 0.8 * uExpand; float speed = 0.2 + 0.9 * uBodySpeed;
      vec2 flow = dir * (widen / (1.0 + 6.0*r));
      vec3 col = mix(vec3(0.96,0.96,0.94), vec3(1.0), 0.2) + vec3(flow.x, flow.y, r) * 0.25;
      col *= 0.9 + 0.2 * uMusicReactivity;
      gl_FragColor = vec4(col, 1.0);
    }
  `
};

export function createEffect(effect){
  return effect;
}
