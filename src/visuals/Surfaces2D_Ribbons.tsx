import React from 'react';
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useVisStore } from "../state/useVisStore";

export default function Surfaces2D_Ribbons(){
  const p = useVisStore(s=>s.params);
  const music = useVisStore(s=>s.music);
  const count = 70;

  const geo = useMemo(()=>new THREE.PlaneGeometry(1,1),[]);
  const mat = useMemo(()=>new THREE.MeshBasicMaterial({ color:new THREE.Color().setHSL(p.hue/360,0.6,0.6), transparent:true, opacity:0.8, side:THREE.DoubleSide }),[p.hue]);
  const inst = useRef<THREE.InstancedMesh>(null!);

  useFrame(()=>{
    const w = THREE.MathUtils.lerp(0.02, 0.25, Math.min(1, music.energy*1.4));
    const t = performance.now()*0.0012;
    for (let i=0;i<count;i++){
      const a = i*0.19 + t;
      const x = Math.sin(a)*0.9, y = Math.cos(a*1.3)*0.5;
      const s = new THREE.Vector3(w, 0.08 + 0.35*Math.abs(Math.sin(a*2.0)), 1);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x,y,0), new THREE.Quaternion(), s);
      inst.current.setMatrixAt(i,m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={inst} args={[geo,mat,count]} />;
}

