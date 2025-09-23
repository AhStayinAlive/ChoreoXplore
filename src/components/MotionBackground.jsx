import React, { useEffect, useRef } from 'react';
import { subscribeToMotionData } from '../core/motionMapping';

const MotionBackground = ({ children }) => {
  const backgroundRef = useRef(null);
  const motionDataRef = useRef(null);

  useEffect(() => {
    const subscription = subscribeToMotionData((motionData) => {
      motionDataRef.current = motionData;
      applyMotionToBackground();
    });

    return () => subscription.unsubscribe();
  }, []);

  const applyMotionToBackground = () => {
    if (!backgroundRef.current || !motionDataRef.current) return;

    const { background, effects } = motionDataRef.current;
    const element = backgroundRef.current;

    // Apply position transformations
    element.style.transform = `
      translate(${background.position.x}px, ${background.position.y}px)
      rotateX(${background.rotation.x}deg)
      rotateY(${background.rotation.y}deg)
      rotateZ(${background.rotation.z}deg)
      scale(${background.scale.x}, ${background.scale.y})
    `;

    // Apply opacity
    element.style.opacity = background.opacity;

    // Apply visual effects
    element.style.filter = `
      blur(${effects.blur}px)
      brightness(${effects.brightness})
      contrast(${effects.contrast})
      saturate(${effects.saturation})
    `;
  };

  return (
    <div 
      ref={backgroundRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transition: 'transform 0.1s ease-out, opacity 0.1s ease-out, filter 0.1s ease-out',
        willChange: 'transform, opacity, filter'
      }}
    >
      {children}
    </div>
  );
};

export default MotionBackground;
