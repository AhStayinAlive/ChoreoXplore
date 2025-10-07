import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { subscribeToMotionData } from '../core/motionMapping';
import useStore from '../core/store';

const Motion3DController = ({ children }) => {
  const groupRef = useRef();
  const motionDataRef = useRef(null);
  const ambientAnimationParams = useStore(s => s.ambientAnimationParams);

  useEffect(() => {
    const subscription = subscribeToMotionData((motionData) => {
      motionDataRef.current = motionData;
    });

    return () => subscription.unsubscribe();
  }, []);

  useFrame(() => {
    if (!groupRef.current || !motionDataRef.current) return;

    const { background, camera, effects } = motionDataRef.current;
    const group = groupRef.current;

    // Only apply background transformations if ambient animation is not active
    if (!ambientAnimationParams?.isActive) {
      // Apply background transformations to the group
      group.position.x = background.position.x;
      group.position.y = background.position.y;
      
      group.rotation.x = background.rotation.x * Math.PI / 180;
      group.rotation.y = background.rotation.y * Math.PI / 180;
      group.rotation.z = background.rotation.z * Math.PI / 180;
      
      group.scale.x = background.scale.x;
      group.scale.y = background.scale.y;

      // Apply visual effects (if you have a material that supports them)
      if (group.material) {
        group.material.opacity = background.opacity;
        // You can add more material effects here
      }
    } else {
      // Reset to neutral state when ambient animation is active
      group.position.x = 0;
      group.position.y = 0;
      group.rotation.x = 0;
      group.rotation.y = 0;
      group.rotation.z = 0;
      group.scale.x = 1;
      group.scale.y = 1;
      if (group.material) {
        group.material.opacity = 1;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export default Motion3DController;
