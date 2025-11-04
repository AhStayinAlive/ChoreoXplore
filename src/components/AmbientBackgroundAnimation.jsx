import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../core/store';
import { audio$ } from '../core/audio';

const AmbientBackgroundAnimation = ({ 
  backgroundImage, 
  isActive = true,
  effectType = 'waterRipple', // 'waterRipple', 'heatWave', 'flowingDistortion', 'gentleWave'
  speed = 1.0,
  amplitude = 0.5,
  wavelength = 1.0,
  intensity = 0.3,
  scale = 1.0, // Add scale prop
  audioReactive = true,
  audioSensitivity = 0.5,
  audioBassInfluence = 0.7,
  audioMidInfluence = 0.5,
  audioHighInfluence = 0.3
}) => {
  const meshRef = useRef();
  const { size } = useThree();
  const [shaderMaterial, setShaderMaterial] = useState(null);
  const poseData = useStore(s => s.poseData);
  const audioDataRef = useRef({ rms: 0, bands: [0, 0, 0], centroid: 0 });
  const lastAudioUpdateRef = useRef({ bass: 0, mid: 0, high: 0, rms: 0 });
  
  // Audio update threshold - only update GPU when values change by more than this amount
  const AUDIO_UPDATE_THRESHOLD = 0.01;
  
  // Subscribe to audio data
  useEffect(() => {
    const subscription = audio$.subscribe((audioData) => {
      audioDataRef.current = audioData;
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Load background texture
  const texture = useTexture(backgroundImage);
  
  // Memoize audio parameters to reduce shader re-compilations
  const audioParams = useMemo(() => ({
    audioReactive,
    audioSensitivity,
    audioBassInfluence,
    audioMidInfluence,
    audioHighInfluence
  }), [audioReactive, audioSensitivity, audioBassInfluence, audioMidInfluence, audioHighInfluence]);
  
  // Create shader material with ambient animation effects
  useEffect(() => {
    if (!texture) return;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_texture: { value: texture },
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(size.width, size.height) },
        u_speed: { value: speed },
        u_amplitude: { value: amplitude },
        u_wavelength: { value: wavelength },
        u_intensity: { value: intensity },
        u_effect_type: { value: getEffectTypeValue(effectType) },
        u_pose_data: { value: new Float32Array(33 * 2) }, // 33 landmarks * 2 (x,y)
        u_pose_active: { value: 0.0 }, // 1.0 if pose data is available, 0.0 otherwise
        u_audio_reactive: { value: audioParams.audioReactive ? 1.0 : 0.0 },
        u_audio_sensitivity: { value: audioParams.audioSensitivity },
        u_audio_bass: { value: 0.0 },
        u_audio_mid: { value: 0.0 },
        u_audio_high: { value: 0.0 },
        u_audio_rms: { value: 0.0 },
        u_audio_bass_influence: { value: audioParams.audioBassInfluence },
        u_audio_mid_influence: { value: audioParams.audioMidInfluence },
        u_audio_high_influence: { value: audioParams.audioHighInfluence }
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
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_speed;
        uniform float u_amplitude;
        uniform float u_wavelength;
        uniform float u_intensity;
        uniform float u_effect_type;
        uniform float u_pose_data[66]; // 33 landmarks * 2 (x,y)
        uniform float u_pose_active;
        uniform float u_audio_reactive;
        uniform float u_audio_sensitivity;
        uniform float u_audio_bass;
        uniform float u_audio_mid;
        uniform float u_audio_high;
        uniform float u_audio_rms;
        uniform float u_audio_bass_influence;
        uniform float u_audio_mid_influence;
        uniform float u_audio_high_influence;
        varying vec2 vUv;
        
        // Noise function for organic movement
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Smooth noise
        float smoothNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = noise(i);
          float b = noise(i + vec2(1.0, 0.0));
          float c = noise(i + vec2(0.0, 1.0));
          float d = noise(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        // Fractal noise for more complex patterns
        float fractalNoise(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 4; i++) {
            value += amplitude * smoothNoise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          
          return value;
        }
        
        // Water ripple effect
        vec2 waterRipple(vec2 uv, float time) {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(uv, center);
          
          // Audio modulation
          float audioMod = 1.0;
          if (u_audio_reactive > 0.5) {
            // Bass drives amplitude, mids drive frequency, highs add shimmer
            audioMod = 1.0 + (u_audio_bass * u_audio_bass_influence * 2.0 + 
                             u_audio_mid * u_audio_mid_influence + 
                             u_audio_high * u_audio_high_influence * 0.5) * u_audio_sensitivity;
          }
          
          // Create multiple ripple layers with audio modulation
          float ripple1 = sin(dist * u_wavelength * 20.0 * audioMod - time * u_speed * 2.0) * u_amplitude * 0.02;
          float ripple2 = sin(dist * u_wavelength * 35.0 * audioMod - time * u_speed * 1.5) * u_amplitude * 0.015;
          float ripple3 = sin(dist * u_wavelength * 50.0 * audioMod - time * u_speed * 1.2) * u_amplitude * 0.01;
          
          // Add some randomness for organic feel
          float noiseRipple = fractalNoise(uv * 3.0 + time * 0.1) * u_amplitude * 0.005;
          
          // Audio reactive pulsing
          float audioPulse = 0.0;
          if (u_audio_reactive > 0.5) {
            audioPulse = u_audio_rms * u_audio_sensitivity * 0.01;
          }
          
          float totalRipple = (ripple1 + ripple2 + ripple3 + noiseRipple + audioPulse) * u_intensity;
          
          // Radial distortion
          vec2 direction = normalize(uv - center);
          return direction * totalRipple;
        }
        
        // Heat wave effect
        vec2 heatWave(vec2 uv, float time) {
          // Audio modulation - bass creates waves, mids control speed
          float audioMod = 1.0;
          float audioSpeed = 1.0;
          if (u_audio_reactive > 0.5) {
            audioMod = 1.0 + (u_audio_bass * u_audio_bass_influence * 3.0) * u_audio_sensitivity;
            audioSpeed = 1.0 + (u_audio_mid * u_audio_mid_influence) * u_audio_sensitivity;
          }
          
          // Vertical heat shimmer
          float heat1 = sin(uv.x * u_wavelength * 15.0 + time * u_speed * 3.0 * audioSpeed) * u_amplitude * 0.02 * audioMod;
          float heat2 = sin(uv.x * u_wavelength * 25.0 + time * u_speed * 2.0 * audioSpeed) * u_amplitude * 0.015 * audioMod;
          
          // Add some horizontal variation
          float heat3 = sin(uv.y * u_wavelength * 10.0 + time * u_speed * 1.5 * audioSpeed) * u_amplitude * 0.01;
          
          // Noise-based distortion
          float noiseHeat = fractalNoise(uv * 2.0 + time * 0.05) * u_amplitude * 0.008;
          
          // Audio reactive shimmer
          float audioShimmer = 0.0;
          if (u_audio_reactive > 0.5) {
            audioShimmer = u_audio_high * u_audio_high_influence * u_audio_sensitivity * 0.015;
          }
          
          return vec2(heat1 + heat2 + noiseHeat + audioShimmer, heat3) * u_intensity;
        }
        
        // Flowing distortion effect
        vec2 flowingDistortion(vec2 uv, float time) {
          // Audio modulation - all frequencies contribute to flow
          float audioFlow = 1.0;
          if (u_audio_reactive > 0.5) {
            audioFlow = 1.0 + (u_audio_bass * u_audio_bass_influence * 2.0 + 
                              u_audio_mid * u_audio_mid_influence * 1.5 + 
                              u_audio_high * u_audio_high_influence) * u_audio_sensitivity;
          }
          
          // Create flowing patterns
          float flow1 = sin(uv.x * u_wavelength * 12.0 + uv.y * u_wavelength * 8.0 + time * u_speed * 2.5 * audioFlow) * u_amplitude * 0.02;
          float flow2 = sin(uv.x * u_wavelength * 18.0 - uv.y * u_wavelength * 12.0 + time * u_speed * 1.8 * audioFlow) * u_amplitude * 0.015;
          
          // Add circular flow patterns
          vec2 center = vec2(0.5, 0.5);
          float angle = atan(uv.y - center.y, uv.x - center.x);
          float radius = distance(uv, center);
          
          float circularFlow = sin(angle * 8.0 + radius * u_wavelength * 20.0 + time * u_speed * 2.0) * u_amplitude * 0.01;
          
          // Noise-based flow
          float noiseFlow = fractalNoise(uv * 1.5 + time * 0.03) * u_amplitude * 0.006;
          
          // Audio reactive swirl
          float audioSwirl = 0.0;
          if (u_audio_reactive > 0.5) {
            audioSwirl = sin(angle * 4.0 + u_audio_rms * 10.0) * u_audio_sensitivity * 0.01;
          }
          
          return vec2(flow1 + circularFlow + noiseFlow + audioSwirl, flow2 + noiseFlow) * u_intensity;
        }
        
        // Gentle wave effect
        vec2 gentleWave(vec2 uv, float time) {
          // Audio modulation - subtle response to all frequencies
          float audioWave = 1.0;
          if (u_audio_reactive > 0.5) {
            audioWave = 1.0 + (u_audio_bass * u_audio_bass_influence * 0.5 + 
                              u_audio_mid * u_audio_mid_influence * 0.3 + 
                              u_audio_high * u_audio_high_influence * 0.2) * u_audio_sensitivity;
          }
          
          // Soft, gentle waves
          float wave1 = sin(uv.x * u_wavelength * 8.0 + time * u_speed * 1.5) * u_amplitude * 0.015 * audioWave;
          float wave2 = sin(uv.y * u_wavelength * 6.0 + time * u_speed * 1.2) * u_amplitude * 0.012 * audioWave;
          
          // Subtle diagonal waves
          float wave3 = sin((uv.x + uv.y) * u_wavelength * 10.0 + time * u_speed * 1.8) * u_amplitude * 0.008;
          
          // Very subtle noise
          float noiseWave = fractalNoise(uv * 1.0 + time * 0.02) * u_amplitude * 0.003;
          
          // Audio reactive gentle pulse
          float audioPulse = 0.0;
          if (u_audio_reactive > 0.5) {
            audioPulse = u_audio_rms * u_audio_sensitivity * 0.005;
          }
          
          return vec2(wave1 + wave3 + noiseWave + audioPulse, wave2 + noiseWave) * u_intensity;
        }
        
        // Function to get distance from point to line segment
        float distanceToLineSegment(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a;
          vec2 ba = b - a;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          return length(pa - ba * h);
        }
        
        // Pose-based distortion functions - joints + lines
        vec2 getPoseDistortion(vec2 uv, float pose_data[66]) {
          vec2 totalDistortion = vec2(0.0);
          float totalWeight = 0.0;
          
          // Key joints that create the most visible distortion
          int[] keyJoints = int[](
            11, 12, // shoulders
            15, 16, // wrists
            23, 24, // hips
            0       // nose (head)
          );
          
          // Key skeleton connections for line-based ripples
          
          // Add joint-based ripples
          for (int i = 0; i < 7; i++) {
            int jointIndex = keyJoints[i];
            int dataIndex = jointIndex * 2;
            
            if (dataIndex < 66) {
              float jointX = pose_data[dataIndex];
              float jointY = pose_data[dataIndex + 1];
              
              // Check if joint has valid data
              if (jointX > 0.0 && jointX < 1.0 && jointY > 0.0 && jointY < 1.0) {
                vec2 jointPos = vec2(jointX, jointY);
                float dist = distance(uv, jointPos);
                
                // Create visible ripple effects around joints (even smaller)
                if (dist < 0.02) {
                  float ripple = sin(dist * 30.0 - u_time * 2.0) * 0.003;
                  float weight = 1.0 / (1.0 + dist * 20.0);
                  
                  vec2 direction = normalize(uv - jointPos);
                  totalDistortion += direction * ripple * weight;
                  totalWeight += weight;
                }
              }
            }
          }
          
          // Add line-based ripples for ALL skeleton connections
          // Shoulder to shoulder connection
          int leftShoulderIndex = 11 * 2;
          int rightShoulderIndex = 12 * 2;
          if (leftShoulderIndex < 66 && rightShoulderIndex < 66) {
            float leftX = pose_data[leftShoulderIndex];
            float leftY = pose_data[leftShoulderIndex + 1];
            float rightX = pose_data[rightShoulderIndex];
            float rightY = pose_data[rightShoulderIndex + 1];
            
            if (leftX > 0.0 && leftX < 1.0 && leftY > 0.0 && leftY < 1.0 &&
                rightX > 0.0 && rightX < 1.0 && rightY > 0.0 && rightY < 1.0) {
              vec2 leftPos = vec2(leftX, leftY);
              vec2 rightPos = vec2(rightX, rightY);
              float lineDist = distanceToLineSegment(uv, leftPos, rightPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightPos - leftPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Head connections removed as requested
          
          // Add left arm connection (shoulder to elbow to wrist)
          int leftElbowIndex = 13 * 2;
          int leftWristIndex = 15 * 2;
          if (leftShoulderIndex < 66 && leftElbowIndex < 66) {
            float leftShoulderX = pose_data[leftShoulderIndex];
            float leftShoulderY = pose_data[leftShoulderIndex + 1];
            float leftElbowX = pose_data[leftElbowIndex];
            float leftElbowY = pose_data[leftElbowIndex + 1];
            
            if (leftShoulderX > 0.0 && leftShoulderX < 1.0 && leftShoulderY > 0.0 && leftShoulderY < 1.0 &&
                leftElbowX > 0.0 && leftElbowX < 1.0 && leftElbowY > 0.0 && leftElbowY < 1.0) {
              vec2 leftShoulderPos = vec2(leftShoulderX, leftShoulderY);
              vec2 leftElbowPos = vec2(leftElbowX, leftElbowY);
              float lineDist = distanceToLineSegment(uv, leftShoulderPos, leftElbowPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(leftElbowPos - leftShoulderPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          if (leftElbowIndex < 66 && leftWristIndex < 66) {
            float leftElbowX = pose_data[leftElbowIndex];
            float leftElbowY = pose_data[leftElbowIndex + 1];
            float leftWristX = pose_data[leftWristIndex];
            float leftWristY = pose_data[leftWristIndex + 1];
            
            if (leftElbowX > 0.0 && leftElbowX < 1.0 && leftElbowY > 0.0 && leftElbowY < 1.0 &&
                leftWristX > 0.0 && leftWristX < 1.0 && leftWristY > 0.0 && leftWristY < 1.0) {
              vec2 leftElbowPos = vec2(leftElbowX, leftElbowY);
              vec2 leftWristPos = vec2(leftWristX, leftWristY);
              float lineDist = distanceToLineSegment(uv, leftElbowPos, leftWristPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(leftWristPos - leftElbowPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Add right arm connection (shoulder to elbow to wrist)
          int rightElbowIndex = 14 * 2;
          int rightWristIndex = 16 * 2;
          if (rightShoulderIndex < 66 && rightElbowIndex < 66) {
            float rightShoulderX = pose_data[rightShoulderIndex];
            float rightShoulderY = pose_data[rightShoulderIndex + 1];
            float rightElbowX = pose_data[rightElbowIndex];
            float rightElbowY = pose_data[rightElbowIndex + 1];
            
            if (rightShoulderX > 0.0 && rightShoulderX < 1.0 && rightShoulderY > 0.0 && rightShoulderY < 1.0 &&
                rightElbowX > 0.0 && rightElbowX < 1.0 && rightElbowY > 0.0 && rightElbowY < 1.0) {
              vec2 rightShoulderPos = vec2(rightShoulderX, rightShoulderY);
              vec2 rightElbowPos = vec2(rightElbowX, rightElbowY);
              float lineDist = distanceToLineSegment(uv, rightShoulderPos, rightElbowPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightElbowPos - rightShoulderPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          if (rightElbowIndex < 66 && rightWristIndex < 66) {
            float rightElbowX = pose_data[rightElbowIndex];
            float rightElbowY = pose_data[rightElbowIndex + 1];
            float rightWristX = pose_data[rightWristIndex];
            float rightWristY = pose_data[rightWristIndex + 1];
            
            if (rightElbowX > 0.0 && rightElbowX < 1.0 && rightElbowY > 0.0 && rightElbowY < 1.0 &&
                rightWristX > 0.0 && rightWristX < 1.0 && rightWristY > 0.0 && rightWristY < 1.0) {
              vec2 rightElbowPos = vec2(rightElbowX, rightElbowY);
              vec2 rightWristPos = vec2(rightWristX, rightWristY);
              float lineDist = distanceToLineSegment(uv, rightElbowPos, rightWristPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightWristPos - rightElbowPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Add torso connection (shoulder to hip)
          int leftHipIndex = 23 * 2;
          int rightHipIndex = 24 * 2;
          if (leftShoulderIndex < 66 && leftHipIndex < 66) {
            float leftShoulderX = pose_data[leftShoulderIndex];
            float leftShoulderY = pose_data[leftShoulderIndex + 1];
            float leftHipX = pose_data[leftHipIndex];
            float leftHipY = pose_data[leftHipIndex + 1];
            
            if (leftShoulderX > 0.0 && leftShoulderX < 1.0 && leftShoulderY > 0.0 && leftShoulderY < 1.0 &&
                leftHipX > 0.0 && leftHipX < 1.0 && leftHipY > 0.0 && leftHipY < 1.0) {
              vec2 leftShoulderPos = vec2(leftShoulderX, leftShoulderY);
              vec2 leftHipPos = vec2(leftHipX, leftHipY);
              float lineDist = distanceToLineSegment(uv, leftShoulderPos, leftHipPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(leftHipPos - leftShoulderPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          if (rightShoulderIndex < 66 && rightHipIndex < 66) {
            float rightShoulderX = pose_data[rightShoulderIndex];
            float rightShoulderY = pose_data[rightShoulderIndex + 1];
            float rightHipX = pose_data[rightHipIndex];
            float rightHipY = pose_data[rightHipIndex + 1];
            
            if (rightShoulderX > 0.0 && rightShoulderX < 1.0 && rightShoulderY > 0.0 && rightShoulderY < 1.0 &&
                rightHipX > 0.0 && rightHipX < 1.0 && rightHipY > 0.0 && rightHipY < 1.0) {
              vec2 rightShoulderPos = vec2(rightShoulderX, rightShoulderY);
              vec2 rightHipPos = vec2(rightHipX, rightHipY);
              float lineDist = distanceToLineSegment(uv, rightShoulderPos, rightHipPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightHipPos - rightShoulderPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Add hip to hip connection
          if (leftHipIndex < 66 && rightHipIndex < 66) {
            float leftHipX = pose_data[leftHipIndex];
            float leftHipY = pose_data[leftHipIndex + 1];
            float rightHipX = pose_data[rightHipIndex];
            float rightHipY = pose_data[rightHipIndex + 1];
            
            if (leftHipX > 0.0 && leftHipX < 1.0 && leftHipY > 0.0 && leftHipY < 1.0 &&
                rightHipX > 0.0 && rightHipX < 1.0 && rightHipY > 0.0 && rightHipY < 1.0) {
              vec2 leftHipPos = vec2(leftHipX, leftHipY);
              vec2 rightHipPos = vec2(rightHipX, rightHipY);
              float lineDist = distanceToLineSegment(uv, leftHipPos, rightHipPos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightHipPos - leftHipPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Add leg connections
          int leftKneeIndex = 25 * 2;
          int leftAnkleIndex = 27 * 2;
          int rightKneeIndex = 26 * 2;
          int rightAnkleIndex = 28 * 2;
          
          // Left hip to left knee
          if (leftHipIndex < 66 && leftKneeIndex < 66) {
            float leftHipX = pose_data[leftHipIndex];
            float leftHipY = pose_data[leftHipIndex + 1];
            float leftKneeX = pose_data[leftKneeIndex];
            float leftKneeY = pose_data[leftKneeIndex + 1];
            
            if (leftHipX > 0.0 && leftHipX < 1.0 && leftHipY > 0.0 && leftHipY < 1.0 &&
                leftKneeX > 0.0 && leftKneeX < 1.0 && leftKneeY > 0.0 && leftKneeY < 1.0) {
              vec2 leftHipPos = vec2(leftHipX, leftHipY);
              vec2 leftKneePos = vec2(leftKneeX, leftKneeY);
              float lineDist = distanceToLineSegment(uv, leftHipPos, leftKneePos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(leftKneePos - leftHipPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Left knee to left ankle
          if (leftKneeIndex < 66 && leftAnkleIndex < 66) {
            float leftKneeX = pose_data[leftKneeIndex];
            float leftKneeY = pose_data[leftKneeIndex + 1];
            float leftAnkleX = pose_data[leftAnkleIndex];
            float leftAnkleY = pose_data[leftAnkleIndex + 1];
            
            if (leftKneeX > 0.0 && leftKneeX < 1.0 && leftKneeY > 0.0 && leftKneeY < 1.0 &&
                leftAnkleX > 0.0 && leftAnkleX < 1.0 && leftAnkleY > 0.0 && leftAnkleY < 1.0) {
              vec2 leftKneePos = vec2(leftKneeX, leftKneeY);
              vec2 leftAnklePos = vec2(leftAnkleX, leftAnkleY);
              float lineDist = distanceToLineSegment(uv, leftKneePos, leftAnklePos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(leftAnklePos - leftKneePos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Right hip to right knee
          if (rightHipIndex < 66 && rightKneeIndex < 66) {
            float rightHipX = pose_data[rightHipIndex];
            float rightHipY = pose_data[rightHipIndex + 1];
            float rightKneeX = pose_data[rightKneeIndex];
            float rightKneeY = pose_data[rightKneeIndex + 1];
            
            if (rightHipX > 0.0 && rightHipX < 1.0 && rightHipY > 0.0 && rightHipY < 1.0 &&
                rightKneeX > 0.0 && rightKneeX < 1.0 && rightKneeY > 0.0 && rightKneeY < 1.0) {
              vec2 rightHipPos = vec2(rightHipX, rightHipY);
              vec2 rightKneePos = vec2(rightKneeX, rightKneeY);
              float lineDist = distanceToLineSegment(uv, rightHipPos, rightKneePos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightKneePos - rightHipPos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Right knee to right ankle
          if (rightKneeIndex < 66 && rightAnkleIndex < 66) {
            float rightKneeX = pose_data[rightKneeIndex];
            float rightKneeY = pose_data[rightKneeIndex + 1];
            float rightAnkleX = pose_data[rightAnkleIndex];
            float rightAnkleY = pose_data[rightAnkleIndex + 1];
            
            if (rightKneeX > 0.0 && rightKneeX < 1.0 && rightKneeY > 0.0 && rightKneeY < 1.0 &&
                rightAnkleX > 0.0 && rightAnkleX < 1.0 && rightAnkleY > 0.0 && rightAnkleY < 1.0) {
              vec2 rightKneePos = vec2(rightKneeX, rightKneeY);
              vec2 rightAnklePos = vec2(rightAnkleX, rightAnkleY);
              float lineDist = distanceToLineSegment(uv, rightKneePos, rightAnklePos);
              
              if (lineDist < 0.015) {
                float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
                float weight = 1.0 / (1.0 + lineDist * 25.0);
                vec2 lineDir = normalize(rightAnklePos - rightKneePos);
                vec2 perpDir = vec2(-lineDir.y, lineDir.x);
                totalDistortion += perpDir * ripple * weight;
                totalWeight += weight;
              }
            }
          }
          
          if (totalWeight > 0.0) {
            totalDistortion /= totalWeight;
          }
          
          return totalDistortion * 0.8; // Visible scale for effects
        }
        
        void main() {
          vec2 uv = vUv;
          vec2 ambientDistortion = vec2(0.0);
          vec2 poseDistortion = vec2(0.0);
          
          // Apply ambient animation effects (only when ambient animation is active)
          if (u_effect_type < 0.5) {
            // Water ripple
            ambientDistortion = waterRipple(uv, u_time);
          } else if (u_effect_type < 1.5) {
            // Heat wave
            ambientDistortion = heatWave(uv, u_time);
          } else if (u_effect_type < 2.5) {
            // Flowing distortion
            ambientDistortion = flowingDistortion(uv, u_time);
          } else {
            // Gentle wave
            ambientDistortion = gentleWave(uv, u_time);
          }
          
          // Apply pose-based distortion if pose data is available (independent of ambient animation)
          if (u_pose_active > 0.5) {
            poseDistortion = getPoseDistortion(uv, u_pose_data);
          }
          
          // Combine both distortions
          vec2 totalDistortion = ambientDistortion + poseDistortion;
          
          // Debug: Add a visible color tint when pose distortion is active
          if (u_pose_active > 0.5) {
            // Add a subtle red tint to show pose distortion is working
            // This is temporary debug code
          }
          
          // Apply distortion to UV coordinates
          vec2 distortedUv = uv + totalDistortion;
          
          // Clamp UV coordinates to prevent sampling outside texture
          distortedUv = clamp(distortedUv, 0.0, 1.0);
          
          // Sample the background texture with distortion
          vec4 background = texture2D(u_texture, distortedUv);
          
          // Add subtle color variation based on distortion for more realism
          float colorVariation = length(totalDistortion) * 0.1;
          background.rgb = mix(background.rgb, background.rgb * 1.1, colorVariation);
          
          // Pose distortion is now working properly
          
          gl_FragColor = background;
        }
      `,
      transparent: false
    });

    setShaderMaterial(material);
  }, [texture, size.width, size.height, effectType, speed, amplitude, wavelength, intensity, audioParams]);

  // Create a static shader material for when animation is off (but still with pose distortion)
  const staticShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_texture: { value: texture },
      u_time: { value: 0 },
      u_pose_data: { value: new Float32Array(66) },
      u_pose_active: { value: 0.0 }
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
      uniform float u_time;
      uniform float u_pose_data[66];
      uniform float u_pose_active;
      varying vec2 vUv;
      
      // Function to get distance from point to line segment
      float distanceToLineSegment(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }
      
      // Pose-based distortion functions - joints + lines
      vec2 getPoseDistortion(vec2 uv, float pose_data[66]) {
        vec2 totalDistortion = vec2(0.0);
        float totalWeight = 0.0;
        
        // Key joints that create the most visible distortion
        int[] keyJoints = int[](
          11, 12, // shoulders
          15, 16, // wrists
          23, 24, // hips
          0       // nose (head)
        );
        
        // Add joint-based ripples
        for (int i = 0; i < 7; i++) {
          int jointIndex = keyJoints[i];
          int dataIndex = jointIndex * 2;
          
          if (dataIndex < 66) {
            float jointX = pose_data[dataIndex];
            float jointY = pose_data[dataIndex + 1];
            
            // Check if joint has valid data
            if (jointX > 0.0 && jointX < 1.0 && jointY > 0.0 && jointY < 1.0) {
              vec2 jointPos = vec2(jointX, jointY);
              float dist = distance(uv, jointPos);
              
              // Create visible ripple effects around joints (even smaller, same as animated shader)
              if (dist < 0.02) {
                float ripple = sin(dist * 30.0 - u_time * 2.0) * 0.003;
                float weight = 1.0 / (1.0 + dist * 20.0);
                
                vec2 direction = normalize(uv - jointPos);
                totalDistortion += direction * ripple * weight;
                totalWeight += weight;
              }
            }
          }
        }
        
        // Add line-based ripples for all skeleton connections
        // Shoulder to shoulder connection
        int leftShoulderIndex = 11 * 2;
        int rightShoulderIndex = 12 * 2;
        if (leftShoulderIndex < 66 && rightShoulderIndex < 66) {
          float leftX = pose_data[leftShoulderIndex];
          float leftY = pose_data[leftShoulderIndex + 1];
          float rightX = pose_data[rightShoulderIndex];
          float rightY = pose_data[rightShoulderIndex + 1];
          
          if (leftX > 0.0 && leftX < 1.0 && leftY > 0.0 && leftY < 1.0 &&
              rightX > 0.0 && rightX < 1.0 && rightY > 0.0 && rightY < 1.0) {
            vec2 leftPos = vec2(leftX, leftY);
            vec2 rightPos = vec2(rightX, rightY);
            float lineDist = distanceToLineSegment(uv, leftPos, rightPos);
            
            if (lineDist < 0.015) {
              float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
              float weight = 1.0 / (1.0 + lineDist * 25.0);
              vec2 lineDir = normalize(rightPos - leftPos);
              vec2 perpDir = vec2(-lineDir.y, lineDir.x);
              totalDistortion += perpDir * ripple * weight;
              totalWeight += weight;
            }
          }
        }
        
        // Add left arm connection (shoulder to elbow to wrist)
        int leftElbowIndex = 13 * 2;
        int leftWristIndex = 15 * 2;
        if (leftShoulderIndex < 66 && leftElbowIndex < 66) {
          float leftShoulderX = pose_data[leftShoulderIndex];
          float leftShoulderY = pose_data[leftShoulderIndex + 1];
          float leftElbowX = pose_data[leftElbowIndex];
          float leftElbowY = pose_data[leftElbowIndex + 1];
          
          if (leftShoulderX > 0.0 && leftShoulderX < 1.0 && leftShoulderY > 0.0 && leftShoulderY < 1.0 &&
              leftElbowX > 0.0 && leftElbowX < 1.0 && leftElbowY > 0.0 && leftElbowY < 1.0) {
            vec2 leftShoulderPos = vec2(leftShoulderX, leftShoulderY);
            vec2 leftElbowPos = vec2(leftElbowX, leftElbowY);
            float lineDist = distanceToLineSegment(uv, leftShoulderPos, leftElbowPos);
            
            if (lineDist < 0.015) {
              float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
              float weight = 1.0 / (1.0 + lineDist * 25.0);
              vec2 lineDir = normalize(leftElbowPos - leftShoulderPos);
              vec2 perpDir = vec2(-lineDir.y, lineDir.x);
              totalDistortion += perpDir * ripple * weight;
              totalWeight += weight;
            }
          }
        }
        
        // Add right arm connection (shoulder to elbow to wrist)
        int rightElbowIndex = 14 * 2;
        int rightWristIndex = 16 * 2;
        if (rightShoulderIndex < 66 && rightElbowIndex < 66) {
          float rightShoulderX = pose_data[rightShoulderIndex];
          float rightShoulderY = pose_data[rightShoulderIndex + 1];
          float rightElbowX = pose_data[rightElbowIndex];
          float rightElbowY = pose_data[rightElbowIndex + 1];
          
          if (rightShoulderX > 0.0 && rightShoulderX < 1.0 && rightShoulderY > 0.0 && rightShoulderY < 1.0 &&
              rightElbowX > 0.0 && rightElbowX < 1.0 && rightElbowY > 0.0 && rightElbowY < 1.0) {
            vec2 rightShoulderPos = vec2(rightShoulderX, rightShoulderY);
            vec2 rightElbowPos = vec2(rightElbowX, rightElbowY);
            float lineDist = distanceToLineSegment(uv, rightShoulderPos, rightElbowPos);
            
            if (lineDist < 0.015) {
              float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
              float weight = 1.0 / (1.0 + lineDist * 25.0);
              vec2 lineDir = normalize(rightElbowPos - rightShoulderPos);
              vec2 perpDir = vec2(-lineDir.y, lineDir.x);
              totalDistortion += perpDir * ripple * weight;
              totalWeight += weight;
            }
          }
        }
        
        // Add torso connection (shoulder to hip)
        int leftHipIndex = 23 * 2;
        int rightHipIndex = 24 * 2;
        if (leftShoulderIndex < 66 && leftHipIndex < 66) {
          float leftShoulderX = pose_data[leftShoulderIndex];
          float leftShoulderY = pose_data[leftShoulderIndex + 1];
          float leftHipX = pose_data[leftHipIndex];
          float leftHipY = pose_data[leftHipIndex + 1];
          
          if (leftShoulderX > 0.0 && leftShoulderX < 1.0 && leftShoulderY > 0.0 && leftShoulderY < 1.0 &&
              leftHipX > 0.0 && leftHipX < 1.0 && leftHipY > 0.0 && leftHipY < 1.0) {
            vec2 leftShoulderPos = vec2(leftShoulderX, leftShoulderY);
            vec2 leftHipPos = vec2(leftHipX, leftHipY);
            float lineDist = distanceToLineSegment(uv, leftShoulderPos, leftHipPos);
            
            if (lineDist < 0.015) {
              float ripple = sin(lineDist * 40.0 - u_time * 2.5) * 0.002;
              float weight = 1.0 / (1.0 + lineDist * 25.0);
              vec2 lineDir = normalize(leftHipPos - leftShoulderPos);
              vec2 perpDir = vec2(-lineDir.y, lineDir.x);
              totalDistortion += perpDir * ripple * weight;
              totalWeight += weight;
            }
          }
        }
        
        if (totalWeight > 0.0) {
          totalDistortion /= totalWeight;
        }
        
        return totalDistortion * 0.8; // Visible scale for effects
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 poseDistortion = vec2(0.0);
        
        // ALWAYS apply pose-based distortion if pose data is available
        if (u_pose_active > 0.5) {
          poseDistortion = getPoseDistortion(uv, u_pose_data);
        }
        
        // Apply distortion to UV coordinates
        vec2 distortedUv = uv + poseDistortion;
        
        // Clamp UV coordinates to prevent sampling outside texture
        distortedUv = clamp(distortedUv, 0.0, 1.0);
        
        // Sample the background texture with distortion
        vec4 background = texture2D(u_texture, distortedUv);
        
        // Add subtle color variation based on distortion for more realism
        float colorVariation = length(poseDistortion) * 0.1;
        background.rgb = mix(background.rgb, background.rgb * 1.1, colorVariation);
        
        gl_FragColor = background;
      }
    `,
    transparent: false
  });

  // Update time uniform and pose data
  useFrame((state) => {
    if (shaderMaterial) {
        // Always update time (needed for both ambient animation and pose distortion)
        shaderMaterial.uniforms.u_time.value = state.clock.elapsedTime;
        
        // Update audio data if audio reactive is enabled
        if (audioReactive && audioDataRef.current) {
          const audioData = audioDataRef.current;
          const bass = audioData.bands[0] || 0;
          const mid = audioData.bands[1] || 0;
          const high = audioData.bands[2] || 0;
          const rms = audioData.rms || 0;
          
          // Only update if values changed significantly to reduce GPU updates
          const last = lastAudioUpdateRef.current;
          if (Math.abs(bass - last.bass) > AUDIO_UPDATE_THRESHOLD ||
              Math.abs(mid - last.mid) > AUDIO_UPDATE_THRESHOLD ||
              Math.abs(high - last.high) > AUDIO_UPDATE_THRESHOLD ||
              Math.abs(rms - last.rms) > AUDIO_UPDATE_THRESHOLD) {
            shaderMaterial.uniforms.u_audio_bass.value = bass;
            shaderMaterial.uniforms.u_audio_mid.value = mid;
            shaderMaterial.uniforms.u_audio_high.value = high;
            shaderMaterial.uniforms.u_audio_rms.value = rms;
            
            lastAudioUpdateRef.current = { bass, mid, high, rms };
          }
        }
    }
    
    // Also update static shader material if it exists
    if (staticShaderMaterial) {
        // Always update time for pose distortion
        staticShaderMaterial.uniforms.u_time.value = state.clock.elapsedTime;
    }
    
    // Always update pose data if available (independent of ambient animation)
    if (poseData?.landmarks) {
      const poseArray = new Float32Array(66); // 33 landmarks * 2 (x,y)
      poseData.landmarks.forEach((landmark, index) => {
        if (landmark && index < 33) {
          poseArray[index * 2] = landmark.x;
          poseArray[index * 2 + 1] = landmark.y;
        }
      });
      
      // Transform webcam coordinates to match the SimpleSkeleton coordinate system exactly
      const transformedPoseArray = new Float32Array(66);
      poseData.landmarks.forEach((landmark, index) => {
        if (landmark && index < 33) {
          // Use the same transformation as SimpleSkeleton
          const scale = 22; // Use the same default scale as SimpleSkeleton
          const x = (landmark.x - 0.5) * 200 * scale;
          const y = (0.5 - landmark.y) * 200 * scale;
          
          // Convert 3D coordinates to UV coordinates for the shader
          // The background plane is 20000x10000, so convert to UV space
          const uvX = (x / 20000) + 0.5; // Convert to UV and center
          const uvY = (y / 10000) + 0.5; // Convert to UV and center
          
          transformedPoseArray[index * 2] = uvX;
          transformedPoseArray[index * 2 + 1] = uvY;
        }
      });
      
      if (shaderMaterial) {
        shaderMaterial.uniforms.u_pose_data.value = transformedPoseArray;
        shaderMaterial.uniforms.u_pose_active.value = 1.0;
      }
      
      // Also update static shader material
      if (staticShaderMaterial) {
        staticShaderMaterial.uniforms.u_pose_data.value = transformedPoseArray;
        staticShaderMaterial.uniforms.u_pose_active.value = 1.0;
      }
      
      // Debug logs removed for cleaner console
    } else {
      if (shaderMaterial) {
        shaderMaterial.uniforms.u_pose_active.value = 0.0;
      }
      if (staticShaderMaterial) {
        staticShaderMaterial.uniforms.u_pose_active.value = 0.0;
      }
    }
  });

  // Helper function to convert effect type to numeric value
  const getEffectTypeValue = (type) => {
    switch (type) {
      case 'waterRipple': return 0.0;
      case 'heatWave': return 1.0;
      case 'flowingDistortion': return 2.0;
      case 'gentleWave': return 3.0;
      default: return 0.0;
    }
  };

  if (!backgroundImage || !shaderMaterial) {
    return null;
  }

  // When not active, render a static background without animation
  if (!isActive) {
    return (
      <mesh ref={meshRef} position={[0, 0, 1]} scale={[scale, scale, scale]}>
        <planeGeometry args={[20000, 10000]} />
        <primitive object={staticShaderMaterial} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={[0, 0, 1]} scale={[scale, scale, scale]}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={shaderMaterial} />
    </mesh>
  );
};

export default AmbientBackgroundAnimation;
