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
  
  // Branch lightning refs
  const leftBranchesRef = useRef([]);
  const rightBranchesRef = useRef([]);
  const connectionBranchesRef = useRef([]);
  
  // Glow layer refs (for outer glow)
  const leftGlowRef = useRef();
  const rightGlowRef = useRef();
  const connectionGlowRef = useRef();
  
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
  
  // Constants for lightning displacement
  const DISPLACEMENT_SCALE = 100;
  const SECONDARY_DISPLACEMENT_SCALE = 50;
  const BRANCH_COUNT = 3; // Number of branch bolts per main bolt
  const BRANCH_PROBABILITY = 0.3; // Probability of branch starting at each segment
  
  // Multi-octave noise function for more organic patterns
  const noise = (x) => {
    const n = Math.sin(x) * 43758.5453123;
    return n - Math.floor(n);
  };
  
  const multiOctaveNoise = (x, octaves = 3) => {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += noise(x * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  };
  
  // Create lightning path with multi-octave noise-based displacement
  const createLightningPath = (start, end, segments, time, chaos, isMainBolt = true) => {
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
      
      // Use multi-octave noise for more organic displacement
      const noiseValue = (multiOctaveNoise(i * 0.3 + time * flickerSpeed, 3) * 2 - 1);
      const envelope = (1 - Math.abs(t * 2 - 1)); // Taper at ends
      const displacement = chaos * segmentLength * noiseValue * envelope;
      
      basePoint.add(perpendicular.clone().multiplyScalar(displacement * DISPLACEMENT_SCALE));
      
      // Add secondary displacement with different frequency for more chaos
      const secondaryNoise = (multiOctaveNoise(i * 0.7 + time * flickerSpeed * 1.3, 2) * 2 - 1);
      basePoint.z += secondaryNoise * displacement * SECONDARY_DISPLACEMENT_SCALE;
      
      // Add tertiary fine detail (only for main bolt)
      if (isMainBolt) {
        const tertiaryNoise = noise(i * 2.0 + time * flickerSpeed * 2.5) * 2 - 1;
        const perpendicular2 = new THREE.Vector3(-perpendicular.z, 0, perpendicular.x).normalize();
        basePoint.add(perpendicular2.multiplyScalar(tertiaryNoise * displacement * 30));
      }
      
      points.push(basePoint);
    }
    
    points.push(end.clone());
    return points;
  };
  
  // Create branch lightning that splits off from main bolt
  const createBranchPaths = (mainPoints, segments, time, chaos) => {
    const branches = [];
    const numBranches = Math.min(BRANCH_COUNT, Math.floor(mainPoints.length / 3));
    
    for (let b = 0; b < numBranches; b++) {
      // Pick a random point along the main bolt (not at ends)
      const startIndex = Math.floor(mainPoints.length * (0.2 + Math.random() * 0.6));
      const startPoint = mainPoints[startIndex];
      
      // Create a branch that goes off at an angle
      const angle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
      const branchLength = (mainPoints.length - startIndex) * 0.3 * (0.5 + Math.random() * 0.5);
      
      const direction = new THREE.Vector3().subVectors(
        mainPoints[mainPoints.length - 1],
        startPoint
      ).normalize();
      
      // Rotate direction for branch
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const branchDir = new THREE.Vector3(
        direction.x * cos - direction.y * sin,
        direction.x * sin + direction.y * cos,
        direction.z
      );
      
      const endPoint = startPoint.clone().add(branchDir.multiplyScalar(branchLength * 200));
      
      // Create branch path with fewer segments
      const branchSegments = Math.max(3, Math.floor(segments * 0.3));
      const branchPoints = createLightningPath(
        startPoint, 
        endPoint, 
        branchSegments, 
        time + b * 10, // Offset time for each branch
        chaos * 0.7, // Less chaos for branches
        false // Not main bolt
      );
      
      branches.push(branchPoints);
    }
    
    return branches;
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
        let minDistance = Number.MAX_VALUE;
        
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
  // Core bright material for main bolt
  const createLightningMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color, intensity]);
  
  // Outer glow material (dimmer, wider)
  const createGlowMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity * 0.3, // Much dimmer for glow
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color, intensity]);
  
  // Branch material (dimmer than main bolt)
  const createBranchMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity * 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color, intensity]);
  
  // Create geometries for lightning (main bolts and glow layers)
  const createGeometry = useMemo(() => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(0, 0, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [segments]);
  
  // Create branch geometries (fewer segments)
  const createBranchGeometry = useMemo(() => {
    const branchSegments = Math.max(3, Math.floor(segments * 0.3));
    const points = [];
    for (let i = 0; i <= branchSegments; i++) {
      points.push(new THREE.Vector3(0, 0, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [segments]);
  
  // Clone for each lightning bolt and its glow
  const leftGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const rightGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const connectionGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  
  const leftGlowGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const rightGlowGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  const connectionGlowGeometry = useMemo(() => createGeometry.clone(), [createGeometry]);
  
  // Create branch geometries for each bolt
  const leftBranchGeometries = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchGeometry.clone()), 
    [createBranchGeometry]
  );
  const rightBranchGeometries = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchGeometry.clone()), 
    [createBranchGeometry]
  );
  const connectionBranchGeometries = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchGeometry.clone()), 
    [createBranchGeometry]
  );
  
  const leftMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  const rightMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  const connectionMaterial = useMemo(() => createLightningMaterial.clone(), [createLightningMaterial]);
  
  const leftGlowMaterial = useMemo(() => createGlowMaterial.clone(), [createGlowMaterial]);
  const rightGlowMaterial = useMemo(() => createGlowMaterial.clone(), [createGlowMaterial]);
  const connectionGlowMaterial = useMemo(() => createGlowMaterial.clone(), [createGlowMaterial]);
  
  const leftBranchMaterials = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchMaterial.clone()), 
    [createBranchMaterial]
  );
  const rightBranchMaterials = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchMaterial.clone()), 
    [createBranchMaterial]
  );
  const connectionBranchMaterials = useMemo(() => 
    Array.from({ length: BRANCH_COUNT }, () => createBranchMaterial.clone()), 
    [createBranchMaterial]
  );
  
  // Update color when it changes
  useEffect(() => {
    const colorObj = new THREE.Color(color);
    if (leftMaterial) leftMaterial.color = colorObj;
    if (rightMaterial) rightMaterial.color = colorObj;
    if (connectionMaterial) connectionMaterial.color = colorObj;
    if (leftGlowMaterial) leftGlowMaterial.color = colorObj;
    if (rightGlowMaterial) rightGlowMaterial.color = colorObj;
    if (connectionGlowMaterial) connectionGlowMaterial.color = colorObj;
    
    // Update branch materials
    leftBranchMaterials.forEach(mat => { if (mat) mat.color = colorObj; });
    rightBranchMaterials.forEach(mat => { if (mat) mat.color = colorObj; });
    connectionBranchMaterials.forEach(mat => { if (mat) mat.color = colorObj; });
  }, [color, leftMaterial, rightMaterial, connectionMaterial, leftGlowMaterial, rightGlowMaterial, connectionGlowMaterial, leftBranchMaterials, rightBranchMaterials, connectionBranchMaterials]);
  
  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
    const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
    
    const leftHandPos = leftHandEnabled ? getLeftHandPosition(poseData?.landmarks) : null;
    const rightHandPos = rightHandEnabled ? getRightHandPosition(poseData?.landmarks) : null;
    
    // More erratic, realistic flicker using multiple noise frequencies
    const primaryFlicker = multiOctaveNoise(time * flickerSpeed * 8, 2);
    const secondaryFlicker = noise(time * flickerSpeed * 20) * 0.3;
    const flickerIntensity = intensity * (0.6 + 0.4 * primaryFlicker + secondaryFlicker);
    
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
      
      // Create main lightning path between hands
      const connectionPoints = createLightningPath(leftPos, rightPos, segments, time, chaos, true);
      
      // Create glow layer (slightly offset for depth)
      const glowPoints = connectionPoints.map(p => {
        const offset = (noise(p.x * 0.1 + time) - 0.5) * 20;
        return p.clone().add(new THREE.Vector3(offset, offset * 0.5, 0));
      });
      
      // Create branch paths
      const branchPaths = createBranchPaths(connectionPoints, segments, time, chaos);
      
      if (connectionLightningRef.current) {
        connectionGeometry.setFromPoints(connectionPoints);
        connectionMaterial.opacity = flickerIntensity;
        connectionLightningRef.current.visible = true;
      }
      
      if (connectionGlowRef.current) {
        connectionGlowGeometry.setFromPoints(glowPoints);
        connectionGlowMaterial.opacity = flickerIntensity * 0.3;
        connectionGlowRef.current.visible = true;
      }
      
      // Update branches
      branchPaths.forEach((branchPoints, index) => {
        if (index < connectionBranchGeometries.length && connectionBranchesRef.current[index]) {
          connectionBranchGeometries[index].setFromPoints(branchPoints);
          connectionBranchMaterials[index].opacity = flickerIntensity * 0.6;
          connectionBranchesRef.current[index].visible = true;
        }
      });
      
      // Hide unused branches
      for (let i = branchPaths.length; i < BRANCH_COUNT; i++) {
        if (connectionBranchesRef.current[i]) {
          connectionBranchesRef.current[i].visible = false;
        }
      }
      
      // Hide individual hand lightnings
      if (leftLightningRef.current) leftLightningRef.current.visible = false;
      if (rightLightningRef.current) rightLightningRef.current.visible = false;
      if (leftGlowRef.current) leftGlowRef.current.visible = false;
      if (rightGlowRef.current) rightGlowRef.current.visible = false;
      leftBranchesRef.current.forEach(branch => { if (branch) branch.visible = false; });
      rightBranchesRef.current.forEach(branch => { if (branch) branch.visible = false; });
      
    } else {
      // Single hand mode - lightning to screen edges
      if (connectionLightningRef.current) connectionLightningRef.current.visible = false;
      if (connectionGlowRef.current) connectionGlowRef.current.visible = false;
      connectionBranchesRef.current.forEach(branch => { if (branch) branch.visible = false; });
      
      // Left hand lightning to edge
      if (leftHandPos && leftHandPos.visibility > 0.3 && leftLightningRef.current) {
        const scale = 22;
        const handPos3D = new THREE.Vector3(
          (leftHandPos.x - 0.5) * 200 * scale,
          (0.5 - leftHandPos.y) * 200 * scale,
          0
        );
        const edgePos = getScreenEdgePosition(leftHandPos, edgeMode);
        const points = createLightningPath(handPos3D, edgePos, segments, time, chaos, true);
        
        // Create glow layer
        const glowPoints = points.map(p => {
          const offset = (noise(p.x * 0.1 + time) - 0.5) * 20;
          return p.clone().add(new THREE.Vector3(offset, offset * 0.5, 0));
        });
        
        // Create branches
        const branchPaths = createBranchPaths(points, segments, time, chaos);
        
        leftGeometry.setFromPoints(points);
        leftMaterial.opacity = flickerIntensity;
        leftLightningRef.current.visible = true;
        
        if (leftGlowRef.current) {
          leftGlowGeometry.setFromPoints(glowPoints);
          leftGlowMaterial.opacity = flickerIntensity * 0.3;
          leftGlowRef.current.visible = true;
        }
        
        // Update branches
        branchPaths.forEach((branchPoints, index) => {
          if (index < leftBranchGeometries.length && leftBranchesRef.current[index]) {
            leftBranchGeometries[index].setFromPoints(branchPoints);
            leftBranchMaterials[index].opacity = flickerIntensity * 0.6;
            leftBranchesRef.current[index].visible = true;
          }
        });
        
        // Hide unused branches
        for (let i = branchPaths.length; i < BRANCH_COUNT; i++) {
          if (leftBranchesRef.current[i]) {
            leftBranchesRef.current[i].visible = false;
          }
        }
      } else {
        if (leftLightningRef.current) leftLightningRef.current.visible = false;
        if (leftGlowRef.current) leftGlowRef.current.visible = false;
        leftBranchesRef.current.forEach(branch => { if (branch) branch.visible = false; });
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
        const points = createLightningPath(handPos3D, edgePos, segments, time + 100, chaos, true); // Offset time for variation
        
        // Create glow layer
        const glowPoints = points.map(p => {
          const offset = (noise(p.x * 0.1 + time + 100) - 0.5) * 20;
          return p.clone().add(new THREE.Vector3(offset, offset * 0.5, 0));
        });
        
        // Create branches
        const branchPaths = createBranchPaths(points, segments, time + 100, chaos);
        
        rightGeometry.setFromPoints(points);
        rightMaterial.opacity = flickerIntensity;
        rightLightningRef.current.visible = true;
        
        if (rightGlowRef.current) {
          rightGlowGeometry.setFromPoints(glowPoints);
          rightGlowMaterial.opacity = flickerIntensity * 0.3;
          rightGlowRef.current.visible = true;
        }
        
        // Update branches
        branchPaths.forEach((branchPoints, index) => {
          if (index < rightBranchGeometries.length && rightBranchesRef.current[index]) {
            rightBranchGeometries[index].setFromPoints(branchPoints);
            rightBranchMaterials[index].opacity = flickerIntensity * 0.6;
            rightBranchesRef.current[index].visible = true;
          }
        });
        
        // Hide unused branches
        for (let i = branchPaths.length; i < BRANCH_COUNT; i++) {
          if (rightBranchesRef.current[i]) {
            rightBranchesRef.current[i].visible = false;
          }
        }
      } else {
        if (rightLightningRef.current) rightLightningRef.current.visible = false;
        if (rightGlowRef.current) rightGlowRef.current.visible = false;
        rightBranchesRef.current.forEach(branch => { if (branch) branch.visible = false; });
      }
    }
  });
  
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  return (
    <>
      {/* Left hand main bolt and glow */}
      {leftHandEnabled && (
        <>
          <line ref={leftLightningRef} geometry={leftGeometry} material={leftMaterial} />
          <line ref={leftGlowRef} geometry={leftGlowGeometry} material={leftGlowMaterial} />
          {leftBranchGeometries.map((geom, i) => (
            <line 
              key={`left-branch-${i}`}
              ref={el => { leftBranchesRef.current[i] = el; }}
              geometry={geom} 
              material={leftBranchMaterials[i]} 
            />
          ))}
        </>
      )}
      
      {/* Right hand main bolt and glow */}
      {rightHandEnabled && (
        <>
          <line ref={rightLightningRef} geometry={rightGeometry} material={rightMaterial} />
          <line ref={rightGlowRef} geometry={rightGlowGeometry} material={rightGlowMaterial} />
          {rightBranchGeometries.map((geom, i) => (
            <line 
              key={`right-branch-${i}`}
              ref={el => { rightBranchesRef.current[i] = el; }}
              geometry={geom} 
              material={rightBranchMaterials[i]} 
            />
          ))}
        </>
      )}
      
      {/* Connection between both hands */}
      {handSelection === 'both' && (
        <>
          <line ref={connectionLightningRef} geometry={connectionGeometry} material={connectionMaterial} />
          <line ref={connectionGlowRef} geometry={connectionGlowGeometry} material={connectionGlowMaterial} />
          {connectionBranchGeometries.map((geom, i) => (
            <line 
              key={`connection-branch-${i}`}
              ref={el => { connectionBranchesRef.current[i] = el; }}
              geometry={geom} 
              material={connectionBranchMaterials[i]} 
            />
          ))}
        </>
      )}
    </>
  );
};

export default HandLightningEffect;
