import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import * as THREE from 'three';

const DancerSegmentation = () => {
  const groupRef = useRef();
  const poseDataRef = useRef(null);
  const { poseData } = usePoseDetection();
  
  // Movement detection state
  const lastPoseRef = useRef(null);
  const movementThreshold = 0.02;
  const stillnessTimeoutRef = useRef(0);
  const isStillRef = useRef(false);

  // Update pose data reference
  useEffect(() => {
    poseDataRef.current = poseData;
  }, [poseData]);

  // Calculate movement between poses
  const calculateMovement = (currentPose, lastPose) => {
    if (!currentPose || !lastPose || !currentPose.landmarks || !lastPose.landmarks) {
      return 0;
    }

    let totalMovement = 0;
    const keyPoints = [11, 12, 15, 16, 23, 24]; // shoulders, wrists, hips
    
    keyPoints.forEach(index => {
      const current = currentPose.landmarks[index];
      const last = lastPose.landmarks[index];
      
      if (current && last && current.visibility > 0.5 && last.visibility > 0.5) {
        const dx = current.x - last.x;
        const dy = current.y - last.y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
      }
    });

    return totalMovement / keyPoints.length;
  };

  // Create silhouette from pose landmarks
  const createSilhouette = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return null;

    // Key landmarks for body outline
    const bodyOutline = [
      // Head outline
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      // Shoulders and arms
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
      // Torso
      11, 12, 23, 24,
      // Legs
      23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ];

    const points = [];
    bodyOutline.forEach(index => {
      const landmark = landmarks[index];
      if (landmark && landmark.visibility > 0.5) {
        // Convert to 3D coordinates
        const x = (landmark.x - 0.5) * 100;
        const y = (0.5 - landmark.y) * 100;
        const z = landmark.z * 50;
        points.push(new THREE.Vector3(x, y, z));
      }
    });

    return points;
  };

  // Create body segments
  const createBodySegments = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return [];

    const segments = [];

    // Head
    const headLandmarks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const headPoints = headLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (headPoints.length > 0) {
      segments.push({
        type: 'head',
        points: headPoints,
        position: headPoints[0] // Use nose as center
      });
    }

    // Left arm
    const leftArmLandmarks = [11, 13, 15, 17, 19, 21];
    const leftArmPoints = leftArmLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (leftArmPoints.length > 0) {
      segments.push({
        type: 'leftArm',
        points: leftArmPoints,
        position: leftArmPoints[0]
      });
    }

    // Right arm
    const rightArmLandmarks = [12, 14, 16, 18, 20, 22];
    const rightArmPoints = rightArmLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (rightArmPoints.length > 0) {
      segments.push({
        type: 'rightArm',
        points: rightArmPoints,
        position: rightArmPoints[0]
      });
    }

    // Torso
    const torsoLandmarks = [11, 12, 23, 24];
    const torsoPoints = torsoLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (torsoPoints.length > 0) {
      segments.push({
        type: 'torso',
        points: torsoPoints,
        position: new THREE.Vector3(
          torsoPoints.reduce((sum, p) => sum + p.x, 0) / torsoPoints.length,
          torsoPoints.reduce((sum, p) => sum + p.y, 0) / torsoPoints.length,
          torsoPoints.reduce((sum, p) => sum + p.z, 0) / torsoPoints.length
        )
      });
    }

    // Left leg
    const leftLegLandmarks = [23, 25, 27, 29, 31];
    const leftLegPoints = leftLegLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (leftLegPoints.length > 0) {
      segments.push({
        type: 'leftLeg',
        points: leftLegPoints,
        position: leftLegPoints[0]
      });
    }

    // Right leg
    const rightLegLandmarks = [24, 26, 28, 30, 32];
    const rightLegPoints = rightLegLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5)
      .map(l => new THREE.Vector3((l.x - 0.5) * 100, (0.5 - l.y) * 100, l.z * 50));
    
    if (rightLegPoints.length > 0) {
      segments.push({
        type: 'rightLeg',
        points: rightLegPoints,
        position: rightLegPoints[0]
      });
    }

    return segments;
  };

  useFrame(() => {
    if (!groupRef.current || !poseDataRef.current) return;

    const currentPose = poseDataRef.current;
    const landmarks = currentPose.landmarks;
    
    if (!landmarks) return;

    // Check for movement
    const movement = lastPoseRef.current ? 
      calculateMovement(currentPose, lastPoseRef.current) : 0;
    
    // Update stillness state
    if (movement < movementThreshold) {
      stillnessTimeoutRef.current += 1;
      if (stillnessTimeoutRef.current > 30) {
        isStillRef.current = true;
      }
    } else {
      stillnessTimeoutRef.current = 0;
      isStillRef.current = false;
    }

    // Only update if there's movement or we're not still
    if (movement >= movementThreshold || !isStillRef.current) {
      const segments = createBodySegments(landmarks);
      
      // Clear existing children
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }

      // Create silhouette segments
      segments.forEach(segment => {
        if (segment.points.length > 0) {
          // Create different shapes for different body parts
          let geometry;
          let scale = 1;
          
          switch (segment.type) {
            case 'head':
              geometry = new THREE.SphereGeometry(4, 16, 16);
              scale = 1.2;
              break;
            case 'torso':
              geometry = new THREE.BoxGeometry(8, 12, 4);
              scale = 1.5;
              break;
            case 'leftArm':
            case 'rightArm':
              geometry = new THREE.CapsuleGeometry(1.5, 8, 4, 8);
              scale = 1.0;
              break;
            case 'leftLeg':
            case 'rightLeg':
              geometry = new THREE.CapsuleGeometry(2, 10, 4, 8);
              scale = 1.0;
              break;
            default:
              geometry = new THREE.SphereGeometry(2, 8, 6);
          }
          
          const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.copy(segment.position);
          mesh.scale.setScalar(scale);
          
          // Add slight rotation for more natural look
          mesh.rotation.z = Math.sin(Date.now() * 0.001) * 0.1;
          
          groupRef.current.add(mesh);
        }
      });
    }

    // Store current pose for next frame
    lastPoseRef.current = currentPose;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} />
  );
};

export default DancerSegmentation;
