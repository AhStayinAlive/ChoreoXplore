import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";
import { useVisStore } from "../state/useVisStore";
import { startAudio, audio$ } from "../core/audio";
import { startPose, pose$ } from "../core/pose";
import { applyRoutes } from "../core/routing";
import { buildScene } from "../composition/scene.js";
import { createMixer } from "../core/mixer";
import { loadAnglesPack } from "../core/assets";
import Motion3DController from "../components/Motion3DController";
import { subscribeToMotionData } from "../core/motionMapping";
import SampleImage from "../components/SampleImage";
import HumanoidAvatar from "../components/HumanoidAvatar";
import DancerSegmentation from "../components/DancerSegmentation";
import SilhouetteEffect from "../components/SilhouetteEffect";
import SimpleSkeleton from "../components/SimpleSkeleton";
import AmbientBackgroundAnimation from "../components/AmbientBackgroundAnimation";
import ChoreoXploreSystem from "../components/ChoreoXploreSystem";
import { startIrinaAudioBridge, startIrinaPoseBridge } from "../adapters/bridgeCoreAudioToIrina";

function SceneRoot({ backgroundImage, ambientAnimationParams }) {
  const group = useRef();
  const setFPS = useStore(s => s.setFPS);
  const setSceneNodes = useStore((s) => s.setSceneNodes);
  const skeletonVisible = useStore(s => s.skeletonVisible);
  const mode = useStore(s => s.mode);
  const choreoxploreIsActive = useVisStore(s => s.isActive);
  const apiRef = useRef({ root: null });
  const mixerRef = useRef(null);
  const lastTRef = useRef(performance.now());
  const motionDataRef = useRef(null);

  useEffect(() => {
    // Clear static nodes; mixer will spawn visuals
    setSceneNodes([]);
  }, [setSceneNodes]);

  useEffect(() => { 
    startAudio(); 
    startPose(); 
    
    // Start Irina bridges
    const stopAudioBridge = startIrinaAudioBridge();
    const stopPoseBridge = startIrinaPoseBridge();
    
    // Subscribe to motion data for camera control
    const motionSubscription = subscribeToMotionData((motionData) => {
      motionDataRef.current = motionData;
    });
    
    return () => {
      motionSubscription.unsubscribe();
      stopAudioBridge();
      stopPoseBridge();
    };
  }, []);

  useEffect(() => {
    // Disable mixer system to prevent random shapes from appearing
    // apiRef.current.root = group.current;
    // mixerRef.current = createMixer(apiRef.current);
    // loadAnglesPack("/packs/sample.anglespack/manifest.json").catch(() => {});

    // const subA = audio$.subscribe((a) => {
    //   const p = pose$.value || {};
    //   applyRoutes({ audio: a, pose: p });
    //   SceneRoot._signal = { rms: a.rms, bands: a.bands, centroid: a.centroid, onset: a.onset, pose: p };
    //   if (a.onset) mixerRef.current?.trySpawn(SceneRoot._signal);
    // });
    // const subP = pose$.subscribe((p) => {
    //   const a = audio$.value || {};
    //   applyRoutes({ audio: a, pose: p });
    //   SceneRoot._signal = { rms: a.rms, bands: a.bands, centroid: a.centroid, onset: a.onset, pose: p };
    // });
    // return () => { subA.unsubscribe(); subP.unsubscribe(); };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const prev = useFrame.prev || now;
    const fps = 1000 / (now - prev || 16);
    useFrame.prev = now;
    const dt = Math.min(0.05, (now - lastTRef.current) / 1000);
    lastTRef.current = now;
    // Disable mixer updates to prevent random shapes
    // if (mixerRef.current && SceneRoot._signal) mixerRef.current.update(dt, SceneRoot._signal);
    setFPS(Math.round(fps));
  });

      return (
        <>
          <Motion3DController>
            <group ref={group} />
          </Motion3DController>
          {skeletonVisible && (
            <SimpleSkeleton scale={mode === "irina" ? 1.0 : 1.0} />
          )}
          {backgroundImage && (
            <>
              {/* Unified ambient animation with pose-based distortion */}
              <AmbientBackgroundAnimation 
                backgroundImage={backgroundImage} 
                isActive={ambientAnimationParams?.isActive ?? true}
                effectType={ambientAnimationParams?.effectType ?? 'waterRipple'}
                speed={ambientAnimationParams?.speed ?? 1.0}
                amplitude={ambientAnimationParams?.amplitude ?? 0.5}
                wavelength={ambientAnimationParams?.wavelength ?? 1.0}
                intensity={ambientAnimationParams?.intensity ?? 0.3}
                scale={mode === "choreoxplore" ? 1.0 : 1.0} // Same scale for all modes
              />
            </>
          )}
          {choreoxploreIsActive && (
            <>
              <ChoreoXploreSystem />
            </>
          )}
        </>
      );
}

export default function Canvas3D({ backgroundImage, ambientAnimationParams }) {
  const mode = useStore(s => s.mode);
  const userColors = useStore(s => s.userColors);
  const choreoxploreIsActive = useVisStore(s => s.isActive);
  
  // Different camera settings for different modes
  const getCameraSettings = () => {
    if (choreoxploreIsActive) {
      return { zoom: 500, position: [0, 0, 10] }; // ChoreoXplore settings when visuals are active
    }
    switch (mode) {
      case "choreoxplore":
      case "performance":
        return { zoom: 500, position: [0, 0, 10] }; // Groupmates' settings for ChoreoXplore and Performance
      default:
        return { zoom: 0.1, position: [0, 0, 10] }; // Original settings for other modes
    }
  };
  
  return (
    <Canvas 
      orthographic 
      camera={{ 
        zoom: choreoxploreIsActive ? 0.1 : (mode === "choreoxplore" || mode === "performance") ? 0.1 : 0.1, 
        position: choreoxploreIsActive ? [0, 0, 5] : (mode === "choreoxplore" || mode === "performance") ? [0, 0, 5] : [0, 0, 10] 
      }}
      dpr={[1, 2]}
      style={{ 
        background: backgroundImage ? "transparent" : userColors.bgColor,
        pointerEvents: 'none'
      }}
    >
      {!backgroundImage && <color attach="background" args={[userColors.bgColor]} />}
      <SceneRoot backgroundImage={backgroundImage} ambientAnimationParams={ambientAnimationParams} />
    </Canvas>
  );
}

