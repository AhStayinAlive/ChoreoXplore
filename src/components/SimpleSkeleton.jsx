import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import usePoseDetection from '../hooks/usePoseDetection';
import * as THREE from 'three';

const SimpleSkeleton = () => {
  const groupRef = useRef();
  const poseDataRef = useRef(null);
  const { poseData } = usePoseDetection();

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

  useFrame(() => {
    if (!groupRef.current || !poseDataRef.current) return;

    const currentPose = poseDataRef.current;
    const landmarks = currentPose.landmarks;
    
    if (!landmarks || landmarks.length < 33) return;

    // Calculate scale based on distance from camera (using hip width as reference - more stable)
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    let scale = 22; // 2x smaller default scale
    
    if (leftHip && rightHip && 
        leftHip.visibility > 0.1 && rightHip.visibility > 0.1) {
      // Calculate hip width (distance between hips) - more stable than shoulders
      const hipWidth = Math.sqrt(
        Math.pow(rightHip.x - leftHip.x, 2) + 
        Math.pow(rightHip.y - leftHip.y, 2)
      );
      
      // Normalize scale: closer = wider hips = bigger avatar
      // Typical hip width ranges from 0.1 to 0.3 in normalized coordinates
      const normalizedWidth = Math.max(0.05, Math.min(0.4, hipWidth));
      scale = 4.4 / normalizedWidth; // Invert so closer = bigger, 2x smaller base scale
      scale = Math.max(11.2, Math.min(44.4, scale)); // Clamp between 11.2x and 44.4x for 2x smaller skeleton
    }

    // Clear existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Draw skeleton lines - direct 1:1 mapping from MediaPipe
    poseConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      // Use lower visibility threshold for leg connections since they're often partially cut off
      const isLegConnection = startIdx >= 23 || endIdx >= 23;
      const visibilityThreshold = isLegConnection ? 0.1 : 0.5;
      
      if (start && end && start.visibility > visibilityThreshold && end.visibility > visibilityThreshold) {
        // Direct mapping - just scale and flip Y to match Three.js coordinate system
        const startX = (start.x - 0.5) * 200 * scale; // Center and scale
        const startY = (0.5 - start.y) * 200 * scale; // Flip Y and center
        const endX = (end.x - 0.5) * 200 * scale;
        const endY = (0.5 - end.y) * 200 * scale;

        // Create line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(startX, startY, 0),
          new THREE.Vector3(endX, endY, 0)
        ]);

        // Create green line material with bulkier appearance
        const material = new THREE.LineBasicMaterial({ 
          color: 0x00FF00, // Green
          linewidth: 12  // Even thicker lines
        });

        const line = new THREE.Line(geometry, material);
        line.position.z = 2; // Render skeleton in front
        groupRef.current.add(line);
      }
    });

    // Draw key points as small circles, but skip face and hand landmarks
    landmarks.forEach((landmark, index) => {
      // Use lower visibility threshold for leg landmarks since they're often partially cut off
      const visibilityThreshold = (index >= 23 && index <= 32) ? 0.1 : 0.5;
      
      if (landmark.visibility > visibilityThreshold) {
        // Skip face landmarks (0-10) and hand landmarks (15-21, 16-22) - we'll draw them separately
        if ((index >= 0 && index <= 10) || 
            (index >= 15 && index <= 21) || 
            (index >= 16 && index <= 22)) return;
        
        // Direct mapping - just scale and flip Y to match Three.js coordinate system
        const x = (landmark.x - 0.5) * 200 * scale; // Center and scale
        const y = (0.5 - landmark.y) * 200 * scale; // Flip Y and center

        const geometry = new THREE.CircleGeometry(10 * scale, 16); // Much larger circles
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x00FF00, // Green to match the lines
          transparent: true,
          opacity: 1.0  // Solid, no transparency
        });

        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(x, y, 2); // Render skeleton in front
        groupRef.current.add(circle);
      }
    });

    // Draw single big circle for head (using nose landmark as center)
    const nose = landmarks[0]; // Nose landmark
    if (nose && nose.visibility > 0.5) {
      const x = (nose.x - 0.5) * 200 * scale;
      const y = (0.5 - nose.y) * 200 * scale;

      const headGeometry = new THREE.CircleGeometry(20 * scale, 16); // Much bigger head circle
      const headMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00FF00,
        transparent: true,
        opacity: 1.0
      });

      const headCircle = new THREE.Mesh(headGeometry, headMaterial);
      headCircle.position.set(x, y, 2); // Render skeleton in front
      groupRef.current.add(headCircle);
    }

    // Draw single circles for hands (using wrist landmarks as center)
    const leftWrist = landmarks[15]; // Left wrist
    const rightWrist = landmarks[16]; // Right wrist

    if (leftWrist && leftWrist.visibility > 0.5) {
      const x = (leftWrist.x - 0.5) * 200 * scale;
      const y = (0.5 - leftWrist.y) * 200 * scale;

      const handGeometry = new THREE.CircleGeometry(8 * scale, 16); // Medium-sized hand circle
      const handMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00FF00,
        transparent: true,
        opacity: 1.0
      });

      const leftHandCircle = new THREE.Mesh(handGeometry, handMaterial);
      leftHandCircle.position.set(x, y, 0);
      groupRef.current.add(leftHandCircle);
    }

    if (rightWrist && rightWrist.visibility > 0.5) {
      const x = (rightWrist.x - 0.5) * 200 * scale;
      const y = (0.5 - rightWrist.y) * 200 * scale;

      const handGeometry = new THREE.CircleGeometry(8 * scale, 16); // Medium-sized hand circle
      const handMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00FF00,
        transparent: true,
        opacity: 1.0
      });

      const rightHandCircle = new THREE.Mesh(handGeometry, handMaterial);
      rightHandCircle.position.set(x, y, 0);
      groupRef.current.add(rightHandCircle);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} />
  );
};

export default SimpleSkeleton;
