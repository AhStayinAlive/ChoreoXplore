import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFluid } from '@funtech-inc/use-shader-fx';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../core/store';

const ShaderDistortion = ({ backgroundImage, isActive = true }) => {
  const meshRef = useRef();
  const { size, gl } = useThree();
  const poseData = useStore(s => s.poseData);
  
  
  // Load background texture
  const texture = useTexture(backgroundImage);
  
  
  // Store previous joint positions for velocity calculation
  const prevJointPositions = useRef(new Map());
  const debugCounter = useRef(0);
  
  // Fluid simulation hook - correct API usage
  const { render: updateFluid, texture: fluidTexture, velocity } = useFluid({
    size: {
      width: size.width,
      height: size.height,
    },
    dpr: 1,
  });
  

  // Process motion capture data and convert to fluid forces
  const processMotionData = useCallback(() => {
    if (!poseData?.landmarks || !isActive) return [];
    
    const forces = [];
    
    // Convert pose landmarks to fluid forces
    poseData.landmarks.forEach((landmark, index) => {
      if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
        // Use normalized coordinates directly (0-1 range)
        const x = landmark.x;
        const y = landmark.y;
        
        // Calculate velocity for force strength
        const currentPos = new THREE.Vector2(x, y);
        const prevPos = prevJointPositions.current.get(index);
        let force = 0.2; // Increased base force
        
        if (prevPos) {
          const distance = currentPos.distanceTo(prevPos);
          force = Math.min(distance * 15, 0.8); // Scale force based on movement (increased)
        }
        prevJointPositions.current.set(index, currentPos);
        
        // Create force in the format expected by use-shader-fx
        forces.push({
          x: x,
          y: y,
          force: force,
          radius: 0.08, // Increased radius for stronger effect
          color: [0.0, 0.5, 1.0] // Blue color for ripples
        });
      }
    });
    
    return forces;
  }, [poseData, isActive]);

  // Update fluid simulation on every frame
  useFrame((state) => {
    if (!isActive || !updateFluid) return;
    
    // Get motion forces from pose data
    const motionForces = processMotionData();
    
    
    // Update fluid simulation (simple call without external forces)
    updateFluid(state);
  });

  // Custom shader material that combines background texture with motion distortion
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_texture: { value: texture },
      u_fluid: { value: fluidTexture },
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_distortion_strength: { value: 4.0 },
      u_pose_data: { value: new Float32Array(33 * 2) } // 33 landmarks * 2 (x,y)
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
          uniform sampler2D u_texture;
          uniform sampler2D u_fluid;
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform float u_distortion_strength;
          uniform float u_pose_data[66]; // 33 landmarks * 2 (x,y)
          varying vec2 vUv;
          
          // Function to get distortion along a line between two points
          vec2 getLineDistortion(vec2 uv, float pose_data[66], int startIdx, int endIdx, float time) {
            vec2 start = vec2(pose_data[startIdx * 2], pose_data[startIdx * 2 + 1]);
            vec2 end = vec2(pose_data[endIdx * 2], pose_data[endIdx * 2 + 1]);
            
            // Calculate distance from point to line segment
            vec2 line = end - start;
            float lineLength = length(line);
            
            if (lineLength < 0.001) return vec2(0.0); // Skip if points are too close
            
            vec2 lineDir = line / lineLength;
            vec2 toPoint = uv - start;
            float t = dot(toPoint, lineDir);
            t = clamp(t, 0.0, lineLength);
            
            vec2 closestPoint = start + lineDir * t;
            float distance = length(uv - closestPoint);
            
            // Apply distortion within a small radius around the line
            if (distance < 0.02) {
              float influence = 1.0 - (distance / 0.02);
              influence = influence * influence; // Smooth falloff
              
              // Create stronger ripple effect along the line
              vec2 direction = normalize(uv - closestPoint);
              return direction * influence * 0.06 * sin(time * 2.0 + distance * 8.0);
            }
            
            return vec2(0.0);
          }
          
          void main() {
            vec2 distortion = vec2(0.0);
            float totalInfluence = 0.0;
            
            // No joint point ripples - only clean line-based distortion
            
            // Add distortion along skeleton lines (same connections as SimpleSkeleton)
            // Face connections
            distortion += getLineDistortion(vUv, u_pose_data, 0, 1, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 1, 2, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 2, 3, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 3, 7, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 0, 4, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 4, 5, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 5, 6, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 6, 8, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 9, 10, u_time);
            
            // Left arm connections
            distortion += getLineDistortion(vUv, u_pose_data, 11, 13, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 13, 15, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 15, 17, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 15, 19, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 15, 21, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 17, 19, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 17, 21, u_time);
            
            // Right arm connections
            distortion += getLineDistortion(vUv, u_pose_data, 12, 14, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 14, 16, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 16, 18, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 16, 20, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 16, 22, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 18, 20, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 18, 22, u_time);
            
            // Torso connections
            distortion += getLineDistortion(vUv, u_pose_data, 11, 12, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 11, 23, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 12, 24, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 23, 24, u_time);
            
            // Left leg connections
            distortion += getLineDistortion(vUv, u_pose_data, 23, 25, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 25, 27, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 27, 29, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 27, 31, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 29, 31, u_time);
            
            // Right leg connections
            distortion += getLineDistortion(vUv, u_pose_data, 24, 26, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 26, 28, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 28, 30, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 28, 32, u_time);
            distortion += getLineDistortion(vUv, u_pose_data, 30, 32, u_time);
            
            // Normalize distortion to prevent over-amplification
            if (totalInfluence > 0.0) {
              distortion = distortion / totalInfluence;
            }
            
            // Apply stronger distortion to UV coordinates
            vec2 distortedUv = vUv + distortion * 0.8; // Stronger distortion
            
            // Sample the background texture with distortion
            vec4 background = texture2D(u_texture, distortedUv);
            
            // Show the original background image without red tint
            gl_FragColor = vec4(background.rgb, 1.0);
          }
        `,
    transparent: false
  });

  // Update time and pose data uniforms
  useFrame((state) => {
    if (shaderMaterial.uniforms.u_time) {
      shaderMaterial.uniforms.u_time.value = state.clock.elapsedTime;
    }
    
    // Update pose data uniform - convert to same coordinate system as green skeleton
    if (poseData?.landmarks && shaderMaterial.uniforms.u_pose_data) {
      const poseArray = new Float32Array(66); // 33 landmarks * 2 (x,y)
      
      poseData.landmarks.forEach((landmark, index) => {
        if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
          // Convert to same coordinate system as SimpleSkeleton
          // SimpleSkeleton uses: (landmark.x - 0.5) * 200 * scale and (0.5 - landmark.y) * 200 * scale
          // We need to convert this back to UV coordinates for the shader
          const x = (landmark.x - 0.5) * 200 * 22; // Use same scale as skeleton (22)
          const y = (0.5 - landmark.y) * 200 * 22; // Use same scale as skeleton (22)
          
          // Convert back to UV coordinates (0-1 range)
          poseArray[index * 2] = (x / 20000) + 0.5; // Convert to UV and center
          poseArray[index * 2 + 1] = (y / 10000) + 0.5; // Convert to UV and center
        }
      });
      
      shaderMaterial.uniforms.u_pose_data.value = poseArray;
    }
  });

  if (!backgroundImage || !isActive) {
    return null;
  }


  return (
    <mesh ref={meshRef} position={[0, 0, 1]}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={shaderMaterial} />
    </mesh>
  );
};

export default ShaderDistortion;
