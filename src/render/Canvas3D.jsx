import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";
import { startAudio, audio$ } from "../core/audio";
import { startPose, pose$ } from "../core/pose";
import { applyRoutes } from "../core/routing";
import { buildScene } from "../composition/scene.js";
import { createMixer } from "../core/mixer";
import { loadAnglesPack } from "../core/assets";

function SceneRoot() {
  const group = useRef();
  const setFPS = useStore(s => s.setFPS);
  const setSceneNodes = useStore((s) => s.setSceneNodes);
  const apiRef = useRef({ root: null });
  const mixerRef = useRef(null);
  const lastTRef = useRef(performance.now());

  useEffect(() => {
    // Clear static nodes; mixer will spawn visuals
    setSceneNodes([]);
  }, [setSceneNodes]);

  useEffect(() => { startAudio(); startPose(); }, []);

  useEffect(() => {
    apiRef.current.root = group.current;
    mixerRef.current = createMixer(apiRef.current);
    loadAnglesPack("/packs/sample.anglespack/manifest.json").catch(() => {});

    const subA = audio$.subscribe((a) => {
      const p = pose$.value || {};
      applyRoutes({ audio: a, pose: p });
      SceneRoot._signal = { rms: a.rms, bands: a.bands, centroid: a.centroid, onset: a.onset, pose: p };
      if (a.onset) mixerRef.current?.trySpawn(SceneRoot._signal);
    });
    const subP = pose$.subscribe((p) => {
      const a = audio$.value || {};
      applyRoutes({ audio: a, pose: p });
      SceneRoot._signal = { rms: a.rms, bands: a.bands, centroid: a.centroid, onset: a.onset, pose: p };
    });
    return () => { subA.unsubscribe(); subP.unsubscribe(); };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const prev = useFrame.prev || now;
    const fps = 1000 / (now - prev || 16);
    useFrame.prev = now;
    const dt = Math.min(0.05, (now - lastTRef.current) / 1000);
    lastTRef.current = now;
    if (mixerRef.current && SceneRoot._signal) mixerRef.current.update(dt, SceneRoot._signal);
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

