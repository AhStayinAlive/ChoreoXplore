import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import usePoseDetection from '../hooks/usePoseDetection';
import { 
  getRightHandPosition,
  getLeftHandPosition
} from '../utils/handTracking';

const VerticalLinesMode = () => {
  const { poseData } = usePoseDetection();
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const handEffect = useVisStore(s => s.params.handEffect);
  const userColors = useStore(s => s.userColors);
  
  // Configuration
  const columns = 30; // Number of columns
  const rows = 15; // Number of rows
  const lineWidth = 0.08; // Thickness of lines (increased for visibility)
  const lineSegmentHeight = 800; // Height of each short line segment (increased)
  const pushRadius = 0.12; // How far hand influence reaches (small - just around hands)
  const pushStrength = 4.0; // How far lines move away (much more powerful)
  const immediateSmoothing = 0.3; // Smoothing when being pushed
  const fadeBackSpeed = 0.15; // Speed of return animation (immediate, smooth)
  
  // Create refs for each line
  const linesRef = useRef([]);
  const lineStates = useRef([]); // Store state for each line
  const clockRef = useRef(0);
  
  // Get hand selection
  const handSelection = handEffect?.handSelection || 'none';
  const leftHandEnabled = handSelection === 'left' || handSelection === 'both';
  const rightHandEnabled = handSelection === 'right' || handSelection === 'both';
  
  // Get motion reactivity setting
  const motionReactive = handEffect?.motionReactive !== false;
  
  // Convert hex color to THREE.Color
  const lineColor = useMemo(() => {
    const rgb = hexToRGB(userColors.assetColor);
    // hexToRGB already returns values in 0-1 range, don't divide by 255
    return new THREE.Color(rgb.r, rgb.g, rgb.b);
  }, [userColors.assetColor]);
  
  // Create line geometries and materials in a grid
  const lines = useMemo(() => {
    const lineArray = [];
    const totalWidth = 20000;
    const totalHeight = 20000;
    const spacingX = totalWidth / (columns + 1);
    const spacingY = totalHeight / (rows + 1);
    
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = -10000 + spacingX * (col + 1);
        const y = 10000 - spacingY * (row + 1);
        
        const geometry = new THREE.PlaneGeometry(lineWidth * 200, lineSegmentHeight);
        const material = new THREE.MeshBasicMaterial({ 
          color: lineColor.clone(), // Clone to ensure each line gets its own color instance
          transparent: true,
          opacity: params.intensity || 0.8,
          side: THREE.DoubleSide
        });
        
        // Initialize state for this line
        lineStates.current[index] = {
          originalX: x,
          originalY: y,
          currentX: x,
          lastPushTime: Infinity, // Never pushed yet - use Infinity so fade-back never triggers
          targetOffset: 0
        };
        
        lineArray.push({
          geometry,
          material,
          originalX: x,
          originalY: y,
          index
        });
        
        index++;
      }
    }
    
    return lineArray;
  }, [columns, rows, lineWidth, lineSegmentHeight, lineColor, params.intensity]);
  
  // Helper function to calculate line push based on hand proximity
  // Returns a push increment (not absolute position)
  const calculatePush = (lineCurrentX, lineY, handX, handY) => {
    const dx = handX - lineCurrentX; // Use current position, not original
    const dy = handY - lineY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < pushRadius * 10000) {
      const pushStrengthNormalized = 1 - (distance / (pushRadius * 10000));
      const direction = handX > lineCurrentX ? -1 : 1; // Push away from hand in X direction
      return direction * pushStrengthNormalized * pushStrength * 100; // Incremental push per frame
    }
    
    return 0;
  };
  
  // Lerp helper for smooth animation
  const lerp = (start, end, alpha) => {
    return start + (end - start) * alpha;
  };
  
  // Update line positions based on hand proximity
  useFrame((state, delta) => {
    if (!linesRef.current || linesRef.current.length === 0) return;
    
    clockRef.current += delta;
    const currentTime = clockRef.current;
    
    // Get hand positions (only if motion reactive is enabled)
    const leftHandPos = motionReactive && leftHandEnabled ? getLeftHandPosition(poseData?.landmarks) : null;
    const rightHandPos = motionReactive && rightHandEnabled ? getRightHandPosition(poseData?.landmarks) : null;
    
    // Convert hand positions to coordinate system (same as SimpleSkeleton)
    const scale = 22;
    const getHandCoords = (handPos) => {
      if (!handPos || handPos.visibility < 0.3) return null;
      const x = (handPos.x - 0.5) * 200 * scale;
      const y = (0.5 - handPos.y) * 200 * scale;
      return { x, y };
    };
    
    const leftHand = getHandCoords(leftHandPos);
    const rightHand = getHandCoords(rightHandPos);
    
    // Update each line position
    linesRef.current.forEach((mesh, i) => {
      if (!mesh || !lineStates.current[i]) return;
      
      const state = lineStates.current[i];
      const originalY = state.originalY;
      
      let totalPush = 0;
      let isBeingPushed = false;
      
      // Calculate push from left hand (based on current position)
      if (leftHand !== null) {
        const push = calculatePush(state.currentX, originalY, leftHand.x, leftHand.y);
        if (push !== 0) {
          totalPush += push;
          isBeingPushed = true;
        }
      }
      
      // Calculate push from right hand (based on current position)
      if (rightHand !== null) {
        const push = calculatePush(state.currentX, originalY, rightHand.x, rightHand.y);
        if (push !== 0) {
          totalPush += push;
          isBeingPushed = true;
        }
      }
      
      // If being pushed, apply incremental push to current position
      if (isBeingPushed) {
        state.currentX += totalPush; // Add push increment to current position
        state.lastPushTime = currentTime;
      } else {
        // Not being pushed - immediately start returning to original position
        state.currentX = lerp(state.currentX, state.originalX, fadeBackSpeed);
      }
      
      // Apply position
      mesh.position.x = state.currentX;
      mesh.position.y = originalY;
    });
    
    // Update material properties based on music energy and user color
    const musicIntensity = params.intensity * (1 + music.energy * 0.3);
    linesRef.current.forEach((mesh) => {
      if (mesh && mesh.material) {
        mesh.material.opacity = Math.min(musicIntensity, 1.0);
        mesh.material.color.copy(lineColor); // Update color dynamically
      }
    });
  });
  
  return (
    <group>
      {lines.map((line, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) {
              linesRef.current[i] = el;
              // Initialize position
              el.position.set(line.originalX, line.originalY, 0);
            }
          }}
          geometry={line.geometry}
          material={line.material}
        />
      ))}
    </group>
  );
};

export default VerticalLinesMode;
