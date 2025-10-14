import React, { useRef, useEffect, useCallback } from 'react';

const HandFluidCanvas = ({ width = 512, height = 512, onCanvasReady }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  const particlesRef = useRef([]);
  const callbackCalledRef = useRef(false);

  // Initialize particles for fluid effect
  const initializeParticles = useCallback(() => {
    const particles = [];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 20 + 10,
        hue: Math.random() * 60 + 180, // Blue to cyan range
        alpha: Math.random() * 0.5 + 0.3,
        life: Math.random() * 100 + 50
      });
    }
    
    particlesRef.current = particles;
  }, [width, height]);

  // Render fluid patterns
  const renderFluidPatterns = useCallback((ctx, time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear canvas with gradient background
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    gradient.addColorStop(0, 'rgba(30, 30, 60, 0.1)');
    gradient.addColorStop(0.5, 'rgba(20, 20, 40, 0.2)');
    gradient.addColorStop(1, 'rgba(10, 10, 20, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Update and render particles
    particlesRef.current.forEach((particle, index) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      
      // Keep particles in bounds
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));
      
      // Update life and fade
      particle.life -= 0.5;
      particle.alpha = Math.max(0, particle.alpha - 0.002);
      
      // Respawn particle if it dies
      if (particle.life <= 0 || particle.alpha <= 0) {
        particle.x = Math.random() * width;
        particle.y = Math.random() * height;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = Math.random() * 100 + 50;
        particle.alpha = Math.random() * 0.5 + 0.3;
        particle.hue = Math.random() * 60 + 180;
      }
      
      // Render particle as fluid blob
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.radius
      );
      
      const color1 = `hsla(${particle.hue}, 70%, 60%, ${particle.alpha})`;
      const color2 = `hsla(${particle.hue + 20}, 80%, 70%, ${particle.alpha * 0.5})`;
      const color3 = `hsla(${particle.hue + 40}, 90%, 80%, 0)`;
      
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.6, color2);
      gradient.addColorStop(1, color3);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add flowing wave patterns
    ctx.strokeStyle = `hsla(${200 + Math.sin(time * 0.001) * 20}, 60%, 50%, 0.3)`;
    ctx.lineWidth = 3;
    
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const y = height / 2 + Math.sin(time * 0.002 + i) * 50;
      const amplitude = 30 + Math.sin(time * 0.001 + i) * 20;
      
      for (let x = 0; x < width; x += 10) {
        const waveY = y + Math.sin((x + time * 0.5) * 0.01) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();
    }
  }, [width, height]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 16; // ~60fps
    
    renderFluidPatterns(ctx, timeRef.current);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [renderFluidPatterns]);

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Initialize particles
    initializeParticles();
    
    // Start animation
    animate();
    
    // Notify parent that canvas is ready (only once)
    if (onCanvasReady && !callbackCalledRef.current) {
      onCanvasReady(canvas);
      callbackCalledRef.current = true;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, initializeParticles, animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'none', // Hidden canvas, only used for texture
        width: width,
        height: height
      }}
    />
  );
};

export default HandFluidCanvas;
