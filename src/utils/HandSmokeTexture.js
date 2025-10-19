import * as THREE from 'three';

const easeOutSine = (t, b, c, d) => {
  return c * Math.sin((t / d) * (Math.PI / 2)) + b;
};

const easeOutQuad = (t, b, c, d) => {
  t /= d;
  return -c * t * (t - 2) + b;
};

export class HandSmokeTexture {
  constructor(options = {}) {
    this.size = options.size || 512;
    this.points = [];
    this.radius = this.size * 0.05; // Base radius (smaller for better control)
    this.width = this.height = this.size;
    this.maxAge = 64; // Default lifetime
    this.last = { left: null, right: null };
    
    // Settings from parameters
    this.intensity = options.intensity || 0.7;
    this.radiusMultiplier = options.radiusMultiplier || 1.0;
    this.velocitySensitivity = options.velocitySensitivity || 1.0;
    this.color = options.color || '#ffffff';
    
    this.initTexture();
  }

  initTexture() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Initialize as fully transparent
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.texture = new THREE.Texture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  clear() {
    // Very aggressive fade to completely eliminate residue buildup
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Very fast fade to eliminate all residue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over';
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  addPoint(point, hand = 'left') {
    let force = 0;
    let vx = 0;
    let vy = 0;
    
    const last = this.last[hand];
    if (last) {
      const relativeX = point.x - last.x;
      const relativeY = point.y - last.y;
      const distanceSquared = relativeX * relativeX + relativeY * relativeY;
      const distance = Math.sqrt(distanceSquared);
      
      if (distance > 0) {
        vx = relativeX / distance;
        vy = relativeY / distance;
        force = Math.min(distanceSquared * 10000 * this.velocitySensitivity, 1);
      }
    }

    this.last[hand] = { x: point.x, y: point.y };
    this.points.push({ 
      x: point.x, 
      y: point.y, 
      age: 0, 
      force: force * this.intensity, 
      vx, 
      vy 
    });
  }

  update() {
    // If no points, fully clear the canvas
    if (this.points.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.texture.needsUpdate = true;
      return;
    }
    
    this.clear();
    
    const agePart = 1 / this.maxAge;
    
    // Update and remove old points
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i];
      const slowAsOlder = 1 - point.age / this.maxAge;
      const force = point.force * agePart * slowAsOlder;
      
      point.x += point.vx * force * 0.01;
      point.y -= point.vy * force * 0.01;  // Invert vy direction for canvas Y-axis
      point.age += 1;
      
      if (point.age > this.maxAge) {
        this.points.splice(i, 1);
      }
    }
    
    // Draw all points
    this.points.forEach(point => {
      this.drawPoint(point);
    });
    
    this.texture.needsUpdate = true;
  }

  drawPoint(point) {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height  // Invert Y for canvas coordinate system
    };
    
    const radius = this.radius * this.radiusMultiplier;
    const ctx = this.ctx;

    // Calculate intensity based on age
    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = easeOutSine(point.age / (this.maxAge * 0.3), 0, 1, 1);
    } else {
      intensity = easeOutQuad(
        1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7),
        0,
        1,
        1
      );
    }
    intensity *= point.force * this.intensity;

    // Get color
    const rgb = this.hexToRgb(this.color);
    const color = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    // Draw smoke circle with gradient
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
    gradient.addColorStop(0, `rgba(${color}, ${intensity * 0.8})`);
    gradient.addColorStop(0.5, `rgba(${color}, ${intensity * 0.4})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  updateSettings(settings) {
    if (settings.intensity !== undefined) this.intensity = settings.intensity;
    if (settings.radiusMultiplier !== undefined) this.radiusMultiplier = settings.radiusMultiplier;
    if (settings.velocitySensitivity !== undefined) this.velocitySensitivity = settings.velocitySensitivity;
    if (settings.color !== undefined) this.color = settings.color;
    if (settings.trailLength !== undefined) {
      // Map trailLength (0.1-1.0) to maxAge (20-120)
      this.maxAge = Math.floor(20 + settings.trailLength * 100);
    }
  }

  getTexture() {
    return this.texture;
  }

  dispose() {
    this.texture.dispose();
  }
}

