import { useEffect, useRef, useState } from 'react';
import useStore from '../core/store';

const MotionDistortion = ({ backgroundImage, isActive = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [distortionPoints, setDistortionPoints] = useState([]);
  const poseData = useStore(s => s.poseData);
  
  // Distortion parameters
  const [distortionConfig, setDistortionConfig] = useState({
    radius: 80,        // Base radius of distortion (increased for stronger effect)
    intensity: 0.7,    // Distortion strength (0-1) (increased for stronger effect)
    falloff: 0.8,      // How quickly distortion fades from center
    fadeSpeed: 0.08,   // How fast distortion fades out (faster for performance)
    maxPoints: 5       // Maximum number of active distortion points (reduced for performance)
  });

  // Convert pose keypoints to distortion points
  useEffect(() => {
    if (!isActive) {
      setDistortionPoints([]);
      return;
    }

    // If no pose data, don't create distortion points
    if (!poseData) {
      setDistortionPoints([]);
      return;
    }

    // console.log('🎭 MotionDistortion: Processing pose data:', poseData);
    const newPoints = [];
    
    // Handle MediaPipe landmarks format
    if (poseData.landmarks && poseData.landmarks.length > 0) {
      const landmarks = poseData.landmarks;
      
      // MediaPipe pose landmark indices for key body parts
      const importantLandmarks = [
        0,   // nose
        11, 12, 13, 14, 15, 16,  // shoulders, elbows, wrists
        23, 24, 25, 26, 27, 28,  // hips, knees, ankles
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10  // face landmarks
      ];

      importantLandmarks.forEach((landmarkIndex, index) => {
        if (landmarks[landmarkIndex]) {
          const landmark = landmarks[landmarkIndex];
          // Convert normalized coordinates to screen coordinates
          const x = landmark.x * window.innerWidth;
          const y = landmark.y * window.innerHeight;
          const visibility = landmark.visibility || landmark.z || 1.0;
          
          if (visibility > 0.3) {
            newPoints.push({
              x: x,
              y: y,
              intensity: visibility * distortionConfig.intensity,
              radius: distortionConfig.radius * (0.5 + visibility * 0.5),
              life: 1.0,
              id: `landmark-${landmarkIndex}-${Date.now()}`
            });
          }
        }
      });
    }
    
    // Handle alternative keypoints format
    else if (poseData.keypoints && Array.isArray(poseData.keypoints)) {
      const keypoints = poseData.keypoints;
      const importantKeypoints = [
        'leftWrist', 'rightWrist', 'leftElbow', 'rightElbow',
        'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip',
        'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle',
        'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'
      ];

      keypoints.forEach((keypoint, index) => {
        if (keypoint.score > 0.3 && importantKeypoints.includes(keypoint.part)) {
          newPoints.push({
            x: keypoint.position.x,
            y: keypoint.position.y,
            intensity: keypoint.score * distortionConfig.intensity,
            radius: distortionConfig.radius * (0.5 + keypoint.score * 0.5),
            life: 1.0,
            id: `${keypoint.part}-${index}-${Date.now()}`
          });
        }
      });
    }

    // Limit number of points for performance
    if (newPoints.length > distortionConfig.maxPoints) {
      newPoints.sort((a, b) => b.intensity - a.intensity);
      newPoints.splice(distortionConfig.maxPoints);
    }

    setDistortionPoints(prev => {
      // Merge with existing points, avoiding duplicates
      const existing = prev.filter(p => p.life > 0.1);
      const combined = [...existing, ...newPoints];
      
      // Remove duplicates based on proximity
      const filtered = [];
      combined.forEach(point => {
        const isDuplicate = filtered.some(existing => 
          Math.abs(existing.x - point.x) < 30 && 
          Math.abs(existing.y - point.y) < 30
        );
        if (!isDuplicate) {
          filtered.push(point);
        }
      });
      
      // console.log(`🎭 MotionDistortion: Generated ${filtered.length} distortion points`);
      return filtered;
    });
  }, [poseData, isActive, distortionConfig]);

  // Animation loop for distortion effects
  useEffect(() => {
    if (!isActive || !backgroundImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      let lastFrameTime = 0;
      const targetFPS = 15; // Limit to 15 FPS to reduce CPU usage
      const frameInterval = 1000 / targetFPS;
      
      const animate = (currentTime) => {
        // Throttle animation to target FPS
        if (currentTime - lastFrameTime < frameInterval) {
          animationRef.current = requestAnimationFrame(animate);
          return;
        }
        lastFrameTime = currentTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw base background image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Apply distortion effects (only if we have points and they're significant)
        if (distortionPoints.length > 0 && distortionPoints.some(p => p.life > 0.1)) {
          applyDistortions(ctx, canvas.width, canvas.height);
        }
        
        // Update distortion points (fade out)
        setDistortionPoints(prev => 
          prev.map(point => ({
            ...point,
            life: Math.max(0, point.life - distortionConfig.fadeSpeed)
          })).filter(point => point.life > 0.01)
        );
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animate(0);
    };
    
    img.src = backgroundImage;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [backgroundImage, isActive, distortionPoints, distortionConfig]);

  // Apply distortion effects to the canvas
  const applyDistortions = (ctx, width, height) => {
    distortionPoints.forEach(point => {
      if (point.life <= 0) return;

      const { x, y, intensity, radius, life } = point;
      const currentIntensity = intensity * life;
      
      // Create multiple distortion layers for more complex effect
      applyRippleEffect(ctx, x, y, radius, currentIntensity);
      applyHeatHazeEffect(ctx, x, y, radius * 0.7, currentIntensity * 0.6);
    });
  };

  // Ripple distortion effect
  const applyRippleEffect = (ctx, centerX, centerY, radius, intensity) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    const maxDist = radius;
    const centerXInt = Math.floor(centerX);
    const centerYInt = Math.floor(centerY);
    
    // Reduce processing area for better performance
    const step = 2; // Process every 2nd pixel
    for (let y = Math.max(0, centerYInt - maxDist); y < Math.min(ctx.canvas.height, centerYInt + maxDist); y += step) {
      for (let x = Math.max(0, centerXInt - maxDist); x < Math.min(ctx.canvas.width, centerXInt + maxDist); x += step) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDist) {
          const normalizedDist = distance / maxDist;
          const falloff = Math.pow(1 - normalizedDist, distortionConfig.falloff);
          const wave = Math.sin(distance * 0.1 - Date.now() * 0.01) * 0.5 + 0.5;
          const distortionStrength = intensity * falloff * wave * 0.4;
          
          // Calculate distortion offset
          const angle = Math.atan2(dy, dx);
          const offsetX = Math.cos(angle) * distortionStrength * 20;
          const offsetY = Math.sin(angle) * distortionStrength * 20;
          
          const sourceX = Math.floor(x + offsetX);
          const sourceY = Math.floor(y + offsetY);
          
          if (sourceX >= 0 && sourceX < ctx.canvas.width && sourceY >= 0 && sourceY < ctx.canvas.height) {
            const sourceIndex = (sourceY * ctx.canvas.width + sourceX) * 4;
            const targetIndex = (y * ctx.canvas.width + x) * 4;
            
            newData[targetIndex] = data[sourceIndex];         // R
            newData[targetIndex + 1] = data[sourceIndex + 1]; // G
            newData[targetIndex + 2] = data[sourceIndex + 2]; // B
            newData[targetIndex + 3] = data[sourceIndex + 3]; // A
          }
        }
      }
    }
    
    ctx.putImageData(new ImageData(newData, ctx.canvas.width, ctx.canvas.height), 0, 0);
  };

  // Heat haze distortion effect
  const applyHeatHazeEffect = (ctx, centerX, centerY, radius, intensity) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    const maxDist = radius;
    const centerXInt = Math.floor(centerX);
    const centerYInt = Math.floor(centerY);
    
    // Reduce processing area for better performance
    const step = 2; // Process every 2nd pixel
    for (let y = Math.max(0, centerYInt - maxDist); y < Math.min(ctx.canvas.height, centerYInt + maxDist); y += step) {
      for (let x = Math.max(0, centerXInt - maxDist); x < Math.min(ctx.canvas.width, centerXInt + maxDist); x += step) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDist) {
          const normalizedDist = distance / maxDist;
          const falloff = Math.pow(1 - normalizedDist, distortionConfig.falloff);
          const noise = Math.sin(x * 0.02 + y * 0.02 + Date.now() * 0.005) * 0.5 + 0.5;
          const distortionStrength = intensity * falloff * noise * 0.1;
          
          // Vertical heat shimmer effect
          const offsetY = Math.sin(x * 0.1 + Date.now() * 0.01) * distortionStrength * 5;
          const sourceX = x;
          const sourceY = Math.floor(y + offsetY);
          
          if (sourceX >= 0 && sourceX < ctx.canvas.width && sourceY >= 0 && sourceY < ctx.canvas.height) {
            const sourceIndex = (sourceY * ctx.canvas.width + sourceX) * 4;
            const targetIndex = (y * ctx.canvas.width + x) * 4;
            
            newData[targetIndex] = data[sourceIndex];         // R
            newData[targetIndex + 1] = data[sourceIndex + 1]; // G
            newData[targetIndex + 2] = data[sourceIndex + 2]; // B
            newData[targetIndex + 3] = data[sourceIndex + 3]; // A
          }
        }
      }
    }
    
    ctx.putImageData(new ImageData(newData, ctx.canvas.width, ctx.canvas.height), 0, 0);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!backgroundImage || !isActive) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default MotionDistortion;
