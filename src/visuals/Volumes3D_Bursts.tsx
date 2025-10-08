import React from 'react';
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useVisStore } from "../state/useVisStore";

function tetra(){ const g=new THREE.ConeGeometry(0.05,0.1,3); g.translate(0,0.05,0); return g; }

export default function Volumes3D_Bursts(){
  const p = useVisStore(s=>s.params);
  const music = useVisStore(s=>s.music);

  const geo = useMemo(()=>tetra(),[]);
  const mat = useMemo(()=>new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(p.hue/360,0.7,0.5), metalness:0.1, roughness:0.6 }),[p.hue]);
  const inst = useRef<THREE.InstancedMesh>(null!);
  const count = 300;
  const pos = useMemo(()=>Array.from({length:count},()=>new THREE.Vector3((Math.random()*2-1)*0.2,(Math.random()*2-1)*0.2,0)),[]);
  const vel = useMemo(()=>Array.from({length:count},()=>new THREE.Vector3()),[]);

  useFrame((_,dt)=>{
    const E = music.energy * p.musicReact;
    for (let i=0;i<count;i++){
      if (Math.random() < E*0.15) vel[i].set((Math.random()*2-1)*0.6,(Math.random()*2-1)*0.6,(Math.random()*2-1)*0.6);
      pos[i].addScaledVector(vel[i], dt); vel[i].multiplyScalar(0.96);
      if (pos[i].length()>2.2) pos[i].set(0,0,0);
      const s = 0.25 + 0.5*E;
      const m = new THREE.Matrix4().compose(pos[i], new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(),Math.random(),Math.random())), new THREE.Vector3(s,s,s));
      inst.current.setMatrixAt(i,m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });

  return <>
    <ambientLight intensity={0.4}/><directionalLight position={[2,3,5]} intensity={1}/>
    <instancedMesh ref={inst} args={[geo,mat,count]}/>
  </>;
}

