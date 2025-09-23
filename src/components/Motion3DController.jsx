import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { subscribeToMotionData } from '../core/motionMapping';

const Motion3DController = ({ children }) => {
  const groupRef = useRef();
  const motionDataRef = useRef(null);

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
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export default Motion3DController;
