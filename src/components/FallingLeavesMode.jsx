import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useVisStore } from "../state/useVisStore";

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uIntensity;
uniform float uEnergy;
uniform float uMotion;
varying vec2 vUv;

float leafShape(vec2 p){
  p.y *= 1.45;
  p.x *= 0.75 + 0.25*p.y;
  float body = smoothstep(0.35,0.0,length(p*vec2(1.0,1.25)-vec2(0.0,0.25)));
  float tip  = smoothstep(0.42,0.0,length(p-vec2(0.0,0.45)));
  float spine = smoothstep(0.02,0.0,abs(p.x)*0.85);
  return body*tip*spine;
}

vec3 hueToRgb(float h){
  vec3 c = vec3(
    abs(h*6.0-3.0)-1.0,
    2.0-abs(h*6.0-2.0),
    2.0-abs(h*6.0-4.0)
  );
  return clamp(c,0.0,1.0);
}

vec3 lightShade(vec3 base, vec2 p){
  float shade = 0.55 + 0.45*p.y;
  float rim = smoothstep(0.25,0.0,length(p))*0.8;
  return base*shade*(1.0-rim*0.35);
}

void main(){
  vec2 uv = vUv*2.0-1.0;
  float t = uTime*0.36;
  float h = clamp(uHue/360.0,0.0,1.0);
  vec3 baseColor = hueToRgb(h);
  vec3 col = vec3(0.0);

  // Global wind direction changes with music
  vec2 wind = vec2(
    sin(uTime*0.4 + uEnergy*3.0)*0.25*(0.6+uMotion),
    cos(uTime*0.3 + uMotion*2.0)*0.1*uEnergy
  );

  for(int i=0;i<8;i++){
    float fi=float(i);
    float freq = 1.0 + 0.5*sin(fi*3.1);
    float rotAmp = radians(180.0)*(0.7 + 0.5*sin(fi*5.2));
    float xPhase = fi*1.37;
    float yPhase = fi*2.17;

    // base fall path
    vec2 pos = vec2(
      mix(-0.8,0.8,sin(t*0.4+xPhase)*0.5+0.5),
      1.1 - fract(t*(0.22+0.04*fi))*2.4
    );

    vec2 p = uv - pos;

    // apply wind curvature (energy changes path)
    float leafWindFactor = 0.5 + 0.5*sin(fi*2.4);
    p += wind * leafWindFactor;

    // small natural sway
    p.x += 0.12*sin(t*1.2+yPhase);

    // stable, continuous rotation
    float ang = rotAmp * sin(t*(1.0+freq)+xPhase);
    mat2 R = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
    p = R*p;

    float leaf = leafShape(p);
    if(leaf>0.001){
      vec3 c = lightShade(baseColor,p);
      col += c*leaf*2.2;
    }
  }

  col *= uIntensity;
  float alpha = clamp(length(col),0.0,1.0);
  gl_FragColor = vec4(col,alpha);
}
`;

const vert = `
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

export default function FallingLeavesMode(){
  const material = useMemo(() => new THREE.ShaderMaterial({
    fragmentShader: frag,
    vertexShader: vert,
    uniforms: {
      uTime:{value:0},
      uHue:{value:35},
      uIntensity:{value:1.0},
      uEnergy:{value:0},
      uMotion:{value:0},
    },
    transparent:true,
    depthWrite:false,
    blending:THREE.NormalBlending
  }),[]);

  const geom = useMemo(() => new THREE.PlaneGeometry(25000,13000,1,1),[]);
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);

  useFrame((_,dt)=>{
    material.uniforms.uTime.value += dt * (1.6 + (params?.speed ?? 0)*0.8);
    material.uniforms.uHue.value = params?.hue ?? material.uniforms.uHue.value;
    material.uniforms.uIntensity.value = params?.intensity ?? material.uniforms.uIntensity.value;

    const energy = (music?.energy ?? 0) * (params?.musicReact ?? 1);
    const sharp = (motion?.sharpness ?? 0) * (params?.motionReact ?? 1);

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(material.uniforms.uEnergy.value, energy, 0.25);
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(material.uniforms.uMotion.value, sharp, 0.2);
  });

  return <mesh geometry={geom} material={material} position={[0,0,2]} />;
}
