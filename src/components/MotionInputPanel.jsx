import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import usePoseDetection from '../hooks/usePoseDetection';
import { mapPoseToMotion } from '../core/motionMapping';

const MotionInputPanel = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const { updatePoseData } = usePoseDetection();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationRef = useRef(null);
  const fpsRef = useRef({ frameCount: 0, lastTime: 0 });

  // Initialize MediaPipe
  const initializeMediaPipe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false
      });

      poseLandmarkerRef.current = poseLandmarker;
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing MediaPipe:', err);
      setError('Failed to initialize pose detection. Please try again.');
      setIsLoading(false);
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Draw pose landmarks on canvas
  const drawPoseLandmarks = useCallback((landmarks, worldLandmarks) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (landmarks && landmarks.length > 0) {
      const landmark = landmarks[0];
      
      // Draw connections between landmarks
      const connections = [
        [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
        [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
        [11, 23], [12, 24], [23, 24],
        [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
        [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
        [23, 25], [24, 26], [25, 26],
        [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
        [9, 10], [0, 9], [0, 10]
      ];

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      
      connections.forEach(([start, end]) => {
        if (landmark[start] && landmark[end]) {
          const startPoint = landmark[start];
          const endPoint = landmark[end];
          
          ctx.beginPath();
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
          ctx.stroke();
        }
      });

      // Draw landmarks
      ctx.fillStyle = '#ff0000';
      landmark.forEach((point, index) => {
        if (point.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  }, []);

  // Process video frame
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const poseLandmarker = poseLandmarkerRef.current;
    
    if (!video || !poseLandmarker || video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const currentTime = video.currentTime;
    if (lastVideoTimeRef.current !== currentTime) {
      lastVideoTimeRef.current = currentTime;

      try {
        const results = poseLandmarker.detectForVideo(video, currentTime * 1000);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const poseData = {
            landmarks: results.landmarks[0],
            worldLandmarks: results.worldLandmarks?.[0],
            timestamp: currentTime
          };
          
          updatePoseData(poseData);
          drawPoseLandmarks(results.landmarks, results.worldLandmarks);
          
          // Map pose data to motion for background movement
          mapPoseToMotion(poseData);
        } else {
          updatePoseData(null);
          // Clear canvas when no pose detected
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error('Error processing frame:', err);
      }
    }

    // Calculate FPS
    const now = performance.now();
    fpsRef.current.frameCount++;
    if (now - fpsRef.current.lastTime >= 1000) {
      setFps(Math.round((fpsRef.current.frameCount * 1000) / (now - fpsRef.current.lastTime)));
      fpsRef.current.frameCount = 0;
      fpsRef.current.lastTime = now;
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [drawPoseLandmarks]);

  // Toggle motion detection
  const toggleMotionDetection = useCallback(async () => {
    if (isActive) {
      setIsActive(false);
      stopCamera();
    } else {
      if (!poseLandmarkerRef.current) {
        await initializeMediaPipe();
      }
      await startCamera();
      setIsActive(true);
      processFrame();
    }
  }, [isActive, initializeMediaPipe, startCamera, stopCamera, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="motion-input-panel bg-gray-900 text-white p-3 rounded-lg" style={{ border: '2px solid #00ff00' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold" style={{ color: '#00ff00' }}>🎭 Motion Input</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-400">FPS: {fps}</div>
          <button
            onClick={toggleMotionDetection}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Loading...' : isActive ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
          {error}
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-center">
              <div className="text-3xl mb-2">🎭</div>
              <div className="text-sm">Click Start to begin motion detection</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 p-2 bg-gray-800 rounded">
        <div className="text-xs text-gray-300 flex justify-between">
          <span>Pose: {isActive ? 'Active' : 'Inactive'}</span>
          <span>Camera: {isActive ? 'On' : 'Off'}</span>
          <span className="text-green-400">✅ Ready</span>
        </div>
        {isActive && (
          <div className="mt-2 text-xs text-gray-400">
            <div>Motion mapping active - check the blue square in the center!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotionInputPanel;
