import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import usePoseDetection from '../hooks/usePoseDetection';
import { mapPoseToMotion } from '../core/motionMapping';
import useStore from '../core/store';
import { useVisStore } from '../state/useVisStore';

const MotionInputPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const { updatePoseData } = usePoseDetection();
  const setPoseData = useStore(s => s.setPoseData);
  const isActive = useStore(s => s.motionCaptureActive);
  const setIsActive = useStore(s => s.setMotionCaptureActive);
  const skeletonVisible = useStore(s => s.skeletonVisible);
  const setSkeletonVisible = useStore(s => s.setSkeletonVisible);
  const inverseHands = useStore(s => s.inverseHands);
  const setInverseHands = useStore(s => s.setInverseHands);
  const setSelectedCameraIndex = useStore(s => s.setSelectedCameraIndex);
  const handEffect = useVisStore(s => s.params.handEffect);
  const setParams = useVisStore(s => s.setParams);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationRef = useRef(null);
  const fpsRef = useRef({ frameCount: 0, lastTime: 0 });

  // Enumerate available cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevicesBefore = devices.filter(device => device.kind === 'videoinput');
      
      // Sort cameras by deviceId to maintain consistent order
      videoDevicesBefore.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
      
      // Set cameras immediately
      setAvailableCameras(videoDevicesBefore);
      
      // IMPORTANT: Set default camera BEFORE requesting permission
      if (!selectedCameraId && videoDevicesBefore.length > 0) {
        setSelectedCameraId(videoDevicesBefore[0].deviceId);
        console.log('Set default camera to first in list:', videoDevicesBefore[0].deviceId.substring(0, 20) + '...');
      }
      
      // Check if any cameras need labels
      const needsPermission = videoDevicesBefore.some(device => !device.label);
      
      if (needsPermission) {
        try {
          const permissionStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 } }
          });
          
          permissionStream.getTracks().forEach(track => track.stop());
          
          // Wait and re-enumerate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const devicesAfter = await navigator.mediaDevices.enumerateDevices();
          const videoDevicesAfter = devicesAfter.filter(device => device.kind === 'videoinput');
          
          // Sort again after re-enumeration
          videoDevicesAfter.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
          
          setAvailableCameras(videoDevicesAfter);
        } catch (permErr) {
          // Keep the cameras we already set
        }
      }
    } catch (err) {
      console.error('Error enumerating cameras:', err);
    }
  }, [selectedCameraId]);

  // Enumerate cameras on mount
  useEffect(() => {
    enumerateCameras();
    
    // Listen for device changes
    const handleDeviceChange = () => enumerateCameras();
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateCameras]);

  // Initialize MediaPipe
  const initializeMediaPipe = useCallback(async (forceReinit = false) => {
    try {
      // If forcing reinitialization, close the existing landmarker first
      if (forceReinit && poseLandmarkerRef.current) {
        console.log('Closing existing MediaPipe instance...');
        try {
          poseLandmarkerRef.current.close();
        } catch (closeErr) {
          console.warn('Error closing MediaPipe:', closeErr);
        }
        poseLandmarkerRef.current = null;
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
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
      console.log('MediaPipe initialized successfully');
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
  const startCamera = useCallback(async (deviceId = null) => {
    try {
      const cameraId = deviceId || selectedCameraId;
      console.log('Starting camera with ID:', cameraId ? cameraId.substring(0, 20) + '...' : 'default');
      
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
      
      let stream;
      
      if (cameraId) {
        // When a specific camera is selected, use exact deviceId
        try {
          // Try with ideal resolution first (not exact to avoid camera switch)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              deviceId: { exact: cameraId },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch (idealError) {
          // If that fails, try with just the deviceId (no resolution constraints)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              deviceId: { exact: selectedCameraId }
            },
            audio: false
          });
        }
      } else {
        // No specific camera selected, use default with resolution preferences
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              facingMode: 'user',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch (error) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
          });
        }
      }
      
      // Log which camera was actually activated
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('Active camera:', videoTrack.label, '- DeviceId:', settings.deviceId.substring(0, 20) + '...');
        
        // Warn if wrong camera
        if (selectedCameraId && settings.deviceId !== selectedCameraId) {
          console.warn('WARNING: Requested camera', selectedCameraId.substring(0, 20) + '... but got', settings.deviceId.substring(0, 20) + '...');
        }
      }
      
      // Update available cameras list after getting permission
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        videoDevices.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
        setAvailableCameras(videoDevices);
      } catch (enumError) {
        // Ignore enumeration errors
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be fully ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 10000);
          
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
          };
          
          videoRef.current.oncanplay = () => {
            console.log('Video can play');
            clearTimeout(timeout);
            resolve();
          };
          
          videoRef.current.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error('Video error: ' + e));
          };
        });
        
        // Try to play the video
        try {
          await videoRef.current.play();
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
  }, [selectedCameraId, setAvailableCameras]);

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
      // Pass video element directly - MediaPipe handles dimensions automatically
      const results = poseLandmarker.detectForVideo(video, currentTime * 1000);
        
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
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with Title and Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        gap: '8px'
      }}>
        <h3 style={{
          color: 'white',
          fontSize: '12px',
          fontWeight: '600',
          margin: 0
        }}>
          Motion Input
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'nowrap'
        }}>
          {/* Camera Selection Dropdown */}
          <select
            value={selectedCameraId}
            onChange={async (e) => {
              const newCameraId = e.target.value;
              console.log('Camera selection changed to:', newCameraId.substring(0, 20) + '...');
              setSelectedCameraId(newCameraId);
              
              // Update camera index in store for wizard tracking
              const cameraIndex = availableCameras.findIndex(cam => cam.deviceId === newCameraId);
              if (cameraIndex !== -1) {
                setSelectedCameraIndex(cameraIndex);
                console.log('Camera index updated to:', cameraIndex);
              }
              
              // If motion detection is active, restart everything properly
              if (isActive) {
                console.log('Motion detection active, restarting with new camera...');
                
                // Stop animation loop first
                if (animationRef.current) {
                  cancelAnimationFrame(animationRef.current);
                  animationRef.current = null;
                }
                
                // Stop the current camera stream
                if (videoRef.current && videoRef.current.srcObject) {
                  const stream = videoRef.current.srcObject;
                  stream.getTracks().forEach(track => {
                    console.log('Stopping track:', track.label);
                    track.stop();
                  });
                  videoRef.current.srcObject = null;
                }
                
                // Reinitialize MediaPipe (this fixes the crash)
                console.log('Reinitializing MediaPipe for new camera...');
                await initializeMediaPipe(true);
                
                // Start new camera with the new deviceId
                try {
                  await startCamera(newCameraId);
                  // Wait for video to be fully ready
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Reset lastVideoTime to force new frame processing
                  lastVideoTimeRef.current = -1;
                  // Restart processing loop
                  processFrame();
                  console.log('Camera switched and motion detection restarted');
                } catch (error) {
                  console.error('Error restarting camera:', error);
                  setIsActive(false);
                }
              }
            }}
            disabled={isLoading}
            style={{
              padding: '4px 6px',
              backgroundColor: 'rgba(107,114,128,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              minWidth: '90px',
              maxWidth: '130px',
              flexShrink: 0,
              outline: 'none'
            }}
          >
            {availableCameras.length === 0 ? (
              <option>No cameras found</option>
            ) : (
              availableCameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  Camera {index + 1}
                </option>
              ))
            )}
          </select>

          <button
            onClick={toggleMotionDetection}
            disabled={isLoading}
            style={{
              padding: '4px 10px',
              backgroundColor: isActive ? 'rgba(220,38,38,0.8)' : 'rgba(34,197,94,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              minWidth: '50px',
              flexShrink: 0
            }}
          >
            {isLoading ? 'Loading...' : isActive ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => {
              const newInverseState = !inverseHands;
              console.log('Toggling inverseHands from', inverseHands, 'to', newInverseState);
              setInverseHands(newInverseState);
              
              // Swap hand selection when toggling inverse
              const currentSelection = handEffect?.handSelection;
              if (currentSelection === 'left') {
                setParams({ handEffect: { handSelection: 'right' } });
              } else if (currentSelection === 'right') {
                setParams({ handEffect: { handSelection: 'left' } });
              }
              // 'both' and 'none' stay the same
            }}
            style={{
              padding: '4px 10px',
              backgroundColor: inverseHands ? 'rgba(34,197,94,0.8)' : 'rgba(107,114,128,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              minWidth: 'auto',
              flexShrink: 0
            }}
          >
            Inverse Hands
          </button>
          <button
            onClick={() => setSkeletonVisible(!skeletonVisible)}
            style={{
              padding: '4px 10px',
              backgroundColor: skeletonVisible ? 'rgba(34,197,94,0.8)' : 'rgba(107,114,128,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              minWidth: 'auto',
              flexShrink: 0
            }}
          >
            {skeletonVisible ? 'Hide Avatar' : 'Show Avatar'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'rgba(185, 28, 28, 0.9)',
          border: '1px solid rgba(185, 28, 28, 0.7)',
          borderRadius: '8px',
          color: 'rgb(254, 202, 202)'
        }}>
          {error}
        </div>
      )}

      {/* Video Container */}
      <div style={{
        position: 'relative',
        backgroundColor: 'black',
        borderRadius: '8px',
        overflow: 'hidden',
        height: '300px'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            imageRendering: 'pixelated',
            zIndex: 10
          }}
        />
        
        {/* Overlay when inactive */}
        {!isActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(55, 65, 81, 0.75)'
          }}>
            <div style={{
              textAlign: 'center',
              color: 'white',
              fontSize: '14px'
            }}>
              Click Start to begin motion detection
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotionInputPanel;
