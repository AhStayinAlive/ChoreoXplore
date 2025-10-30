import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import useStore from '../core/store';
import * as THREE from 'three';

const SimpleSkeleton = ({ scale: modeScale = 1.0 }) => {
  const groupRef = useRef();
  const poseDataRef = useRef(null);
  const { poseData } = usePoseDetection();
  const skeletonVisible = useStore(s => s.skeletonVisible);

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
  const SILHOUETTE_COLOR = new THREE.Color(0xffffff);

  // Reusable vectors
  const vUp = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  // Helpers
  function toSceneXY(lm, scale) {
    return new THREE.Vector3(
      (lm.x - 0.5) * 200 * scale,
      (0.5 - lm.y) * 200 * scale,
      2 // keep in front
    );
  }

  function addCapsule(start, end, radius, addCaps = true) {
    const dir = tmpB.copy(end).sub(start);
    const length = dir.length();
    if (length <= 0.0001) return;

    const forward = dir.clone().normalize();
    const mat = new THREE.MeshBasicMaterial({
      color: SILHOUETTE_COLOR,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      wireframe: false,
      transparent: false,
      opacity: 1.0
    });

    // Cylinder body
    const cylGeo = new THREE.CylinderGeometry(radius, radius, length, 24, 1, false);
    const cyl = new THREE.Mesh(cylGeo, mat);
    cyl.position.copy(start).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(vUp, forward);
    cyl.renderOrder = 10;
    groupRef.current.add(cyl);
  }

  function addJointSphere(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({
      color: SILHOUETTE_COLOR,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      wireframe: false,
      transparent: false,
      opacity: 1.0
    });
    const capGeo = new THREE.SphereGeometry(radius, 24, 16);
    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.copy(pos);
    cap.renderOrder = 10;
    groupRef.current.add(cap);
  }

  useFrame(() => {
    if (!groupRef.current || !poseDataRef.current || !skeletonVisible) {
      // Clear existing children if skeleton is not visible
      if (groupRef.current && !skeletonVisible) {
        while (groupRef.current.children.length > 0) {
          const child = groupRef.current.children.pop();
          child.geometry?.dispose?.();
          child.material?.dispose?.();
        }
      }
      return;
    }

    const currentPose = poseDataRef.current;
    const landmarks = currentPose.landmarks;
    if (!landmarks || landmarks.length < 33) return;

    // Fixed scale - larger base scale so avatar stays visible
    let scale = 22 * modeScale;

    // Clear existing children and dispose to avoid leaks
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }

    // Precompute key anchor points in scene space
    const L_SHO = landmarks[11], R_SHO = landmarks[12];
    const L_HIP = landmarks[23], R_HIP = landmarks[24];
    const L_ELB = landmarks[13], R_ELB = landmarks[14];
    const L_WRI = landmarks[15], R_WRI = landmarks[16];
    const L_KNE = landmarks[25], R_KNE = landmarks[26];
    const L_ANK = landmarks[27], R_ANK = landmarks[28];
    const NOSE  = landmarks[0];

    if (!(L_SHO && R_SHO && L_HIP && R_HIP)) return;
    const vLS = toSceneXY(L_SHO, scale);
    const vRS = toSceneXY(R_SHO, scale);
    const vLH = toSceneXY(L_HIP, scale);
    const vRH = toSceneXY(R_HIP, scale);
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
      const headCenter = toSceneXY(NOSE, scale);
      const neckEnd = headCenter.clone().add(new THREE.Vector3(0, -headR * 0.9, 0));
      addCapsule(shouldersMid, neckEnd, neckR);
      // Head - solid filled circle (flat, always faces camera)
      const headGeo = new THREE.CircleGeometry(headR, 32);
      const headMat = new THREE.MeshBasicMaterial({ 
        color: SILHOUETTE_COLOR,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1.0,
        wireframe: false,
        depthTest: true,
        depthWrite: true
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(headCenter);
      head.renderOrder = 10; // Render on top
      groupRef.current.add(head);
    }

    // Arms
    if (L_ELB && L_WRI && L_SHO.visibility > 0.2 && L_ELB.visibility > 0.2) {
      const elbowPos = toSceneXY(L_ELB, scale);
      addCapsule(vLS, elbowPos, armUpperR);
      addJointSphere(vLS, armUpperR); // shoulder
      addJointSphere(elbowPos, armUpperR); // elbow
      if (L_WRI.visibility > 0.2) {
        const wristPos = toSceneXY(L_WRI, scale);
        addCapsule(elbowPos, wristPos, armLowerR);
        addJointSphere(wristPos, armLowerR); // wrist
      }
    }
    if (R_ELB && R_WRI && R_SHO.visibility > 0.2 && R_ELB.visibility > 0.2) {
      const elbowPos = toSceneXY(R_ELB, scale);
      addCapsule(vRS, elbowPos, armUpperR);
      addJointSphere(vRS, armUpperR); // shoulder
      addJointSphere(elbowPos, armUpperR); // elbow
      if (R_WRI.visibility > 0.2) {
        const wristPos = toSceneXY(R_WRI, scale);
        addCapsule(elbowPos, wristPos, armLowerR);
        addJointSphere(wristPos, armLowerR); // wrist
      }
    }

    // Legs
    if (L_KNE && L_ANK && L_HIP.visibility > 0.1 && L_KNE.visibility > 0.1) {
      const kneePos = toSceneXY(L_KNE, scale);
      addCapsule(vLH, kneePos, legUpperR);
      addJointSphere(vLH, legUpperR); // hip
      addJointSphere(kneePos, legUpperR); // knee
      if (L_ANK.visibility > 0.1) {
        const anklePos = toSceneXY(L_ANK, scale);
        addCapsule(kneePos, anklePos, legLowerR);
        addJointSphere(anklePos, legLowerR); // ankle
      }
    }
    if (R_KNE && R_ANK && R_HIP.visibility > 0.1 && R_KNE.visibility > 0.1) {
      const kneePos = toSceneXY(R_KNE, scale);
      addCapsule(vRH, kneePos, legUpperR);
      addJointSphere(vRH, legUpperR); // hip
      addJointSphere(kneePos, legUpperR); // knee
      if (R_ANK.visibility > 0.1) {
        const anklePos = toSceneXY(R_ANK, scale);
        addCapsule(kneePos, anklePos, legLowerR);
        addJointSphere(anklePos, legLowerR); // ankle
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} />
  );
};

export default SimpleSkeleton;
