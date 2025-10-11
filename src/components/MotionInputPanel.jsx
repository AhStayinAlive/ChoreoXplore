import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import usePoseDetection from '../hooks/usePoseDetection';
import { mapPoseToMotion } from '../core/motionMapping';
import useStore from '../core/store';

const MotionInputPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const { updatePoseData } = usePoseDetection();
  const setPoseData = useStore(s => s.setPoseData);
  const isActive = useStore(s => s.motionCaptureActive);
  const setIsActive = useStore(s => s.setMotionCaptureActive);
  const skeletonVisible = useStore(s => s.skeletonVisible);
  const setSkeletonVisible = useStore(s => s.setSkeletonVisible);
  
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

  // Check video element availability on mount
  useEffect(() => {
    console.log('MotionInputPanel mounted, videoRef.current:', videoRef.current);
    if (videoRef.current) {
      console.log('✅ Video element is available on mount');
    } else {
      console.log('❌ Video element not available on mount');
    }
    
    // Cleanup function for when component unmounts
    return () => {
      console.log('MotionInputPanel unmounting, cleaning up camera...');
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          console.log('Cleaning up track:', track.kind, track.label);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      console.log('Starting camera access...');
      
      // First, clean up any existing streams
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('Cleaning up existing stream...');
        const existingStream = videoRef.current.srcObject;
        existingStream.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind, track.label);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
      
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }
      
      console.log('MediaDevices API is available');
      
      // Try the most basic approach - just get any camera (NO AUDIO)
      console.log('Requesting camera access (video only)...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false  // Explicitly disable audio to prevent feedback
      });
      
      console.log('✅ Camera access successful');
      console.log('Stream tracks:', stream.getTracks());
      
      // Check what devices are available after getting permission
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available cameras after permission:', videoDevices);
      } catch (enumError) {
        console.log('Device enumeration failed:', enumError);
      }

      if (videoRef.current && stream) {
        console.log('Attaching stream to video element...');
        videoRef.current.srcObject = stream;
        
        // Add event listeners for debugging
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded');
          console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        };
        
        videoRef.current.oncanplay = () => {
          console.log('✅ Video can play');
        };
        
        videoRef.current.onerror = (e) => {
          console.error('❌ Video element error:', e);
        };
        
        // Try to play the video
        try {
          await videoRef.current.play();
          console.log('✅ Video play() successful');
          setError(null); // Clear any previous errors
        } catch (playError) {
          console.error('❌ Video play() failed:', playError);
          throw new Error(`Video play failed: ${playError.message}`);
        }
      } else {
        console.error('❌ Missing video element or stream');
        console.log('videoRef.current:', videoRef.current);
        console.log('stream:', stream);
        throw new Error('No video element or stream available');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Failed to access camera: ${err.message}. Please check permissions and make sure a camera is connected.`);
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
      ctx.lineWidth = 4; // Thicker lines for better visibility
      
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
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 6, 0, 2 * Math.PI); // Larger dots
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
        // Create an ImageData object with proper dimensions for MediaPipe
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const results = poseLandmarker.detectForVideo(imageData, currentTime * 1000);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const poseData = {
            landmarks: results.landmarks[0],
            worldLandmarks: results.worldLandmarks?.[0],
            timestamp: currentTime
          };
          
          updatePoseData(poseData);
          setPoseData(poseData); // Update store for motion distortion
          drawPoseLandmarks(results.landmarks, results.worldLandmarks);
          
          // Map pose data to motion for background movement (check if ambient animation is active)
          const ambientAnimationActive = useStore.getState().ambientAnimationParams?.isActive ?? false;
          mapPoseToMotion(poseData, ambientAnimationActive);
        } else {
          updatePoseData(null);
          setPoseData(null); // Clear store when no pose detected
          // Clear canvas when no pose detected
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          // Map fallback motion data (check if ambient animation is active)
          const ambientAnimationActive = useStore.getState().ambientAnimationParams?.isActive ?? false;
          mapPoseToMotion(null, ambientAnimationActive);
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
    <div className="motion-input-panel bg-gray-900 text-white rounded-lg">
      {/* Header with Title and Buttons */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'white', margin: 0 }}>Motion Input</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          <button
            onClick={toggleMotionDetection}
            disabled={isLoading}
            style={{
              padding: "6px 12px",
              backgroundColor: isActive ? "rgba(220,38,38,0.8)" : "rgba(34,197,94,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "white",
              fontSize: "12px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              minWidth: "auto",
              flexShrink: 0
            }}
          >
            {isLoading ? 'Loading...' : isActive ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => setSkeletonVisible(!skeletonVisible)}
            style={{
              padding: "6px 12px",
              backgroundColor: skeletonVisible ? "rgba(34,197,94,0.8)" : "rgba(107,114,128,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "white",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              minWidth: "auto",
              flexShrink: 0
            }}
          >
            {skeletonVisible ? 'Hide Avatar' : 'Show Avatar'}
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
              <div className="text-sm">Click Start to begin motion detection</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MotionInputPanel;
