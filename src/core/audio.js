import { BehaviorSubject, interval } from "rxjs";
import { getCurrentAudioAnalyzer } from "./audioSourceManager.js";

export const audio$ = new BehaviorSubject({ 
  rms: 0, 
  bands: [0, 0, 0], 
  centroid: 0, 
  onset: false,
  // Enhanced music reactivity features
  tempo: 0,
  beatStrength: 0,
  rhythmPattern: 0,
  bassEnergy: 0,
  midEnergy: 0,
  trebleEnergy: 0,
  overallEnergy: 0
});

let dataF, dataT, lastSpec, lastOnsetAt = 0;
let beatHistory = [];
let tempoHistory = [];
let lastBeatTime = 0;
let beatInterval = 0;
let rhythmBuffer = [];
let tickInterval = null;

export async function startAudio() {
  // Initialize data arrays
  dataF = new Uint8Array(1024); // Default size, will be updated when analyser is available
  dataT = new Uint8Array(1024);
  
  // Start the audio analysis tick
  if (!tickInterval) {
    tickInterval = interval(16).subscribe(tick);
  }
}

export function stopAudio() {
  if (tickInterval) {
    tickInterval.unsubscribe();
    tickInterval = null;
  }
}

function tick() {
  const analyser = getCurrentAudioAnalyzer();
  if (!analyser) return;
  
  // Update data arrays if needed
  if (dataF.length !== analyser.frequencyBinCount) {
    dataF = new Uint8Array(analyser.frequencyBinCount);
    dataT = new Uint8Array(analyser.frequencyBinCount);
  }
  
  analyser.getByteFrequencyData(dataF);
  analyser.getByteTimeDomainData(dataT);
  
  const arr = Array.from(dataF);
  const timeArr = Array.from(dataT);
  const sum = arr.reduce((a, b) => a + b, 0);
  const rms = sum / arr.length / 255;

  const L = avg(arr.slice(2, 40));
  const M = avg(arr.slice(40, 200));
  const H = avg(arr.slice(200));
  const centroid = spectralCentroid(arr);

  const flux = lastSpec ? arr.reduce((acc, v, i) => acc + Math.max(0, v - lastSpec[i]), 0) / arr.length : 0;
  const now = performance.now();
  // more sensitive onset for MVP
  const onset = flux > 0.12 && now - lastOnsetAt > 120;
  if (onset) lastOnsetAt = now;
  lastSpec = arr;

  // Enhanced music analysis
  const musicFeatures = analyzeMusicFeatures(arr, timeArr, now);
  
  audio$.next({ 
    rms, 
    bands: [L / 255, M / 255, H / 255], 
    centroid, 
    onset,
    ...musicFeatures
  });
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

function spectralCentroid(arr) {
  let num = 0, den = 0;
  for (let i = 0; i < arr.length; i++) { num += i * arr[i]; den += arr[i]; }
  return den ? num / den / arr.length : 0;
}

// Enhanced music analysis functions
function analyzeMusicFeatures(freqData, timeData, now) {
  // Energy analysis for different frequency ranges
  const bassEnergy = avg(freqData.slice(0, 20)) / 255;
  const midEnergy = avg(freqData.slice(20, 100)) / 255;
  const trebleEnergy = avg(freqData.slice(100, 200)) / 255;
  const overallEnergy = avg(freqData) / 255;

  // Beat detection using time domain analysis
  const beatStrength = detectBeat(timeData, now);
  
  // Tempo estimation
  const tempo = estimateTempo(now);
  
  // Rhythm pattern analysis
  const rhythmPattern = analyzeRhythmPattern(beatStrength, now);

  return {
    tempo,
    beatStrength,
    rhythmPattern,
    bassEnergy,
    midEnergy,
    trebleEnergy,
    overallEnergy
  };
}

function detectBeat(timeData, now) {
  // Calculate RMS of time domain data for beat detection
  const rms = Math.sqrt(timeData.reduce((sum, val) => sum + val * val, 0) / timeData.length) / 255;
  
  // Store beat history for pattern analysis
  beatHistory.push({ time: now, strength: rms });
  
  // Keep only recent history (last 2 seconds)
  const cutoff = now - 2000;
  beatHistory = beatHistory.filter(beat => beat.time > cutoff);
  
  // Calculate beat strength relative to recent average
  const recentAvg = beatHistory.length > 0 
    ? beatHistory.reduce((sum, beat) => sum + beat.strength, 0) / beatHistory.length 
    : 0;
  
  const beatStrength = recentAvg > 0 ? Math.min(2.0, rms / recentAvg) : 0;
  
  // Detect beat onset
  if (beatStrength > 1.3 && now - lastBeatTime > 200) {
    lastBeatTime = now;
    beatInterval = beatHistory.length > 1 ? now - beatHistory[beatHistory.length - 2].time : 0;
  }
  
  return Math.max(0, beatStrength - 1.0);
}

function estimateTempo(now) {
  if (beatInterval > 0) {
    // Convert beat interval to BPM
    const bpm = 60000 / beatInterval;
    
    // Store tempo history
    tempoHistory.push({ time: now, bpm });
    
    // Keep only recent history
    const cutoff = now - 5000;
    tempoHistory = tempoHistory.filter(tempo => tempo.time > cutoff);
    
    // Return smoothed tempo
    if (tempoHistory.length > 0) {
      const avgBpm = tempoHistory.reduce((sum, t) => sum + t.bpm, 0) / tempoHistory.length;
      return Math.max(60, Math.min(200, avgBpm)); // Clamp to reasonable range
    }
  }
  
  return 0;
}

function analyzeRhythmPattern(beatStrength, now) {
  // Store rhythm data
  rhythmBuffer.push({ time: now, strength: beatStrength });
  
  // Keep only recent data (last 4 seconds)
  const cutoff = now - 4000;
  rhythmBuffer = rhythmBuffer.filter(r => r.time > cutoff);
  
  if (rhythmBuffer.length < 10) return 0;
  
  // Analyze rhythm complexity
  const strengths = rhythmBuffer.map(r => r.strength);
  const variance = calculateVariance(strengths);
  const complexity = Math.min(1.0, variance * 10);
  
  // Detect rhythm patterns (simple vs complex)
  const strongBeats = strengths.filter(s => s > 0.5).length;
  const rhythmDensity = strongBeats / strengths.length;
  
  return {
    complexity,
    density: rhythmDensity,
    pattern: rhythmDensity > 0.3 ? 'complex' : 'simple'
  };
}

function calculateVariance(arr) {
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

