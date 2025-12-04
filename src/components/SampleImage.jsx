import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { subscribeToMotionData } from '../core/motionMapping';
import * as THREE from 'three';

const SampleImage = () => {
  const meshRef = useRef();
  const motionDataRef = useRef(null);
  const timeRef = useRef(0);

  // Subscribe to motion data
  React.useEffect(() => {
    const subscription = subscribeToMotionData((motionData) => {
      motionDataRef.current = motionData;
    });
    return () => subscription.unsubscribe();
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    timeRef.current += 0.01;
    const mesh = meshRef.current;

    // Apply motion data if available
    if (motionDataRef.current) {
      const { background, effects } = motionDataRef.current;

      // Apply position transformations
      mesh.position.x = background.position.x;
      mesh.position.y = background.position.y;
      mesh.position.z = 0;

      // Apply rotation
      mesh.rotation.x = background.rotation.x * Math.PI / 180;
      mesh.rotation.y = background.rotation.y * Math.PI / 180;
      mesh.rotation.z = background.rotation.z * Math.PI / 180;

      // Apply scale
      mesh.scale.x = background.scale.x;
      mesh.scale.y = background.scale.y;
      mesh.scale.z = 1;

      // Apply opacity
      if (mesh.children[0]?.material) {
        mesh.children[0].material.opacity = background.opacity;
        mesh.children[0].material.transparent = true;
      }
    } else {
      // Fallback animation for testing
      mesh.position.x = Math.sin(timeRef.current) * 20;
      mesh.position.y = Math.cos(timeRef.current * 0.7) * 15;
      mesh.rotation.z = Math.sin(timeRef.current * 0.5) * 0.2;
      mesh.scale.x = 1 + Math.sin(timeRef.current * 0.3) * 0.2;
      mesh.scale.y = 1 + Math.cos(timeRef.current * 0.4) * 0.2;
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Main background square */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial 
          color="#5FA8FF"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner pattern for better visibility */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial 
          color="#FF6B6B"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Center cross for reference */}
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[40, 4]} />
        <meshBasicMaterial 
          color="#FFFFFF"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[40, 4]} />
        <meshBasicMaterial 
          color="#FFFFFF"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default SampleImage;
