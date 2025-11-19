import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import useStore from '../core/store';
import * as THREE from 'three';

const SimpleSkeleton = ({ scale: modeScale = 1.0 }) => {
  const groupRef = useRef();
  const poseDataRef = useRef(null);
  const distanceScaleRef = useRef(1.0);
  const { poseData } = usePoseDetection();
  const skeletonVisible = useStore(s => s.skeletonVisible);
  const inverseHands = useStore(s => s.inverseHands);
  
  // Object pool for reusing meshes
  const poolRef = useRef({
    cylinders: [],
    spheres: [],
    circles: [],
    cylinderIndex: 0,
    sphereIndex: 0,
    circleIndex: 0
  });

  // Update pose data reference
  useEffect(() => {
    poseDataRef.current = poseData;
  }, [poseData]);

  // MediaPipe pose connections (same as the green lines in the video feed)
  const poseConnections = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    // Left arm
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], [17, 21],
    // Right arm  
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [18, 22],
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Left leg
    [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
  ];

  // Silhouette color (white pictogram by default)
  const SILHOUETTE_COLOR = useMemo(() => new THREE.Color(0xffffff), []);
  
  // Tolerance for geometry dimension changes - if dimensions change less than this, reuse geometry
  const GEOMETRY_TOLERANCE = 0.01;

  // Reusable material - created once and reused
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: SILHOUETTE_COLOR,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    wireframe: false,
    transparent: false,
    opacity: 1.0
  }), [SILHOUETTE_COLOR]);

  // Reusable vectors
  const vUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);

  // Helpers
  function toSceneXY(lm, scale, shouldMirrorX = false) {
    const distanceScale = distanceScaleRef.current;
    // Increase horizontal range for better arm extension (1.6x multiplier)
    const horizontalScale = 1.6;
    return new THREE.Vector3(
      shouldMirrorX ? -(lm.x - 0.5) * 200 * scale * distanceScale * horizontalScale : (lm.x - 0.5) * 200 * scale * distanceScale * horizontalScale,
      (0.5 - lm.y) * 200 * scale * distanceScale,
      2 // keep in front
    );
  }

  // Get or create a cylinder mesh from the pool
  function getCylinder(radius, length) {
    const pool = poolRef.current;
    if (pool.cylinderIndex < pool.cylinders.length) {
      const mesh = pool.cylinders[pool.cylinderIndex];
      pool.cylinderIndex++;
      
      // Update geometry if dimensions changed significantly
      const geo = mesh.geometry;
      if (Math.abs(geo.parameters.radiusTop - radius) > GEOMETRY_TOLERANCE || 
          Math.abs(geo.parameters.height - length) > GEOMETRY_TOLERANCE) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.CylinderGeometry(radius, radius, length, 24, 1, false);
      }
      
      mesh.visible = true;
      return mesh;
    }
    
    // Create new mesh if pool is exhausted
    const geo = new THREE.CylinderGeometry(radius, radius, length, 24, 1, false);
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 10;
    pool.cylinders.push(mesh);
    pool.cylinderIndex++;
    groupRef.current.add(mesh);
    return mesh;
  }

  // Get or create a sphere mesh from the pool
  function getSphere(radius) {
    const pool = poolRef.current;
    if (pool.sphereIndex < pool.spheres.length) {
      const mesh = pool.spheres[pool.sphereIndex];
      pool.sphereIndex++;
      
      // Update geometry if dimensions changed significantly
      const geo = mesh.geometry;
      if (Math.abs(geo.parameters.radius - radius) > GEOMETRY_TOLERANCE) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.SphereGeometry(radius, 24, 16);
      }
      
      mesh.visible = true;
      return mesh;
    }
    
    // Create new mesh if pool is exhausted
    const geo = new THREE.SphereGeometry(radius, 24, 16);
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 10;
    pool.spheres.push(mesh);
    pool.sphereIndex++;
    groupRef.current.add(mesh);
    return mesh;
  }

  // Get or create a circle mesh from the pool (for head)
  function getCircle(radius) {
    const pool = poolRef.current;
    if (pool.circleIndex < pool.circles.length) {
      const mesh = pool.circles[pool.circleIndex];
      pool.circleIndex++;
      
      // Update geometry if dimensions changed significantly
      const geo = mesh.geometry;
      if (Math.abs(geo.parameters.radius - radius) > GEOMETRY_TOLERANCE) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.CircleGeometry(radius, 32);
      }
      
      mesh.visible = true;
      return mesh;
    }
    
    // Create new mesh if pool is exhausted
    const geo = new THREE.CircleGeometry(radius, 32);
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 10;
    pool.circles.push(mesh);
    pool.circleIndex++;
    groupRef.current.add(mesh);
    return mesh;
  }

  function addCapsule(start, end, radius) {
    const dir = tmpB.copy(end).sub(start);
    const length = dir.length();
    if (length <= 0.0001) return;

    const forward = dir.clone().normalize();
    const mesh = getCylinder(radius, length);
    mesh.position.copy(start).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(vUp, forward);
  }

  function addJointSphere(pos, radius) {
    const mesh = getSphere(radius);
    mesh.position.copy(pos);
  }

  useFrame(() => {
    if (!groupRef.current || !poseDataRef.current || !skeletonVisible) {
      // Hide all pooled objects when skeleton is not visible
      if (groupRef.current && !skeletonVisible) {
        const pool = poolRef.current;
        pool.cylinders.forEach(mesh => mesh.visible = false);
        pool.spheres.forEach(mesh => mesh.visible = false);
        pool.circles.forEach(mesh => mesh.visible = false);
      }
      return;
    }

    const currentPose = poseDataRef.current;
    const landmarks = currentPose.landmarks;
    if (!landmarks || landmarks.length < 33) return;
    
    // Get the latest inverseHands state inside useFrame
    const inverseHands = useStore.getState().inverseHands;

    // Fixed scale - adjusted for optimal visibility (was 22, now 38)
    let scale = 38 * modeScale;

    // Calculate bounding box area to determine distance scaling
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(landmark => {
      if (landmark.visibility > 0.01) { // Lowered from 0.5 to trust any MediaPipe detection
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
      }
    });

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    const bboxArea = bboxWidth * bboxHeight;

    // Dynamic distance scaling based on bounding box area
    // Baseline area: 0.25 (typical standing pose at normal camera distance)
    // When camera is far, bboxArea becomes smaller, so distanceScale increases
    const BASELINE_AREA = 0.25;
    const rawDistanceScale = Math.sqrt(BASELINE_AREA / Math.max(bboxArea, 0.01));
    
    // Clamp distance scale between 0.8 and 2.5 to prevent extreme distortion
    const distanceScale = Math.max(0.8, Math.min(2.5, rawDistanceScale));
    distanceScaleRef.current = distanceScale;

    // Store distanceScale in zustand for hand effects to use
    useStore.getState().setDistanceScale(distanceScale);

    // Reset pool indices to reuse existing objects
    const pool = poolRef.current;
    pool.cylinderIndex = 0;
    pool.sphereIndex = 0;
    pool.circleIndex = 0;

    // Precompute key anchor points in scene space
    // Swap all left/right landmarks when inverse hands is enabled
    // Debug: Log inverse state and actual landmark indices being used
    if (Math.random() < 0.01) {
      console.log('SimpleSkeleton inverseHands:', inverseHands);
      console.log('L_WRI will use landmark:', inverseHands ? 16 : 15);
      console.log('R_WRI will use landmark:', inverseHands ? 15 : 16);
    }
    
    const L_SHO = inverseHands ? landmarks[12] : landmarks[11];
    const R_SHO = inverseHands ? landmarks[11] : landmarks[12];
    const L_HIP = inverseHands ? landmarks[24] : landmarks[23];
    const R_HIP = inverseHands ? landmarks[23] : landmarks[24];
    const L_ELB = inverseHands ? landmarks[14] : landmarks[13];
    const R_ELB = inverseHands ? landmarks[13] : landmarks[14];
    const L_WRI = inverseHands ? landmarks[16] : landmarks[15];
    const R_WRI = inverseHands ? landmarks[15] : landmarks[16];
    const L_KNE = inverseHands ? landmarks[26] : landmarks[25];
    const R_KNE = inverseHands ? landmarks[25] : landmarks[26];
    const L_ANK = inverseHands ? landmarks[28] : landmarks[27];
    const R_ANK = inverseHands ? landmarks[27] : landmarks[28];
    const NOSE  = landmarks[0];

    if (!(L_SHO && R_SHO && L_HIP && R_HIP)) return;
    const vLS = toSceneXY(L_SHO, scale, inverseHands);
    const vRS = toSceneXY(R_SHO, scale, inverseHands);
    const vLH = toSceneXY(L_HIP, scale, inverseHands);
    const vRH = toSceneXY(R_HIP, scale, inverseHands);
    const shouldersMid = tmpA.copy(vLS).add(vRS).multiplyScalar(0.5);
    const hipsMid = tmpB.copy(vLH).add(vRH).multiplyScalar(0.5);

    const shoulderW = vLS.distanceTo(vRS);
    const torsoLen = shouldersMid.distanceTo(hipsMid);

    // Radius presets (tuned to look like the pictogram)
    const torsoR   = Math.max(shoulderW * 0.28, 10);
    const shoulderBarR = Math.max(shoulderW * 0.18, torsoR * 0.6);
    const pelvisBarR   = Math.max(shoulderW * 0.20, torsoR * 0.65);
    const armUpperR = Math.max(shoulderW * 0.16, 8);
    const armLowerR = Math.max(shoulderW * 0.14, 7);
    const legUpperR = Math.max(shoulderW * 0.20, 10);
    const legLowerR = Math.max(shoulderW * 0.18, 9);
    const neckR     = Math.max(shoulderW * 0.12, 7);
    const headR     = Math.max(shoulderW * 0.42, torsoLen * 0.28);

    // Torso vertical
    addCapsule(shouldersMid, hipsMid, torsoR);

    // Shoulder bar and pelvis bar to broaden silhouette
    addCapsule(vLS, vRS, shoulderBarR);
    addCapsule(vLH, vRH, pelvisBarR);

    // Neck (shoulder mid to just below head center)
    if (NOSE && NOSE.visibility > 0.4) {
      const headCenter = toSceneXY(NOSE, scale, inverseHands);
      const neckEnd = headCenter.clone().add(new THREE.Vector3(0, -headR * 0.9, 0));
      addCapsule(shouldersMid, neckEnd, neckR);
      // Head - solid filled circle (flat, always faces camera)
      const head = getCircle(headR);
      head.position.copy(headCenter);
    }

    // Arms (extended by 40% for better proportions)
    const armExtensionFactor = 1.4; // Make arms 40% longer
    
    // LEFT ARM - Render if MediaPipe detects it with any visibility
    if (L_ELB && L_WRI && L_SHO.visibility > 0.01 && L_ELB.visibility > 0.01) {
      const elbowPos = toSceneXY(L_ELB, scale, inverseHands);
      
      // Extend upper arm (shoulder to elbow)
      const upperArmVec = new THREE.Vector3().subVectors(elbowPos, vLS);
      const extendedElbowPos = vLS.clone().add(upperArmVec.multiplyScalar(armExtensionFactor));
      
      addCapsule(vLS, extendedElbowPos, armUpperR);
      addJointSphere(vLS, armUpperR); // shoulder
      addJointSphere(extendedElbowPos, armUpperR); // elbow
      
      if (L_WRI.visibility > 0.01) { // Trust any detection from MediaPipe
        const wristPos = toSceneXY(L_WRI, scale, inverseHands);
        
        // Extend forearm (elbow to wrist)
        const forearmVec = new THREE.Vector3().subVectors(wristPos, elbowPos);
        const extendedWristPos = extendedElbowPos.clone().add(forearmVec.multiplyScalar(armExtensionFactor));
        
        addCapsule(extendedElbowPos, extendedWristPos, armLowerR);
        addJointSphere(extendedWristPos, armLowerR); // wrist
        
        // Add hand extension (wrist to index finger)
        const L_INDEX = inverseHands ? landmarks[20] : landmarks[19]; // Left index finger (swap if inverse)
        if (L_INDEX && L_INDEX.visibility > 0.01) { // Trust any detection
          const indexPos = toSceneXY(L_INDEX, scale, inverseHands);
          const handVec = new THREE.Vector3().subVectors(indexPos, wristPos);
          const extendedIndexPos = extendedWristPos.clone().add(handVec.multiplyScalar(armExtensionFactor));
          const handR = armLowerR * 0.7; // Slightly thinner than forearm
          addCapsule(extendedWristPos, extendedIndexPos, handR);
          addJointSphere(extendedIndexPos, handR * 0.8); // finger tip
        } else {
          // If no finger detected, extend hand by 40% of extended forearm length
          const handExtension = extendedWristPos.clone().add(forearmVec.clone().normalize().multiplyScalar(forearmVec.length() * 0.4));
          const handR = armLowerR * 0.7;
          addCapsule(extendedWristPos, handExtension, handR);
        }
      }
    }
    
    // RIGHT ARM - Render if MediaPipe detects it with any visibility
    if (R_ELB && R_WRI && R_SHO.visibility > 0.01 && R_ELB.visibility > 0.01) {
      const elbowPos = toSceneXY(R_ELB, scale, inverseHands);
      
      // Extend upper arm (shoulder to elbow)
      const upperArmVec = new THREE.Vector3().subVectors(elbowPos, vRS);
      const extendedElbowPos = vRS.clone().add(upperArmVec.multiplyScalar(armExtensionFactor));
      
      addCapsule(vRS, extendedElbowPos, armUpperR);
      addJointSphere(vRS, armUpperR); // shoulder
      addJointSphere(extendedElbowPos, armUpperR); // elbow
      
      if (R_WRI.visibility > 0.01) { // Trust any detection from MediaPipe
        const wristPos = toSceneXY(R_WRI, scale, inverseHands);
        
        // Extend forearm (elbow to wrist)
        const forearmVec = new THREE.Vector3().subVectors(wristPos, elbowPos);
        const extendedWristPos = extendedElbowPos.clone().add(forearmVec.multiplyScalar(armExtensionFactor));
        
        addCapsule(extendedElbowPos, extendedWristPos, armLowerR);
        addJointSphere(extendedWristPos, armLowerR); // wrist
        
        // Add hand extension (wrist to index finger)
        const R_INDEX = inverseHands ? landmarks[19] : landmarks[20]; // Right index finger (swap if inverse)
        if (R_INDEX && R_INDEX.visibility > 0.01) { // Trust any detection
          const indexPos = toSceneXY(R_INDEX, scale, inverseHands);
          const handVec = new THREE.Vector3().subVectors(indexPos, wristPos);
          const extendedIndexPos = extendedWristPos.clone().add(handVec.multiplyScalar(armExtensionFactor));
          const handR = armLowerR * 0.7; // Slightly thinner than forearm
          addCapsule(extendedWristPos, extendedIndexPos, handR);
          addJointSphere(extendedIndexPos, handR * 0.8); // finger tip
        } else {
          // If no finger detected, extend hand by 40% of extended forearm length
          const handExtension = extendedWristPos.clone().add(forearmVec.clone().normalize().multiplyScalar(forearmVec.length() * 0.4));
          const handR = armLowerR * 0.7;
          addCapsule(extendedWristPos, handExtension, handR);
        }
      }
    }

    // Legs - Render if MediaPipe detects them with any visibility
    if (L_KNE && L_ANK && L_HIP.visibility > 0.01 && L_KNE.visibility > 0.01) {
      const kneePos = toSceneXY(L_KNE, scale, inverseHands);
      addCapsule(vLH, kneePos, legUpperR);
      addJointSphere(vLH, legUpperR); // hip
      addJointSphere(kneePos, legUpperR); // knee
      if (L_ANK.visibility > 0.01) { // Trust any detection
        const anklePos = toSceneXY(L_ANK, scale, inverseHands);
        addCapsule(kneePos, anklePos, legLowerR);
        addJointSphere(anklePos, legLowerR); // ankle
      }
    }
    if (R_KNE && R_ANK && R_HIP.visibility > 0.01 && R_KNE.visibility > 0.01) {
      const kneePos = toSceneXY(R_KNE, scale, inverseHands);
      addCapsule(vRH, kneePos, legUpperR);
      addJointSphere(vRH, legUpperR); // hip
      addJointSphere(kneePos, legUpperR); // knee
      if (R_ANK.visibility > 0.01) { // Trust any detection
        const anklePos = toSceneXY(R_ANK, scale, inverseHands);
        addCapsule(kneePos, anklePos, legLowerR);
        addJointSphere(anklePos, legLowerR); // ankle
      }
    }
    
    // Hide unused pooled objects
    for (let i = pool.cylinderIndex; i < pool.cylinders.length; i++) {
      pool.cylinders[i].visible = false;
    }
    for (let i = pool.sphereIndex; i < pool.spheres.length; i++) {
      pool.spheres[i].visible = false;
    }
    for (let i = pool.circleIndex; i < pool.circles.length; i++) {
      pool.circles[i].visible = false;
    }
  });

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Dispose all pooled geometries and material
      const pool = poolRef.current;
      pool.cylinders.forEach(mesh => {
        mesh.geometry?.dispose();
      });
      pool.spheres.forEach(mesh => {
        mesh.geometry?.dispose();
      });
      pool.circles.forEach(mesh => {
        mesh.geometry?.dispose();
      });
      material.dispose();
    };
  }, [material]);

  return (
    <group ref={groupRef} position={[0, 0, 0]} />
  );
};

export default SimpleSkeleton;
