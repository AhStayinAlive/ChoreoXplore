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
      vec2 center = uPointer; // direct follow
      float d = distance(uv, center);
      float ring = 1.0 - smoothstep(0.145, 0.155, d);
      gl_FragColor = vec4(vec3(0.05, 0.10, 0.60) + ring, 1.0);
    }
  `
};

export function createEffect(effect){
  return effect;
}
