import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import * as THREE from 'three';

const SilhouetteEffect = () => {
  const groupRef = useRef();
  const poseDataRef = useRef(null);
  const { poseData } = usePoseDetection();
  
  // Movement detection state
  const lastPoseRef = useRef(null);
  const movementThreshold = 0.02;
  const stillnessTimeoutRef = useRef(0);
  const isStillRef = useRef(false);
  
  // Smoothing state
  const smoothedPositionsRef = useRef({});
  const smoothingFactor = 0.7; // Higher = more smoothing

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

  // Create connected body outline
  const createBodyOutline = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return null;

    // Define body outline connections (following MediaPipe pose connections)
    const connections = [
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

    const lines = [];
    
    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        const startPos = new THREE.Vector3(
          (start.x - 0.5) * 120,
          (0.5 - start.y) * 120,
          start.z * 60
        );
        const endPos = new THREE.Vector3(
          (end.x - 0.5) * 120,
          (0.5 - end.y) * 120,
          end.z * 60
        );
        
        lines.push({ start: startPos, end: endPos });
      }
    });

    return lines;
  };

  // Create body segments with proper shapes
  const createBodySegments = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return [];

    const segments = [];

    // Calculate body center for centering
    const bodyCenter = new THREE.Vector3(
      (landmarks[11].x + landmarks[12].x + landmarks[23].x + landmarks[24].x) / 4,
      (landmarks[11].y + landmarks[12].y + landmarks[23].y + landmarks[24].y) / 4,
      (landmarks[11].z + landmarks[12].z + landmarks[23].z + landmarks[24].z) / 4
    );

    // Head (using face landmarks)
    const headLandmarks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const headPoints = headLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (headPoints.length > 0) {
      const headCenter = new THREE.Vector3(
        headPoints.reduce((sum, p) => sum + p.x, 0) / headPoints.length,
        headPoints.reduce((sum, p) => sum + p.y, 0) / headPoints.length,
        headPoints.reduce((sum, p) => sum + p.z, 0) / headPoints.length
      );
      
      // Center relative to body center
      const relativePos = new THREE.Vector3(
        (headCenter.x - bodyCenter.x) * 100,
        (bodyCenter.y - headCenter.y) * 100, // Flip Y and center
        (headCenter.z - bodyCenter.z) * 50
      );
      
      segments.push({
        type: 'head',
        position: relativePos,
        size: 6
      });
    }

    // Torso (shoulders to hips) - centered at origin
    const torsoLandmarks = [11, 12, 23, 24];
    const torsoPoints = torsoLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (torsoPoints.length >= 2) {
      segments.push({
        type: 'torso',
        position: new THREE.Vector3(0, 0, 0), // Always centered
        size: 10
      });
    }

    // Left arm
    const leftArmLandmarks = [11, 13, 15];
    const leftArmPoints = leftArmLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (leftArmPoints.length >= 2) {
      const leftArmCenter = new THREE.Vector3(
        leftArmPoints.reduce((sum, p) => sum + p.x, 0) / leftArmPoints.length,
        leftArmPoints.reduce((sum, p) => sum + p.y, 0) / leftArmPoints.length,
        leftArmPoints.reduce((sum, p) => sum + p.z, 0) / leftArmPoints.length
      );
      
      const relativePos = new THREE.Vector3(
        (leftArmCenter.x - bodyCenter.x) * 100,
        (bodyCenter.y - leftArmCenter.y) * 100,
        (leftArmCenter.z - bodyCenter.z) * 50
      );
      
      segments.push({
        type: 'leftArm',
        position: relativePos,
        size: 5
      });
    }

    // Right arm
    const rightArmLandmarks = [12, 14, 16];
    const rightArmPoints = rightArmLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (rightArmPoints.length >= 2) {
      const rightArmCenter = new THREE.Vector3(
        rightArmPoints.reduce((sum, p) => sum + p.x, 0) / rightArmPoints.length,
        rightArmPoints.reduce((sum, p) => sum + p.y, 0) / rightArmPoints.length,
        rightArmPoints.reduce((sum, p) => sum + p.z, 0) / rightArmPoints.length
      );
      
      const relativePos = new THREE.Vector3(
        (rightArmCenter.x - bodyCenter.x) * 100,
        (bodyCenter.y - rightArmCenter.y) * 100,
        (rightArmCenter.z - bodyCenter.z) * 50
      );
      
      segments.push({
        type: 'rightArm',
        position: relativePos,
        size: 5
      });
    }

    // Left leg
    const leftLegLandmarks = [23, 25, 27];
    const leftLegPoints = leftLegLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (leftLegPoints.length >= 2) {
      const leftLegCenter = new THREE.Vector3(
        leftLegPoints.reduce((sum, p) => sum + p.x, 0) / leftLegPoints.length,
        leftLegPoints.reduce((sum, p) => sum + p.y, 0) / leftLegPoints.length,
        leftLegPoints.reduce((sum, p) => sum + p.z, 0) / leftLegPoints.length
      );
      
      const relativePos = new THREE.Vector3(
        (leftLegCenter.x - bodyCenter.x) * 100,
        (bodyCenter.y - leftLegCenter.y) * 100,
        (leftLegCenter.z - bodyCenter.z) * 50
      );
      
      segments.push({
        type: 'leftLeg',
        position: relativePos,
        size: 6
      });
    }

    // Right leg
    const rightLegLandmarks = [24, 26, 28];
    const rightLegPoints = rightLegLandmarks
      .map(i => landmarks[i])
      .filter(l => l && l.visibility > 0.5);
    
    if (rightLegPoints.length >= 2) {
      const rightLegCenter = new THREE.Vector3(
        rightLegPoints.reduce((sum, p) => sum + p.x, 0) / rightLegPoints.length,
        rightLegPoints.reduce((sum, p) => sum + p.y, 0) / rightLegPoints.length,
        rightLegPoints.reduce((sum, p) => sum + p.z, 0) / rightLegPoints.length
      );
      
      const relativePos = new THREE.Vector3(
        (rightLegCenter.x - bodyCenter.x) * 100,
        (bodyCenter.y - rightLegCenter.y) * 100,
        (rightLegCenter.z - bodyCenter.z) * 50
      );
      
      segments.push({
        type: 'rightLeg',
        position: relativePos,
        size: 6
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
      const lines = createBodyOutline(landmarks);
      
      
      // Clear existing children
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }

      // Create body segments with smoothing
      segments.forEach(segment => {
        let geometry;
        
        switch (segment.type) {
          case 'head':
            geometry = new THREE.SphereGeometry(segment.size, 16, 16);
            break;
          case 'torso':
            geometry = new THREE.BoxGeometry(segment.size, segment.size * 1.5, segment.size * 0.6);
            break;
          case 'leftArm':
          case 'rightArm':
            geometry = new THREE.CapsuleGeometry(segment.size * 0.3, segment.size, 4, 8);
            break;
          case 'leftLeg':
          case 'rightLeg':
            geometry = new THREE.CapsuleGeometry(segment.size * 0.4, segment.size * 1.2, 4, 8);
            break;
          default:
            geometry = new THREE.SphereGeometry(segment.size * 0.5, 8, 6);
        }
        
        const material = new THREE.MeshBasicMaterial({ 
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Apply smoothing to prevent teleporting
        const key = segment.type;
        if (smoothedPositionsRef.current[key]) {
          const smoothedPos = smoothedPositionsRef.current[key].clone();
          smoothedPos.lerp(segment.position, 1 - smoothingFactor);
          mesh.position.copy(smoothedPos);
          smoothedPositionsRef.current[key] = smoothedPos;
        } else {
          mesh.position.copy(segment.position);
          smoothedPositionsRef.current[key] = segment.position.clone();
        }
        
        groupRef.current.add(mesh);
      });

      // Create connecting lines
      if (lines) {
        lines.forEach(line => {
          const geometry = new THREE.BufferGeometry().setFromPoints([line.start, line.end]);
          const material = new THREE.LineBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            linewidth: 3
          });
          const lineMesh = new THREE.Line(geometry, material);
          groupRef.current.add(lineMesh);
        });
      }
    }

    // Store current pose for next frame
    lastPoseRef.current = currentPose;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} />
  );
};

export default SilhouetteEffect;
