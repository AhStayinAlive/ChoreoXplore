import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import { HandRipplePass } from '../effects/HandRipplePass';
import HandRippleEffect from '../effects/HandRippleEffect';
import { spawnHandRipple, getPalmWorldPosition, isPalmContactingSurface } from '../mocap/handRippleManager';
import * as THREE from 'three';

/**
 * HandRippleSystem - Manages hand ripple post-process effect
 * Integrates with pose detection and handles keyboard test input
 */
export default function HandRippleSystem() {
  const { gl, camera, size } = useThree();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const isActive = useVisStore(s => s.isActive);
  
  const ripplePassRef = useRef(null);
  const lastContactRef = useRef({ left: false, right: false });

  // Create ripple pass once
  useEffect(() => {
    const pass = new HandRipplePass(0.5);
    ripplePassRef.current = pass;
    pass.setSize(size.width, size.height);

    return () => {
      pass.dispose();
    };
  }, []);

  // Update pass parameters when settings change
  useEffect(() => {
    const pass = ripplePassRef.current;
    if (!pass) return;

    pass.enabled = handEffect?.ripplePass?.enabled || false;
    pass.maxRipples = handEffect?.ripplePass?.maxRipples || 8;
    pass.expansionSpeed = handEffect?.ripplePass?.expansionSpeed || 0.5;
    pass.decay = handEffect?.ripplePass?.decay || 1.5;
    pass.maxRadius = handEffect?.ripplePass?.maxRadius || 0.4;
    pass.baseAmplitude = handEffect?.ripplePass?.baseAmplitude || 1.0;
    pass.updateParameters();
  }, [handEffect?.ripplePass]);

  // Keyboard test: spawn ripple on 'R' key press
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'r' || event.key === 'R') {
        if (!ripplePassRef.current || !ripplePassRef.current.enabled) return;
        
        // Spawn ripple 2 units in front of camera
        const cameraPos = camera.position.clone();
        const cameraDir = new THREE.Vector3(0, 0, -1);
        cameraDir.applyQuaternion(camera.quaternion);
        const ripplePos = cameraPos.clone().add(cameraDir.multiplyScalar(200));
        
        spawnHandRipple(
          ripplePassRef.current,
          ripplePos,
          camera,
          gl,
          0.8, // velocity
          0, // pressure
          {}
        );
        
        console.log('🌊 Test ripple spawned at camera-forward position');
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [camera, gl]);

  // Handle mocap-triggered ripples
  useFrame(() => {
    const pass = ripplePassRef.current;
    if (!pass || !pass.enabled || !isActive) return;

    // Check for palm contact and spawn ripples
    if (poseData?.landmarks) {
      const landmarks = poseData.landmarks;
      
      // Check left hand
      const leftPalmPos = getPalmWorldPosition(landmarks, 'left');
      const leftContact = leftPalmPos && isPalmContactingSurface(leftPalmPos, 100);
      
      if (leftContact && !lastContactRef.current.left) {
        // Contact started - spawn ripple
        spawnHandRipple(pass, leftPalmPos, camera, gl, 0.5, 0, {});
        console.log('🌊 Left palm contact ripple spawned');
      }
      lastContactRef.current.left = leftContact;
      
      // Check right hand
      const rightPalmPos = getPalmWorldPosition(landmarks, 'right');
      const rightContact = rightPalmPos && isPalmContactingSurface(rightPalmPos, 100);
      
      if (rightContact && !lastContactRef.current.right) {
        // Contact started - spawn ripple
        spawnHandRipple(pass, rightPalmPos, camera, gl, 0.5, 0, {});
        console.log('🌊 Right palm contact ripple spawned');
      }
      lastContactRef.current.right = rightContact;
    }
  });

  const enabled = handEffect?.ripplePass?.enabled || false;

  // Don't render the effect component as it intercepts the render pipeline
  // This is a placeholder for future proper integration with EffectComposer
  return null;
}
