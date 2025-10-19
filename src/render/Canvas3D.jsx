import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react";
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
import HandEffectRouter from '../components/HandEffectRouter';
import HandFluidCanvas from "../components/HandFluidCanvas";
import HandSmokeCanvas from "../components/HandSmokeCanvas";
import { startIrinaAudioBridge, startIrinaPoseBridge } from "../adapters/bridgeCoreAudioToIrina";

function SceneRoot({ backgroundImage, ambientAnimationParams, fluidTexture, fluidCanvas, smokeTexture, smokeTextureInstance }) {
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
          {/* Hand-driven effects */}
          <HandEffectRouter 
            fluidTexture={fluidTexture} 
            fluidCanvas={fluidCanvas}
            smokeTexture={smokeTexture}
            smokeTextureInstance={smokeTextureInstance}
          />
        </>
      );
}

export default function Canvas3D({ backgroundImage, ambientAnimationParams }) {
  const mode = useStore(s => s.mode);
  const userColors = useStore(s => s.userColors);
  const choreoxploreIsActive = useVisStore(s => s.isActive);
  const handEffect = useVisStore(s => s.params.handEffect);
  const [fluidTexture, setFluidTexture] = useState(null);
  const [fluidCanvas, setFluidCanvas] = useState(null);
  const [smokeTexture, setSmokeTexture] = useState(null);
  const [smokeTextureInstance, setSmokeTextureInstance] = useState(null);
  
  // Check if fluid distortion is active
  const isFluidDistortionActive = handEffect?.type === 'fluidDistortion' && 
                                   handEffect?.handSelection !== 'none' && 
                                   choreoxploreIsActive;
  
  // Option 2: Force canvas pointer-events off when fluid distortion is active
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      if (isFluidDistortionActive) {
        canvas.style.pointerEvents = 'none';
      } else {
        canvas.style.pointerEvents = 'auto';
      }
    }
    
    return () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.pointerEvents = 'auto';
      }
    };
  }, [isFluidDistortionActive]);

  const handleFluidTextureReady = useCallback((canvas) => {
    // Prevent multiple calls with the same canvas
    if (fluidCanvas === canvas) return;
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    setFluidTexture(texture);
    setFluidCanvas(canvas);
  }, [fluidCanvas]);

  const handleSmokeTextureReady = useCallback((canvas, smokeInstance) => {
    // Prevent multiple calls
    if (smokeTextureInstance === smokeInstance) return;
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    setSmokeTexture(texture);
    setSmokeTextureInstance(smokeInstance);
  }, [smokeTextureInstance]);
  
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
    <>
      {/* Option 1: Transparent blocking overlay when fluid distortion is active */}
      {isFluidDistortionActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          pointerEvents: 'auto', // Block mouse events
          background: 'transparent'
        }} />
      )}
      
      {/* Fluid canvas - rendered outside Three.js scene */}
      <HandFluidCanvas 
        width={512} 
        height={512} 
        onCanvasReady={handleFluidTextureReady}
      />
      
      {/* Smoke canvas - rendered outside Three.js scene */}
      <HandSmokeCanvas 
        width={512} 
        height={512} 
        onCanvasReady={handleSmokeTextureReady}
      />
      
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
        <SceneRoot 
          backgroundImage={backgroundImage} 
          ambientAnimationParams={ambientAnimationParams}
          fluidTexture={fluidTexture}
          fluidCanvas={fluidCanvas}
          smokeTexture={smokeTexture}
          smokeTextureInstance={smokeTextureInstance}
        />
      </Canvas>
    </>
  );
}

