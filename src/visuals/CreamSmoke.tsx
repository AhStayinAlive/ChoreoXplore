import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import { useVisStore } from '../state/useVisStore';

const SIM_FS = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2  uResolution;
uniform float uTime, uDt, uDissipation, uFlow, uNoiseScale, uInject, uEnergy, uMotion, uRadius;
uniform int   uEmitterCount;
uniform vec3  uEmitters[12]; // xy in 0..1, z=strength

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec2 curl(vec2 p){
  float e = 0.002;
  float n1 = noise(p + vec2(0.0, e));
  float n2 = noise(p - vec2(0.0, e));
  float n3 = noise(p + vec2(e, 0.0));
  float n4 = noise(p - vec2(e, 0.0));
  float dx = (n1 - n2);
  float dy = (n4 - n3);
  vec2 c = vec2(dy, -dx);
  float len = max(1e-6, length(c));
  return c / len;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 v = curl(uv * uNoiseScale + uTime*0.05) * uFlow * (0.6 + 0.6*uEnergy + 0.3*uMotion);

  // Semi-Lagrangian advection
  vec2 back = uv - v * uDt;
  float d = texture2D(uPrev, clamp(back, 0.0, 1.0)).r;

  // Inject density from emitters gated by strength (movement)
  float accum = 0.0;
  for (int i=0; i<12; i++){
    if (i >= uEmitterCount) break;
    vec2 p = uEmitters[i].xy;
    float s = uEmitters[i].z;        // 0..1 from joint speed
    float r = mix(0.02, 0.12, s) * uRadius;
    float falloff = exp(-dot(uv - p, uv - p) / (r*r));
    accum += falloff * s;
  }
  d += accum * uInject * (0.3 + 0.7*uEnergy); // audio scales only existing emission

  d *= uDissipation;
  gl_FragColor = vec4(d,0.0,0.0,1.0);
}
`;

const DISPLAY_FS = `
precision highp float;
uniform sampler2D uTex;
uniform float uIntensity;
uniform vec3  uBase, uAccent;
uniform vec2  uResolution;
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  float d = texture2D(uTex, uv).r;
  float m = pow(clamp(d, 0.0, 1.0), 0.6);
  vec3 col = mix(uBase, uAccent, smoothstep(0.2, 0.95, m)) * (0.5 + 0.8*m);
  gl_FragColor = vec4(col * uIntensity, m);
}
`;

export function CreamSmoke() {
  const { size, gl } = useThree();
  const music  = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const cream = params.cream ?? {} as any;
  if (cream.enabled === false) return null;

  // Base buffer size on drawingbuffer to account for DPR
  const pr = gl.getPixelRatio?.() ?? 1;
  const w = Math.max(64, Math.floor(size.width  * pr * (cream.resolutionScale ?? 0.5)));
  const h = Math.max(64, Math.floor(size.height * pr * (cream.resolutionScale ?? 0.5)));

  // Fallback to UnsignedByte if HalfFloat not supported
  const extHalf = gl.getExtension('OES_texture_half_float');
  const extLinear = gl.getExtension('OES_texture_half_float_linear');
  const isWebGL2 = (gl.capabilities && (gl.capabilities as any).isWebGL2) || !!(gl as any).isWebGL2;
  const fboType = (isWebGL2 || extHalf) ? (THREE.HalfFloatType as any) : THREE.UnsignedByteType;
  const minFilter = (isWebGL2 || extLinear) ? THREE.LinearFilter : THREE.NearestFilter;
  const rtA = useFBO(w, h, { type: fboType, magFilter: THREE.LinearFilter, minFilter });
  const rtB = useFBO(w, h, { type: fboType, magFilter: THREE.LinearFilter, minFilter });

  // Separate fullscreen quad for SIM (NDC -1..1) and a large display quad for the main scene
  const simQuad = useMemo(()=> new THREE.PlaneGeometry(2,2), []);
  const displayQuad = useMemo(()=> new THREE.PlaneGeometry(20000, 20000, 1, 1), []);
  const ortho = useMemo(()=> new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);
  const sceneSim = useMemo(()=> new THREE.Scene(), []);
  const simMeshRef = useRef<THREE.Mesh | null>(null);

  const simMat = useMemo(()=> new THREE.ShaderMaterial({
    uniforms: {
      uPrev:{ value: rtA.texture }, uResolution:{ value:new THREE.Vector2(w,h) },
      uTime:{ value:0 }, uDt:{ value:1/60 },
      uDissipation:{ value: cream.dissipation ?? 0.985 },
      uFlow:{ value: cream.flow ?? 0.65 },
      uNoiseScale:{ value: cream.noiseScale ?? 2.0 },
      uInject:{ value: cream.inject ?? 1.0 },
      uEnergy:{ value: 0 }, uMotion:{ value: 0 },
      uRadius:{ value: cream.radius ?? 1.0 },
      uEmitters:{ value: Array.from({length:12},()=> new THREE.Vector3()) },
      uEmitterCount:{ value:0 },
    },
    fragmentShader: SIM_FS,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
  }), [w,h]);

  const displayMat = useMemo(()=> new THREE.ShaderMaterial({
    uniforms:{
      uTex:{ value: rtA.texture },
      uIntensity:{ value: cream.intensity ?? 1.0 },
      uBase:{ value: new THREE.Color(cream.baseColor ?? '#cccccc') },
      uAccent:{ value: new THREE.Color(cream.accentColor ?? '#ffffff') },
      uResolution:{ value:new THREE.Vector2(w, h) }
    },
    fragmentShader: DISPLAY_FS,
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        // Position quad just behind other content
        vec4 pos = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        gl_Position = pos;
      }
    `,
    transparent:true, depthWrite:false, depthTest:false
  }), [size.width, size.height]);

  useMemo(()=> {
    if (!simMeshRef.current) {
      const m = new THREE.Mesh(simQuad, simMat);
      simMeshRef.current = m;
      sceneSim.add(m);
    }
  }, [sceneSim, simQuad, simMat]);

  const flipRef = useRef(false);

  useFrame((state, dt) => {
    // Keep display resolution in sync with actual drawing buffer (handles DPR/resize)
    const pr = state.gl.getPixelRatio();
    displayMat.uniforms.uResolution.value.set(state.size.width * pr, state.size.height * pr);
    // Update sim uniforms
    simMat.uniforms.uPrev.value = (flipRef.current ? rtB : rtA).texture;
    simMat.uniforms.uTime.value += dt;
    simMat.uniforms.uDt.value = Math.min(0.033, Math.max(0.001, dt));
    simMat.uniforms.uEnergy.value = music?.energy ?? 0;
    simMat.uniforms.uMotion.value = motion?.sharpness ?? 0;
    simMat.uniforms.uRadius.value = (useVisStore.getState().params as any).cream?.radius ?? 1.0;

    // Gate emission by movement and visibility; compute strength from joint speed
    const creamParams = (useVisStore.getState().params as any).cream || {};
    const visGate = creamParams.visGate ?? 0.25;
    const gate = creamParams.movementGate ?? 0.02;

    const prevRef = (CreamSmoke as any)._prev || ((CreamSmoke as any)._prev = {});
    const prev = prevRef as Record<string, {x:number,y:number}>;

    const speedOf = (name: string, p:{x:number;y:number;v:number}) => {
      const pr = prev[name];
      const s = pr ? Math.hypot((p.x - pr.x)/Math.max(dt,1e-4), (p.y - pr.y)/Math.max(dt,1e-4)) : 0;
      prev[name] = { x: p.x, y: p.y };
      return s;
    };

    const strength = (spd:number) => {
      const a = gate, b = gate * 2.0;
      const t = Math.min(1, Math.max(0, (spd - a) / (b - a)));
      return t*t*(3.0 - 2.0*t);
    };

    const e = simMat.uniforms.uEmitters.value as THREE.Vector3[];
    let count = 0;
    const add = (name: string, p?:{x:number;y:number;v:number}, mult=1) => {
      if (!p || p.v < visGate || count >= 12) return;
      const s = strength(speedOf(name, p)) * mult;
      if (s <= 1e-4) return;
      // Clamp UVs to safe range
      const ux = Math.min(0.99, Math.max(0.01, p.x));
      const uy = Math.min(0.99, Math.max(0.01, 1.0 - p.y));
      e[count++].set(ux, uy, s);
    };

    const J:any = motion?.joints2D;
    const show = (useVisStore.getState().params as any).bodyPoints || {};
    if (J){
      // If no joints are enabled, default to hands
      const anyEnabled = show.head || show.shoulders || show.hands || show.elbows || show.hips || show.knees || show.ankles;
      const useHands = anyEnabled ? show.hands : true;
      if (show.head)       add("head", J.head, 1.0);
      if (show.shoulders){ add("lSh", J.shoulders.l,0.7); add("rSh", J.shoulders.r,0.7); }
      if (useHands){       add("lWr", J.hands.l, 1.0);    add("rWr", J.hands.r, 1.0); }
      if (show.elbows){    add("lEl", J.elbows.l,0.85);   add("rEl", J.elbows.r,0.85); }
      if (show.hips){      add("lHp", J.hips.l,0.6);      add("rHp", J.hips.r,0.6); }
      if (show.knees){     add("lKn", J.knees.l,0.9);     add("rKn", J.knees.r,0.9); }
      if (show.ankles){    add("lAn", J.ankles.l,0.9);    add("rAn", J.ankles.r,0.9); }
    }
    simMat.uniforms.uEmitterCount.value = count;

    // SIM: if no emitters, still advect previous density slightly to keep alive. Ensure at least tiny accum when moving.
    const readRT  = flipRef.current ? rtB : rtA;
    const writeRT = flipRef.current ? rtA : rtB;
    gl.setRenderTarget(writeRT);
    gl.render(sceneSim, ortho);
    gl.setRenderTarget(null);
    flipRef.current = !flipRef.current;

    const currentRT = flipRef.current ? rtB : rtA; // after flip, read is the freshly written one
    simMat.uniforms.uPrev.value = currentRT.texture;
    displayMat.uniforms.uTex.value = currentRT.texture;
    displayMat.uniforms.uIntensity.value = (useVisStore.getState().params as any).intensity ?? 1.0;
  });

  // Large quad placed slightly behind in Z so it's visible as background layer
  return <mesh geometry={displayQuad} material={displayMat} position={[0,0,0]} renderOrder={999} />;
}

export default CreamSmoke;
