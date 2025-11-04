import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import usePoseDetection from '../hooks/usePoseDetection';
import { getLeftHandAnchor as getLeftHandPosition, getRightHandAnchor as getRightHandPosition } from '../utils/handTracking';

const HandLightningEffect = () => {
  const leftLightningRef = useRef();
  const rightLightningRef = useRef();
  const connectionLightningRef = useRef();
  const { poseData } = usePoseDetection();
  const handEffect = useVisStore(s => s.params.handEffect);
  const handSelection = handEffect?.handSelection || 'none';
  const lightningSettings = handEffect?.lightning || {};
  
  // Extract settings with defaults
  const color = lightningSettings.color || '#00ffff';
  const intensity = lightningSettings.intensity || 0.8;
  const thickness = lightningSettings.thickness || 0.15;
  const segments = Math.floor(lightningSettings.segments || 20);
  const flickerSpeed = lightningSettings.flickerSpeed || 1.0;
  const chaos = lightningSettings.chaos || 0.5;
  const edgeMode = lightningSettings.edgeMode || 'corners'; // 'corners' or 'edges'
  
  // Noise function for lightning flicker (simple Perlin-like noise)
  const noise = (x) => {
    const n = Math.sin(x) * 43758.5453123;
    return n - Math.floor(n);
  };
  
  // Create lightning path with noise-based displacement
  const createLightningPath = (start, end, segments, time, chaos) => {
    const points = [];
    points.push(start.clone());
    
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const segmentLength = length / segments;
    
    // Perpendicular vector for displacement
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const basePoint = new THREE.Vector3().lerpVectors(start, end, t);
      
      // Add noise-based displacement
      const noiseValue = noise(i * 0.5 + time * flickerSpeed) * 2 - 1;
      const displacement = chaos * segmentLength * noiseValue * (1 - Math.abs(t * 2 - 1)); // Taper at ends
      
      basePoint.add(perpendicular.clone().multiplyScalar(displacement * 100));
      
      // Add secondary displacement for more chaos
      const secondaryNoise = noise(i * 1.3 + time * flickerSpeed * 1.5) * 2 - 1;
      basePoint.z += secondaryNoise * displacement * 50;
      
      points.push(basePoint);
    }
    
    points.push(end.clone());
    return points;
  };
  
  // Get screen edge positions in 3D space (SimpleSkeleton coordinate system)
  const getScreenEdgePosition = (handPos, mode) => {
    const scale = 22;
    const handX = (handPos.x - 0.5) * 200 * scale;
    const handY = (0.5 - handPos.y) * 200 * scale;
    
    // Calculate edge positions (matching the 20000x20000 plane)
    const maxX = 10000;
    const maxY = 10000;
    
    switch(mode) {
      case 'nearest': {
        // Go to the nearest edge
        const distToLeft = Math.abs(handX + maxX);
        const distToRight = Math.abs(handX - maxX);
        const distToTop = Math.abs(handY - maxY);
        const distToBottom = Math.abs(handY + maxY);
        
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist === distToLeft) return new THREE.Vector3(-maxX, handY, 0);
        if (minDist === distToRight) return new THREE.Vector3(maxX, handY, 0);
        if (minDist === distToTop) return new THREE.Vector3(handX, maxY, 0);
        return new THREE.Vector3(handX, -maxY, 0);
      }
        
      case 'corners':
      default: {
        // Go to nearest corner
        const corners = [
          new THREE.Vector3(-maxX, maxY, 0),
          new THREE.Vector3(maxX, maxY, 0),
          new THREE.Vector3(maxX, -maxY, 0),
          new THREE.Vector3(-maxX, -maxY, 0)
        ];
        
        let nearestCorner = corners[0];
        let minDistance = handX * handX + handY * handY + 100000000;
        
        corners.forEach(corner => {
          const dist = Math.pow(handX - corner.x, 2) + Math.pow(handY - corner.y, 2);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCorner = corner;
          }
        });
        
        return nearestCorner;
      }
    }
  };
  
  // Create material with glow effect
  const createLightningMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: thickness * 10 // Note: linewidth doesn't work in WebGL, we'll use tube geometry
    });
  }, [color, intensity, thickness]);
  
  // Create geometries for lightning
  const createGeometry = useMemo(() => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(0, 0, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [segments]);
  
  // Clone for each lightning bolt
  const leftGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const rightGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const connectionGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  
  const leftMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  const rightMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  const connectionMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  
  // Update color when it changes
  useEffect(() => {
    const colorObj = new THREE.Color(color);
    if (leftMaterial) leftMaterial.color = colorObj;
    if (rightMaterial) rightMaterial.color = colorObj;
    if (connectionMaterial) connectionMaterial.color = colorObj;
  }, [color, leftMaterial, rightMaterial, connectionMaterial]);
  
  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
    const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
    
    const leftHandPos = leftHandEnabled ? getLeftHandPosition(poseData?.landmarks) : null;
    const rightHandPos = rightHandEnabled ? getRightHandPosition(poseData?.landmarks) : null;
    
    // Update opacity with flicker
    const flickerIntensity = intensity * (0.8 + 0.2 * noise(time * flickerSpeed * 10));
    
    // Handle both hands mode - lightning between hands
    if (handSelection === 'both' && leftHandPos && rightHandPos && 
        leftHandPos.visibility > 0.3 && rightHandPos.visibility > 0.3) {
      
      // Convert hand positions to 3D coordinates
      const scale = 22;
      const leftPos = new THREE.Vector3(
        (leftHandPos.x - 0.5) * 200 * scale,
        (0.5 - leftHandPos.y) * 200 * scale,
        0
      );
      const rightPos = new THREE.Vector3(
        (rightHandPos.x - 0.5) * 200 * scale,
        (0.5 - rightHandPos.y) * 200 * scale,
        0
      );
      
      // Create lightning path between hands
      const connectionPoints = createLightningPath(leftPos, rightPos, segments, time, chaos);
      
      if (connectionLightningRef.current) {
        connectionGeometry.setFromPoints(connectionPoints);
        connectionMaterial.opacity = flickerIntensity;
        connectionLightningRef.current.visible = true;
      }
      
      // Hide individual hand lightnings
      if (leftLightningRef.current) leftLightningRef.current.visible = false;
      if (rightLightningRef.current) rightLightningRef.current.visible = false;
      
    } else {
      // Single hand mode - lightning to screen edges
      if (connectionLightningRef.current) {
        connectionLightningRef.current.visible = false;
      }
      
      // Left hand lightning to edge
      if (leftHandPos && leftHandPos.visibility > 0.3 && leftLightningRef.current) {
        const scale = 22;
        const handPos3D = new THREE.Vector3(
          (leftHandPos.x - 0.5) * 200 * scale,
          (0.5 - leftHandPos.y) * 200 * scale,
          0
        );
        const edgePos = getScreenEdgePosition(leftHandPos, edgeMode);
        const points = createLightningPath(handPos3D, edgePos, segments, time, chaos);
        
        leftGeometry.setFromPoints(points);
        leftMaterial.opacity = flickerIntensity;
        leftLightningRef.current.visible = true;
      } else if (leftLightningRef.current) {
        leftLightningRef.current.visible = false;
      }
      
      // Right hand lightning to edge
      if (rightHandPos && rightHandPos.visibility > 0.3 && rightLightningRef.current) {
        const scale = 22;
        const handPos3D = new THREE.Vector3(
          (rightHandPos.x - 0.5) * 200 * scale,
          (0.5 - rightHandPos.y) * 200 * scale,
          0
        );
        const edgePos = getScreenEdgePosition(rightHandPos, edgeMode);
        const points = createLightningPath(handPos3D, edgePos, segments, time + 100, chaos); // Offset time for variation
        
        rightGeometry.setFromPoints(points);
        rightMaterial.opacity = flickerIntensity;
        rightLightningRef.current.visible = true;
      } else if (rightLightningRef.current) {
        rightLightningRef.current.visible = false;
      }
    }
  });
  
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  return (
    <>
      {leftHandEnabled && (
        <line ref={leftLightningRef} geometry={leftGeometry} material={leftMaterial} />
      )}
      {rightHandEnabled && (
        <line ref={rightLightningRef} geometry={rightGeometry} material={rightMaterial} />
      )}
      {handSelection === 'both' && (
        <line ref={connectionLightningRef} geometry={connectionGeometry} material={connectionMaterial} />
      )}
    </>
  );
};

export default HandLightningEffect;
