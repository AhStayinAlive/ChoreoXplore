/**
 * Enhanced Audio Features Service
 * Provides RMS, onset detection, spectral centroid, frequency bands, beat and phrase tracking
 */

import { audio$ } from '../engine/audioFeatures';

class AudioFeaturesService {
  constructor() {
    this.features = {
      rms: 0,
      energy: 0,
      centroid: 0,
      onset: false,
      beat: false,
      phrase: 0,
      low: 0,    // 20-250 Hz
      mid: 0,    // 250-2000 Hz
      high: 0,   // 2000-20000 Hz
    };
    
    this.history = {
      energy: [],
      lastBeat: 0,
      beatInterval: 500, // ms
      phraseCount: 0,
      beatCount: 0,
    };
    
    this.subscribers = [];
    this.init();
  }
  
  init() {
    // Subscribe to existing audio pipeline
    audio$.subscribe((audioData) => {
      this.updateFeatures(audioData);
    });
  }
  
  updateFeatures(audioData) {
    const { rms, energy, centroid } = audioData;
    
    // Update basic features
    this.features.rms = rms || 0;
    this.features.energy = energy || 0;
    this.features.centroid = centroid || 0;
    
    // Detect onset (sudden increase in energy)
    this.history.energy.push(energy || 0);
    if (this.history.energy.length > 10) {
      this.history.energy.shift();
    }
    
    const avgEnergy = this.history.energy.reduce((a, b) => a + b, 0) / this.history.energy.length;
    this.features.onset = energy > avgEnergy * 1.5;
    
    // Simple beat detection (strong onset with timing constraint)
    const now = performance.now();
    if (this.features.onset && (now - this.history.lastBeat) > this.history.beatInterval * 0.5) {
      this.features.beat = true;
      this.history.lastBeat = now;
      this.history.beatCount++;
      
      // Phrase tracking (every 8 or 16 beats)
      if (this.history.beatCount % 8 === 0) {
        this.history.phraseCount++;
        this.features.phrase = this.history.phraseCount;
      }
    } else {
      this.features.beat = false;
    }
    
    // Frequency bands estimation (simplified from centroid)
    // Centroid typically ranges from 0-22050 Hz (half of 44100 sample rate)
    const normalizedCentroid = (centroid || 0) / 22050;
    
    // Low frequencies (bass): inverse relationship with centroid
    this.features.low = Math.max(0, 1 - normalizedCentroid * 2);
    
    // Mid frequencies: peak around 0.25-0.5 normalized centroid
    this.features.mid = Math.max(0, 1 - Math.abs(normalizedCentroid - 0.375) * 2);
    
    // High frequencies: direct relationship with centroid
    this.features.high = Math.max(0, normalizedCentroid - 0.5) * 2;
    
    // Boost with energy
    const energyBoost = Math.min(energy * 5, 1);
    this.features.low *= energyBoost;
    this.features.mid *= energyBoost;
    this.features.high *= energyBoost;
    
    // Notify subscribers
    this.notifySubscribers();
  }
  
  subscribe(callback) {
    this.subscribers.push(callback);
    // Immediately call with current features
    callback(this.features);
    
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }
  
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.features));
  }
  
  getFeatures() {
    return { ...this.features };
  }
}

// Singleton instance
export const audioFeaturesService = new AudioFeaturesService();
