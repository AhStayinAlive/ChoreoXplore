import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";
import { startAudio, audio$ } from "../core/audio";
import { startPose, pose$ } from "../core/pose";
import { applyRoutes } from "../core/routing";
import { buildScene } from "../composition/scene.js";

function SceneRoot() {
  const group = useRef();
  const setFPS = useStore((s) => s.setFPS);
  const setSceneNodes = useStore((s) => s.setSceneNodes);

  useEffect(() => {
    const api = {
      addLine: ({ length, angle, color, stroke, pos }) => {
        const g = new THREE.Group();
        const baseH = Math.max(1, stroke);
        const geo = new THREE.PlaneGeometry(length, baseH);
        const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        const rect = new THREE.Mesh(geo, mat);
        rect.userData.baseHeight = baseH;
        rect.position.set(0, 0, 0);
        g.add(rect);
        g.position.set(pos[0], pos[1], pos[2]);
        g.rotation.z = angle * Math.PI / 180;
        group.current.add(g);
        return g;
      },
    };

    const nodes = buildScene(api);
    setSceneNodes(nodes);
  }, [setSceneNodes]);

  useEffect(() => { startAudio(); startPose(); }, []);

  useEffect(() => {
    const subA = audio$.subscribe((a) => {
      const p = pose$.value || {};
      applyRoutes({ audio: a, pose: p });
    });
    const subP = pose$.subscribe((p) => {
      const a = audio$.value || {};
      applyRoutes({ audio: a, pose: p });
    });
    return () => { subA.unsubscribe(); subP.unsubscribe(); };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const prev = useFrame.prev || now;
    const fps = 1000 / (now - prev || 16);
    useFrame.prev = now;
    setFPS(Math.round(fps));
  });

  return <group ref={group} />;
}

export default function Canvas3D() {
  return (
    <Canvas orthographic camera={{ zoom: 1.2, position: [0, 0, 100] }} dpr={[1, 2]}>
      <color attach="background" args={["#0A0A0C"]} />
      <SceneRoot />
    </Canvas>
  );
}

